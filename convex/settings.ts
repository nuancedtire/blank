import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { authComponent } from "./auth";
import { findUserProfile } from "./userProfile";

// Helper to get the current authenticated user profile
async function getCurrentUser(ctx: any) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) return null;

  return await findUserProfile(ctx, authUser);
}

/**
 * Get current user profile and preferences
 * Note: Linked accounts and sessions are fetched client-side via Better Auth client API
 */
export const getAccountInfo = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.safeGetAuthUser(ctx);
    if (!authUser) return null;

    const user = await findUserProfile(ctx, authUser);
    if (!user) return null;

    return {
      profile: user,
      auth: {
        id: (authUser as any).id || (authUser as any)._id,
        email: authUser.email,
        name: authUser.name,
        emailVerified: authUser.emailVerified,
        image: authUser.image,
        createdAt: authUser.createdAt,
      },
      // Linked accounts and sessions are fetched client-side
      // via authClient.useListAccounts() and authClient.useListSessions()
      notificationPreferences: user.preferences?.notificationPreferences ?? {
        emailNotifications: true,
        pushNotifications: false,
        newGuidelineAlerts: true,
        systemAnnouncements: true,
      },
    };
  },
});

/**
 * Update user's notification preferences
 */
export const updateNotificationPreferences = mutation({
  args: {
    preferences: v.object({
      emailNotifications: v.boolean(),
      pushNotifications: v.boolean(),
      newGuidelineAlerts: v.boolean(),
      systemAnnouncements: v.boolean(),
    }),
  },
  handler: async (ctx, { preferences }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.patch(user._id, {
      preferences: {
        ...user.preferences,
        notificationPreferences: preferences,
      },
    });

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "user.notification_preferences_updated",
      resourceType: "user",
      resourceId: user._id,
      details: `Updated notification preferences`,
      timestamp: Date.now(),
    });

    return preferences;
  },
});

/**
 * Update user's profile (name)
 * Note: Also updates Better Auth user via client-side API
 */
export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.patch(user._id, { name });

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "user.profile_updated",
      resourceType: "user",
      resourceId: user._id,
      details: `Updated profile name to: ${name}`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Log when a session is revoked
 */
export const logSessionRevoked = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "user.session_revoked",
      resourceType: "auth",
      resourceId: sessionId,
      details: `Revoked session: ${sessionId.slice(0, 8)}...`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Log when all other sessions are revoked
 */
export const logAllSessionsRevoked = mutation({
  args: {
    count: v.number(),
  },
  handler: async (ctx, { count }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "user.sessions_revoked_all",
      resourceType: "auth",
      details: `Revoked ${count} other sessions`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Log when a social account is linked
 */
export const logAccountLinked = mutation({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, { provider }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "user.account_linked",
      resourceType: "auth",
      details: `Linked ${provider} account`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Log when a social account is unlinked
 */
export const logAccountUnlinked = mutation({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, { provider }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "user.account_unlinked",
      resourceType: "auth",
      details: `Unlinked ${provider} account`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Log password change
 */
export const logPasswordChanged = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "user.password_changed",
      resourceType: "auth",
      details: `Password was changed`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
