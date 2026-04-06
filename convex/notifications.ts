import { v } from "convex/values";
import { query, mutation, MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { findUserProfile } from "./userProfile";

// Helper to get the current authenticated user profile
async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) return null;

  const user = await findUserProfile(ctx, authUser);
  if (!user || user.isBanned) return null;
  return user;
}

// Helper to check if user is admin
async function checkAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return user;
}

/**
 * USER FUNCTIONS
 */

// 1. List user's notifications
export const list = query({
  args: {
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const now = Date.now();

    // Fetch all notifications and filter in memory for efficiency/simplicity
    // In a larger app, we might want more complex indexing
    const allNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    let filtered = allNotifications.filter((n) => {
      // Filter out expired
      if (n.expiresAt && n.expiresAt < now) return false;

      // Filter by broadcast OR targetUserIds
      const isTargeted = n.isBroadcast || n.targetUserIds?.includes(user._id);
      if (!isTargeted) return false;

      // Filter out if dismissed by user
      if (n.dismissedBy.includes(user._id)) return false;

      // Filter unread only if requested
      if (args.unreadOnly && n.readBy.includes(user._id)) return false;

      return true;
    });

    if (args.limit) {
      filtered = filtered.slice(0, args.limit);
    }

    return filtered.map((n) => ({
      ...n,
      isRead: n.readBy.includes(user._id),
    }));
  },
});

// 2. Get count of unread notifications for current user
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;

    const now = Date.now();
    const allNotifications = await ctx.db.query("notifications").collect();

    return allNotifications.filter((n) => {
      if (n.expiresAt && n.expiresAt < now) return false;
      const isTargeted = n.isBroadcast || n.targetUserIds?.includes(user._id);
      if (!isTargeted) return false;
      if (n.dismissedBy.includes(user._id)) return false;
      return !n.readBy.includes(user._id);
    }).length;
  },
});

// 3. Mark a notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const notification = await ctx.db.get(notificationId);
    if (!notification) throw new Error("Notification not found");

    if (!notification.readBy.includes(user._id)) {
      await ctx.db.patch(notificationId, {
        readBy: [...notification.readBy, user._id],
      });
    }
  },
});

// 4. Mark all user's notifications as read
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const now = Date.now();
    const notifications = await ctx.db.query("notifications").collect();

    for (const n of notifications) {
      const isTargeted = n.isBroadcast || n.targetUserIds?.includes(user._id);
      const isExpired = n.expiresAt && n.expiresAt < now;
      const isRead = n.readBy.includes(user._id);
      const isDismissed = n.dismissedBy.includes(user._id);

      if (isTargeted && !isExpired && !isRead && !isDismissed) {
        await ctx.db.patch(n._id, {
          readBy: [...n.readBy, user._id],
        });
      }
    }
  },
});

// 5. Dismiss a notification
export const dismiss = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const notification = await ctx.db.get(notificationId);
    if (!notification) throw new Error("Notification not found");

    if (!notification.dismissedBy.includes(user._id)) {
      await ctx.db.patch(notificationId, {
        dismissedBy: [...notification.dismissedBy, user._id],
      });
    }
  },
});

/**
 * ADMIN FUNCTIONS
 */

// 6. Create a notification
export const create = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("success"),
      v.literal("alert"),
    ),
    isBroadcast: v.boolean(),
    targetUserIds: v.optional(v.array(v.id("users"))),
    link: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await checkAdmin(ctx);

    const notificationId = await ctx.db.insert("notifications", {
      ...args,
      readBy: [],
      dismissedBy: [],
      createdBy: admin._id,
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      userId: admin._id,
      action: "notification.created",
      resourceType: "notification",
      resourceId: notificationId,
      details: `Created ${args.isBroadcast ? "broadcast" : "targeted"} notification: ${args.title}`,
      timestamp: Date.now(),
    });

    return notificationId;
  },
});

// 7. List all notifications for admin
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    // BOLT OPTIMIZATION: Resolve N+1 query bottleneck by batch-fetching creators.
    // Instead of db.get() in a loop, we collect unique IDs and fetch them all at once.
    const uniqueCreatorIds = Array.from(new Set(notifications.map((n) => n.createdBy)));
    const creators = await Promise.all(
      uniqueCreatorIds.map((id) => ctx.db.get(id))
    );

    // Map creator profiles by ID for O(1) lookup during result mapping
    const creatorLookup = new Map(
      creators
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => [c._id, c])
    );

    return notifications.map((n) => {
      const creator = creatorLookup.get(n.createdBy);
      return {
        ...n,
        creatorName: creator?.name ?? "Unknown",
        creatorEmail: creator?.email ?? "Unknown",
        readCount: n.readBy.length,
      };
    });
  },
});

// 8. Update a notification
export const update = mutation({
  args: {
    notificationId: v.id("notifications"),
    title: v.optional(v.string()),
    message: v.optional(v.string()),
    type: v.optional(
      v.union(
        v.literal("info"),
        v.literal("warning"),
        v.literal("success"),
        v.literal("alert"),
      ),
    ),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, { notificationId, ...updates }) => {
    const admin = await checkAdmin(ctx);

    const existing = await ctx.db.get(notificationId);
    if (!existing) throw new Error("Notification not found");

    await ctx.db.patch(notificationId, updates);

    await ctx.db.insert("auditLogs", {
      userId: admin._id,
      action: "notification.updated",
      resourceType: "notification",
      resourceId: notificationId,
      details: `Updated notification: ${existing.title}`,
      timestamp: Date.now(),
    });
  },
});

// 9. Delete a notification
export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, { notificationId }) => {
    const admin = await checkAdmin(ctx);

    const existing = await ctx.db.get(notificationId);
    if (!existing) throw new Error("Notification not found");

    await ctx.db.delete(notificationId);

    await ctx.db.insert("auditLogs", {
      userId: admin._id,
      action: "notification.deleted",
      resourceType: "notification",
      resourceId: notificationId,
      details: `Deleted notification: ${existing.title}`,
      timestamp: Date.now(),
    });
  },
});
