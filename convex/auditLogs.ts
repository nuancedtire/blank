import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create an audit log entry
 */
export const log = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    resourceType: v.union(
      v.literal("guideline"),
      v.literal("asset"),
      v.literal("user"),
      v.literal("chatThread"),
      v.literal("chatMessage")
    ),
    resourceId: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify the user exists
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const logId = await ctx.db.insert("auditLogs", {
      userId: args.userId,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      details: args.details,
      timestamp: Date.now(),
    });

    return { logId };
  },
});

/**
 * Get audit logs for a specific resource
 */
export const getByResource = query({
  args: {
    resourceType: v.union(
      v.literal("guideline"),
      v.literal("asset"),
      v.literal("user"),
      v.literal("chatThread"),
      v.literal("chatMessage")
    ),
    resourceId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_resourceType_resourceId", (q) =>
        q.eq("resourceType", args.resourceType).eq("resourceId", args.resourceId)
      )
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Get audit logs for a specific user
 */
export const getByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Get recent audit logs
 */
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return logs;
  },
});

/**
 * Get audit logs by action type
 */
export const getByAction = query({
  args: {
    action: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_action", (q) => q.eq("action", args.action))
      .order("desc")
      .take(limit);

    return logs;
  },
});
