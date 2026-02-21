import { v } from "convex/values";
import { internalAction, mutation, query, type MutationCtx } from "./_generated/server";
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
  v.literal("local"),
  v.literal("web"),
);

function searchScopeInstruction(scope?: string): string {
  switch (scope) {
    case "local":
      return "Search scope preference: local documents only. Do not use external web tools unless explicitly asked.";
    case "web":
      return "Search scope preference: external web only using SearXNG with this filter: site:nice.org.uk OR site:rcem.ac.uk.";
    default:
      return "Search scope preference: local documents first, then external web if needed.";
  }
}

async function savePromptAndSchedule(
  ctx: MutationCtx,
  {
    threadId,
    prompt,
    searchScope,
  }: {
    threadId: string;
    prompt: string;
    searchScope?: "local" | "web";
  },
) {
  const enrichedPrompt = `${searchScopeInstruction(searchScope)}\n\nUser question: ${prompt}`;
  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId,
    prompt: enrichedPrompt,
  });
  await ctx.scheduler.runAfter(0, internal.agentActions.generateResponseAsync, {
    threadId,
    promptMessageId: messageId,
  });
  return { messageId };
}

// Create a new thread and send first message in one roundtrip
export const startThreadAndSendMessage = mutation({
  args: {
    prompt: v.string(),
    searchScope: v.optional(searchScopeValidator),
  },
  handler: async (ctx, { prompt, searchScope }) => {
    const threadId = await createThread(ctx, components.agent);
    const { messageId } = await savePromptAndSchedule(ctx, {
      threadId,
      prompt,
      searchScope,
    });
    return { threadId, messageId };
  },
});

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
    const { messageId } = await savePromptAndSchedule(ctx, {
      threadId,
      prompt,
      searchScope,
    });
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
      {
        saveStreamDeltas: {
          chunking: "word",
          throttleMs: 100,
        },
      },
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
      includeStatuses: ["streaming", "finished", "aborted"],
    });
    return { ...paginated, streams };
  },
});
