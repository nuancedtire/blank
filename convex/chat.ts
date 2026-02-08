import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get threads for current user
export const getThreads = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("chatThreads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);
  },
});

// Get messages in a thread
export const getMessages = query({
  args: { threadId: v.id("chatThreads") },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();
  },
});

// Create a new chat thread
export const createThread = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title }) => {
    return await ctx.db.insert("chatThreads", {
      userId,
      title,
      lastMessageAt: Date.now(),
      messageCount: 0,
    });
  },
});

// Add a message to a thread
export const addMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    citedGuidelines: v.optional(v.array(v.id("guidelines"))),
    wasRefusal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("Thread not found");

    const messageId = await ctx.db.insert("chatMessages", {
      threadId: args.threadId,
      role: args.role,
      content: args.content,
      citedGuidelines: args.citedGuidelines,
      wasRefusal: args.wasRefusal,
      createdAt: Date.now(),
    });

    // Update thread metadata
    await ctx.db.patch(args.threadId, {
      lastMessageAt: Date.now(),
      messageCount: thread.messageCount + 1,
      // Auto-title from first user message
      title:
        thread.title ??
        (args.role === "user"
          ? args.content.slice(0, 60) + (args.content.length > 60 ? "..." : "")
          : undefined),
    });

    return messageId;
  },
});
