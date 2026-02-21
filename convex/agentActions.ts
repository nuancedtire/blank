import { v } from "convex/values";
import { generateObject } from "ai";
import { cerebras } from "@ai-sdk/cerebras";
import { z } from "zod";
import {
  internalAction,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal, components } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import {
  vStreamArgs,
  listUIMessages,
  syncStreams,
  createThread,
  saveMessage,
} from "@convex-dev/agent";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { findUserProfile } from "./userProfile";
import guidelineAgent from "./guidelineAgent";

const searchScopeValidator = v.union(v.literal("local"), v.literal("web"));

const memoryKindValidator = v.union(
  v.literal("search_topic"),
  v.literal("source_preference"),
  v.literal("guideline_interest"),
  v.literal("response_style"),
);

const threadMetaSchema = z.object({
  title: z.string(),
  summary: z.string(),
});

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

function messageContentToText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const candidate = part as { type?: string; text?: string };
      return candidate.type === "text" && typeof candidate.text === "string"
        ? candidate.text
        : "";
    })
    .join("\n")
    .trim();
}

function extractUserQuestionFromStoredPrompt(text: string): string {
  const marker = "User question:";
  const index = text.indexOf(marker);
  if (index === -1) return text.trim();
  return text.slice(index + marker.length).trim();
}

function looksAutoTitle(
  existingTitle: string | undefined,
  firstUserPrompt: string,
): boolean {
  if (!existingTitle) return true;
  const trimmed = existingTitle.trim().toLowerCase();
  if (!trimmed || trimmed === "untitled conversation") return true;
  const promptSnippet = firstUserPrompt.trim().slice(0, 80).toLowerCase();
  return trimmed === promptSnippet;
}

async function maybeGenerateThreadMetadata(
  ctx: Parameters<typeof generateResponseAsync.handler>[0],
  threadId: string,
) {
  const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId });
  if (!thread) return;

  const messagesPage = await ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
    threadId,
    order: "asc",
    excludeToolMessages: true,
    statuses: ["success"],
    paginationOpts: { cursor: null, numItems: 12 },
  });

  const userMessage = messagesPage.page.find((m) => m.message?.role === "user");
  const assistantMessage = messagesPage.page.find(
    (m) => m.message?.role === "assistant",
  );

  const rawUserText = userMessage ? messageContentToText(userMessage.message?.content) : "";
  const userText = extractUserQuestionFromStoredPrompt(rawUserText);
  const assistantText = assistantMessage
    ? messageContentToText(assistantMessage.message?.content)
    : "";
  if (!userText || !assistantText) return;

  const shouldPatchSummary = !thread.summary || !thread.summary.trim();
  const shouldPatchTitle = looksAutoTitle(thread.title, userText);
  if (!shouldPatchSummary && !shouldPatchTitle) return;

  try {
    const meta = await generateObject({
      model: cerebras.chat("gpt-oss-120b"),
      schema: threadMetaSchema,
      prompt: [
        "Create concise metadata for a clinical guideline support conversation.",
        "Return only a short title and one-sentence summary.",
        "Title: 3-7 words, sentence case, no punctuation at end.",
        "Summary: <= 140 characters, should describe the actual clinical question/outcome.",
        "",
        `User message: ${userText.slice(0, 900)}`,
        `Assistant response: ${assistantText.slice(0, 1400)}`,
      ].join("\n"),
    });

    const nextTitle = meta.object.title.trim().replace(/\.$/, "").slice(0, 80);
    const nextSummary = meta.object.summary.trim().slice(0, 160);
    if (!nextTitle && !nextSummary) return;

    const patch: {
      title?: string;
      summary?: string;
    } = {};
    if (shouldPatchTitle && nextTitle) patch.title = nextTitle;
    if (shouldPatchSummary && nextSummary) patch.summary = nextSummary;
    if (Object.keys(patch).length === 0) return;

    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch,
    });
  } catch {
    // Do not fail the chat response path if metadata generation fails.
  }
}

async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
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

async function assertThreadOwner(
  ctx: QueryCtx | MutationCtx,
  threadId: string,
  userId: Id<"users">,
) {
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  });
  if (!thread || !thread.userId || thread.userId !== userId) {
    throw new Error("Thread not found or access denied");
  }
  return thread;
}

function redactIfNeeded(text: string): { value: string; redacted: boolean } {
  let value = text.trim().replace(/\s+/g, " ").slice(0, 260);
  let redacted = false;

  const patterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // dates
    /\b(?:nhs|mrn|patient)\s*[:#]?\s*[a-z0-9-]{4,}\b/gi, // IDs
    /\b\d{9,}\b/g, // long numeric identifiers
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // full names
  ];

  for (const pattern of patterns) {
    if (pattern.test(value)) {
      redacted = true;
      value = value.replace(pattern, "[redacted]");
    }
  }
  return { value, redacted };
}

function scoreMemory(
  memory: Doc<"userMemories">,
  now: number,
  promptTokens: Set<string>,
): number {
  const daysSinceSeen = Math.max(0, (now - memory.lastSeenAt) / (24 * 60 * 60 * 1000));
  const recencyScore = Math.exp(-daysSinceSeen / 30);
  const freqScore = Math.min(1, memory.frequency / 12);

  const text = `${memory.key} ${memory.summary}`.toLowerCase();
  let overlap = 0;
  for (const token of promptTokens) {
    if (token.length > 2 && text.includes(token)) overlap += 1;
  }
  const relevanceBoost = Math.min(0.35, overlap * 0.07);

  return memory.strength * 0.55 + freqScore * 0.25 + recencyScore * 0.2 + relevanceBoost;
}

