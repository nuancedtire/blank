import { v } from "convex/values";
import { internalAction, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import {
  vStreamArgs,
  listUIMessages,
  syncStreams,
  createThread,
  saveMessage,
} from "@convex-dev/agent";
import { components } from "./_generated/api";
import guidelineAgent from "./guidelineAgent";

const searchScopeValidator = v.union(
  v.literal("all"),
  v.literal("local"),
  v.literal("external_all"),
  v.literal("external_nice"),
  v.literal("external_rcem"),
);

function searchScopeInstruction(scope?: string): string {
  switch (scope) {
    case "local":
      return "Search scope preference: local documents only. Do not use external web tools unless explicitly asked.";
    case "external_all":
      return "Search scope preference: external web only using SearXNG with this filter: site:nice.org.uk OR site:rcem.ac.uk. Prioritize these sources.";
    case "external_nice":
      return "Search scope preference: external web only using SearXNG with this filter: site:nice.org.uk.";
    case "external_rcem":
      return "Search scope preference: external web only using SearXNG with this filter: site:rcem.ac.uk.";
    default:
      return "Search scope preference: all sources. Start with local documents, then external web if needed.";
  }
}

// Create a new agent thread
export const createAgentThread = mutation({
  args: {},
  handler: async (ctx) => {
    const threadId = await createThread(ctx, components.agent);
    return { threadId };
  },
});

// Step 1: Save user message and schedule async generation
export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    searchScope: v.optional(searchScopeValidator),
  },
  handler: async (ctx, { threadId, prompt, searchScope }) => {
    const enrichedPrompt = `${searchScopeInstruction(searchScope)}\n\nUser question: ${prompt}`;
    // Save the user message transactionally
    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      prompt: enrichedPrompt,
    });
    // Schedule the async generation
    await ctx.scheduler.runAfter(
      0,
      internal.agentActions.generateResponseAsync,
      {
        threadId,
        promptMessageId: messageId,
      },
    );
    return { messageId };
  },
});

// Step 2: Generate response asynchronously with streaming deltas
export const generateResponseAsync = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  handler: async (ctx, { threadId, promptMessageId }) => {
    await guidelineAgent.streamText(
      ctx,
      { threadId },
      // @ts-expect-error - tool types from agent definition aren't perfectly inferred
      { promptMessageId },
      { saveStreamDeltas: true },
    );
  },
});

// List messages in a thread (with streaming support)
export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });
    return { ...paginated, streams };
  },
});
