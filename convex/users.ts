import { v } from "convex/values";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import { authComponent } from "./auth";
import type { Doc } from "./_generated/dataModel";
import {
  deriveDisplayName,
  findUserProfile,
  normalizeEmail,
} from "./userProfile";

type UsersCtx = QueryCtx | MutationCtx;

async function linkAuthUserToProfile(
  ctx: MutationCtx,
  authUser: { _id?: string; userId?: string | null },
  profileId: string,
) {
  if (!authUser._id || authUser.userId === profileId) return;
  await authComponent.setUserId(ctx, authUser._id, profileId);
}

async function getCurrentProfile(ctx: UsersCtx): Promise<Doc<"users"> | null> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) return null;
  return await findUserProfile(ctx, authUser);
}

async function requireAdmin(ctx: UsersCtx): Promise<Doc<"users">> {
  const user = await getCurrentProfile(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

// Get the current user with their app-specific profile
export const me = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) return null;

    const user = await findUserProfile(ctx, authUser);

    return user
      ? { ...user, authUser }
        : {
            // The profile is created lazily on first authenticated mutation.
            _id: null,
            email: normalizeEmail(authUser.email),
            name: deriveDisplayName(authUser),
            role: "admin" as const,
            isBanned: false,
            authUser,
          };
  },
});

// Ensure user profile exists (called after first sign-in)
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    const normalizedEmail = normalizeEmail(authUser.email);
    const name = deriveDisplayName(authUser);
    const existing = await findUserProfile(ctx, authUser);

    if (existing) {
      if (existing.isBanned) {
        throw new Error("Account is banned");
      }
      await ctx.db.patch(existing._id, {
        email: normalizedEmail,
        name,
        lastActive: Date.now(),
      });
      await linkAuthUserToProfile(ctx, authUser, existing._id);
      return existing._id;
    }

    // Default every newly created app profile to admin for this private deployment.
    const id = await ctx.db.insert("users", {
      email: normalizedEmail,
      name,
      role: "admin",
      isBanned: false,
      lastActive: Date.now(),
    });
    await linkAuthUserToProfile(ctx, authUser, id);

    await ctx.db.insert("auditLogs", {
      userId: id,
      action: "user.created",
      resourceType: "user",
      resourceId: id,
      details: `New user registered: ${authUser.email}`,
      timestamp: Date.now(),
    });

    return id;
  },
});

// List all users (admin only)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("users").collect();
  },
});

// Update user role (admin only)
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, { userId, role }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId && role !== "admin") {
      throw new Error("You cannot remove your own admin role");
    }
    await ctx.db.patch(userId, { role });

    await ctx.db.insert("auditLogs", {
      action: "user.role_updated",
      resourceType: "user",
      resourceId: userId,
      details: `Role changed to: ${role}`,
      timestamp: Date.now(),
    });
  },
});

// Ban/unban user access
export const setBanStatus = mutation({
  args: {
    userId: v.id("users"),
    isBanned: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { userId, isBanned, reason }) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === userId && isBanned) {
      throw new Error("You cannot ban your own account");
    }

    await ctx.db.patch(userId, {
      isBanned,
      bannedAt: isBanned ? Date.now() : undefined,
      bannedReason: isBanned ? reason?.trim() || "No reason provided" : undefined,
      lastActive: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: isBanned ? "user.banned" : "user.unbanned",
      resourceType: "user",
      resourceId: userId,
      details: isBanned
        ? `Banned user${reason ? `: ${reason.trim()}` : ""}`
        : "Unbanned user",
      timestamp: Date.now(),
    });
  },
});

// Pin/unpin a guideline
export const togglePin = mutation({
  args: {
    guidelineId: v.id("guidelines"),
  },
  handler: async (ctx, { guidelineId }) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    let user = await findUserProfile(ctx, authUser);

    if (!user) {
      // Auto-create user profile if it doesn't exist yet
      const id = await ctx.db.insert("users", {
        email: normalizeEmail(authUser.email),
        name: deriveDisplayName(authUser),
        role: "admin",
        isBanned: false,
        lastActive: Date.now(),
      });
      await linkAuthUserToProfile(ctx, authUser, id);
      user = (await ctx.db.get(id))!;
    }
    if (user.isBanned) throw new Error("Account is banned");

    const pinned = user.pinnedGuidelines ?? [];
    const idx = pinned.indexOf(guidelineId);

    if (idx >= 0) {
      pinned.splice(idx, 1);
    } else {
      if (pinned.length >= 10) {
        throw new Error("Maximum 10 pinned guidelines");
      }
      pinned.push(guidelineId);
    }

    await ctx.db.patch(user._id, { pinnedGuidelines: pinned });
    return pinned;
  },
});
