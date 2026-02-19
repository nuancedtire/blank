import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get recent audit logs (admin only)
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit ?? 50);
  },
});

// Log a search query
export const logSearch = mutation({
  args: {
    userId: v.optional(v.id("users")),
    query: v.string(),
    resultCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      action: "search.performed",
      resourceType: "search",
      details: `Query: "${args.query}" (${args.resultCount} results)`,
      timestamp: Date.now(),
    });
  },
});

// Submit search feedback
export const submitFeedback = mutation({
  args: {
    query: v.string(),
    guidelineId: v.optional(v.id("guidelines")),
    wasHelpful: v.boolean(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      userId: args.userId,
      action: args.wasHelpful ? "search.feedback.positive" : "search.feedback.negative",
      resourceType: "search",
      resourceId: args.guidelineId,
      details: `Feedback on query "${args.query}": ${args.wasHelpful ? "helpful" : "not helpful"}`,
      timestamp: Date.now(),
    });
  },
});
