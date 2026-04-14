import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { authComponent } from "./auth";
import { findUserProfile } from "./userProfile";

type FeedbackCtx = QueryCtx | MutationCtx;

async function requireCurrentUser(ctx: FeedbackCtx): Promise<Doc<"users">> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    throw new Error("Not authenticated");
  }

  const profile = await findUserProfile(ctx, authUser);
  if (!profile) {
    throw new Error("User profile not found");
  }
  if (profile.isBanned) {
    throw new Error("Account is banned");
  }

  return profile;
}

async function assertThreadOwner(ctx: FeedbackCtx, threadId: string, userId: string) {
  const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId });
  if (!thread || thread.userId !== userId) {
    throw new Error("Thread not found or access denied");
  }
}

export const listMineForThread = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await assertThreadOwner(ctx, args.threadId, user._id);
    return await ctx.db
      .query("assistantFeedback")
      .withIndex("by_userId_and_threadId", (q) =>
        q.eq("userId", user._id).eq("threadId", args.threadId),
      )
      .collect();
  },
});

export const submit = mutation({
  args: {
    threadId: v.string(),
    assistantMessageId: v.string(),
    wasHelpful: v.boolean(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await assertThreadOwner(ctx, args.threadId, user._id);
    const now = Date.now();
    const normalizedComment = args.comment?.trim().slice(0, 2000) || undefined;

    const existing = await ctx.db
      .query("assistantFeedback")
      .withIndex("by_userId_and_assistantMessageId", (q) =>
        q.eq("userId", user._id).eq("assistantMessageId", args.assistantMessageId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        wasHelpful: args.wasHelpful,
        comment: normalizedComment,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("assistantFeedback", {
      userId: user._id,
      threadId: args.threadId,
      assistantMessageId: args.assistantMessageId,
      wasHelpful: args.wasHelpful,
      comment: normalizedComment,
      createdAt: now,
      updatedAt: now,
    });
  },
});
