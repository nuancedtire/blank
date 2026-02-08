import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import {
  vStreamArgs,
  listUIMessages,
  syncStreams,
  createThread,
} from "@convex-dev/agent";
import { components } from "./_generated/api";
import guidelineAgent from "./guidelineAgent";

// Create a new agent thread
export const createAgentThread = action({
  args: {},
  handler: async (ctx) => {
    const threadId = await createThread(ctx, components.agent);
    return { threadId };
  },
});

// Send a message to the agent and stream the response
export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, { threadId, prompt }): Promise<{ text: string }> => {
    const result = await guidelineAgent.streamText(
      ctx,
      { threadId },
      // @ts-expect-error - generated types need regeneration via `npx convex dev`
      { prompt },
      { saveStreamDeltas: true },
    );
    // Wait for the stream to complete
    await result.consumeStream();
    return {
      text: await result.text,
    };
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
