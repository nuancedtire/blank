import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { authComponent } from "../auth";
import { findUserProfile } from "../userProfile";

async function requireCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) throw new Error("Not authenticated");
  const profile = await findUserProfile(ctx, authUser);
  if (!profile) throw new Error("User profile not found");
  if (profile.isBanned) throw new Error("Account is banned");
  return profile;
}

async function requireSessionOwner(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"interpreterSessions">,
  userId: Id<"users">,
): Promise<Doc<"interpreterSessions">> {
  const session = await ctx.db.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.userId !== userId) throw new Error("Access denied");
  return session;
}

export const createSession = mutation({
  args: {
    patientLanguage: v.string(),
    patientLanguageName: v.string(),
    scenarioTemplate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const sessionId = await ctx.db.insert("interpreterSessions", {
      userId: user._id,
      patientLanguage: args.patientLanguage,
      patientLanguageName: args.patientLanguageName,
      scenarioTemplate: args.scenarioTemplate,
      status: "active",
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "interpreter_session.created",
      resourceType: "interpreter_session",
      resourceId: sessionId,
      details: `Started interpreter session for language: ${args.patientLanguageName} (${args.patientLanguage})`,
      timestamp: Date.now(),
    });

    return { sessionId };
  },
});

export const completeSession = mutation({
  args: {
    sessionId: v.id("interpreterSessions"),
    transcriptTurns: v.optional(
      v.array(
        v.object({
          speaker: v.union(v.literal("clinician"), v.literal("patient")),
          englishText: v.string(),
          timestamp: v.number(),
        }),
      ),
    ),
    durationSeconds: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const session = await requireSessionOwner(ctx, args.sessionId, user._id);

    if (session.status !== "active") {
      throw new Error(`Cannot complete a session with status: ${session.status}`);
    }

    const completedAt = Date.now();

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      completedAt,
      durationSeconds: args.durationSeconds,
      transcriptTurns: args.transcriptTurns,
    });

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "interpreter_session.completed",
      resourceType: "interpreter_session",
      resourceId: args.sessionId,
      details: `Completed interpreter session — duration: ${args.durationSeconds}s, turns: ${args.transcriptTurns?.length ?? 0}`,
      timestamp: completedAt,
    });

    return { sessionId: args.sessionId };
  },
});

export const abandonSession = mutation({
  args: {
    sessionId: v.id("interpreterSessions"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const session = await requireSessionOwner(ctx, args.sessionId, user._id);

    if (session.status !== "active") {
      throw new Error(`Cannot abandon a session with status: ${session.status}`);
    }

    const completedAt = Date.now();

    await ctx.db.patch(args.sessionId, {
      status: "abandoned",
      completedAt,
    });

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "interpreter_session.abandoned",
      resourceType: "interpreter_session",
      resourceId: args.sessionId,
      details: `Abandoned interpreter session for language: ${session.patientLanguageName}`,
      timestamp: completedAt,
    });

    return { sessionId: args.sessionId };
  },
});

export const getSession = query({
  args: {
    sessionId: v.id("interpreterSessions"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const session = await requireSessionOwner(ctx, args.sessionId, user._id);
    return session;
  },
});

export const listMySessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const limit = Math.max(1, Math.min(args.limit ?? 50, 50));

    return await ctx.db
      .query("interpreterSessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});