async function getRankedMemoriesForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  prompt: string,
  limit: number,
) {
  const candidates = await ctx.db
    .query("userMemories")
    .withIndex("by_user_lastSeen", (q) => q.eq("userId", userId))
    .order("desc")
    .take(60);

  const now = Date.now();
  const promptTokens = new Set(
    prompt
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );

  return candidates
    .map((memory) => ({
      ...memory,
      score: scoreMemory(memory, now, promptTokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 8)));
}

async function savePromptAndSchedule(
  ctx: MutationCtx,
  {
    threadId,
    prompt,
    searchScope,
    userId,
  }: {
    threadId: string;
    prompt: string;
    searchScope?: "local" | "web";
    userId: Id<"users">;
  },
) {
  const rankedMemories = await getRankedMemoriesForUser(ctx, userId, prompt, 8);
  const memoryBlock =
    rankedMemories.length > 0
      ? `\n\nRelevant long-term user preferences (de-identified):\n${rankedMemories
          .map((memory) => `- ${memory.kind}: ${memory.summary}`)
          .join("\n")}`
      : "";

  const enrichedPrompt = `${searchScopeInstruction(searchScope)}${memoryBlock}\n\nUser question: ${prompt}`;

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
    const user = await requireCurrentUser(ctx);
    const threadId = await createThread(ctx, components.agent, {
      userId: user._id,
      title: prompt.slice(0, 80),
    });
    const { messageId } = await savePromptAndSchedule(ctx, {
      threadId,
      prompt,
      searchScope,
      userId: user._id,
    });
    return { threadId, messageId };
  },
});

// Create a new agent thread tied to the authenticated user
export const createAgentThread = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const threadId = await createThread(ctx, components.agent, {
      userId: user._id,
    });
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
    const user = await requireCurrentUser(ctx);
    await assertThreadOwner(ctx, threadId, user._id);
    const { messageId } = await savePromptAndSchedule(ctx, {
      threadId,
      prompt,
      searchScope,
      userId: user._id,
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

    await maybeGenerateThreadMetadata(ctx, threadId);
  },
});

// List messages in a thread (with streaming support) with ownership checks
export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await assertThreadOwner(ctx, args.threadId, user._id);

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

// Recent thread history for authenticated user
export const listMyThreads = query({
  args: {
    limit: v.optional(v.number()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 20, 300));
    const includeArchived = args.includeArchived ?? false;
    const result = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: user._id,
      order: "desc",
      paginationOpts: { numItems: limit, cursor: null },
    });
    return includeArchived
      ? result.page
      : result.page.filter((thread) => thread.status === "active");
  },
});

// Rename thread title
export const renameThread = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await assertThreadOwner(ctx, args.threadId, user._id);
    return await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: { title: args.title.trim().slice(0, 120) || "Untitled conversation" },
    });
  },
});

// Delete thread from user-visible history (soft delete / archive)
export const deleteThread = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await assertThreadOwner(ctx, args.threadId, user._id);
    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: { status: "archived" },
    });
    return { deleted: true };
  },
});

// Restore archived thread
export const restoreThread = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await assertThreadOwner(ctx, args.threadId, user._id);
    return await ctx.runMutation(components.agent.threads.updateThread, {
      threadId: args.threadId,
      patch: { status: "active" },
    });
  },
});

// Internal helper for curated memory retrieval
export const getTopMemoriesForUser = internalQuery({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await getRankedMemoriesForUser(
      ctx,
      args.userId,
      args.prompt,
      args.limit ?? 8,
    );
  },
});

// Upsert curated memory from user behavior events
export const recordSearchMemory = mutation({
  args: {
    kind: memoryKindValidator,
    key: v.string(),
    summary: v.string(),
    weight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const normalizedKey = args.key.trim().toLowerCase().slice(0, 140);
    if (!normalizedKey) return null;

    const redactedSummary = redactIfNeeded(args.summary);
    const now = Date.now();
    const delta = Math.max(0.05, Math.min(0.6, args.weight ?? 0.12));

    const existing = await ctx.db
      .query("userMemories")
      .withIndex("by_user_kind_key", (q) =>
        q.eq("userId", user._id).eq("kind", args.kind).eq("key", normalizedKey),
      )
      .unique();

    if (existing) {
      const nextFrequency = existing.frequency + 1;
      const nextStrength = Math.min(1, existing.strength * 0.88 + delta);
      await ctx.db.patch(existing._id, {
        summary: redactedSummary.value,
        frequency: nextFrequency,
        strength: nextStrength,
        redacted: existing.redacted || redactedSummary.redacted,
        lastSeenAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("userMemories", {
      userId: user._id,
      kind: args.kind,
      key: normalizedKey,
      summary: redactedSummary.value,
      frequency: 1,
      strength: Math.min(1, delta),
      firstSeenAt: now,
      lastSeenAt: now,
      redacted: redactedSummary.redacted,
    });
  },
});

// User-facing memory preview
export const getMemoryPreview = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const user = await requireCurrentUser(ctx);
    const results = await ctx.db
      .query("userMemories")
      .withIndex("by_user_lastSeen", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(Math.max(1, Math.min(limit ?? 20, 50)));

    return results.map((memory) => ({
      _id: memory._id,
      kind: memory.kind,
      summary: memory.summary,
      frequency: memory.frequency,
      strength: memory.strength,
      lastSeenAt: memory.lastSeenAt,
      redacted: memory.redacted,
    }));
  },
});

// Clear curated memory without touching message history
export const clearMyMemory = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const allMemories = await ctx.db
      .query("userMemories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    await Promise.all(allMemories.map((memory) => ctx.db.delete(memory._id)));
    return { deleted: allMemories.length };
  },
});
