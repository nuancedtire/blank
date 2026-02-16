import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { authComponent } from "./auth";

// Get the current user with their app-specific profile
export const me = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) return null;

    // Look up app user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    return user
      ? { ...user, authUser }
      : {
          // New user - return basic info from auth
          _id: null,
          email: authUser.email,
          name: authUser.name ?? authUser.email.split("@")[0],
          role: "user" as const,
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

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { lastActive: Date.now() });
      return existing._id;
    }

    // Create new user profile
    const id = await ctx.db.insert("users", {
      email: authUser.email,
      name: authUser.name ?? authUser.email.split("@")[0],
      role: "user",
      lastActive: Date.now(),
    });

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

// Pin/unpin a guideline
export const togglePin = mutation({
  args: {
    guidelineId: v.id("guidelines"),
  },
  handler: async (ctx, { guidelineId }) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .first();

    if (!user) {
      // Auto-create user profile if it doesn't exist yet
      const id = await ctx.db.insert("users", {
        email: authUser.email,
        name: authUser.name ?? authUser.email.split("@")[0],
        role: "user",
        lastActive: Date.now(),
      });
      user = (await ctx.db.get(id))!;
    }

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
