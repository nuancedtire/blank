import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { authComponent } from "../auth";
import { findUserProfile } from "../userProfile";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared helper — looks up a session by its token
// ---------------------------------------------------------------------------

export async function findSessionByToken(
  ctx: QueryCtx | MutationCtx,
  token: string,
): Promise<Doc<"mentalHealthSessions"> | null> {
  return await ctx.db
    .query("mentalHealthSessions")
    .withIndex("by_sessionToken", (q) => q.eq("sessionToken", token))
    .first();
}

// ---------------------------------------------------------------------------
// Clinician-facing (auth required)
// ---------------------------------------------------------------------------

export const createSession = mutation({
  args: {
    bedsideId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    // Generate a 32-char hex token (16 random bytes)
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const sessionToken = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const sessionId = await ctx.db.insert("mentalHealthSessions", {
      sessionToken,
      bedsideId: args.bedsideId,
      assignedByUserId: user._id,
      status: "created",
      consentGiven: false,
      currentRiskLevel: "none",
      createdAt: Date.now(),
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
    });

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "mh_session.created",
      resourceType: "mh_session",
      resourceId: sessionId,
      details: args.bedsideId
        ? `MH session created for bedside: ${args.bedsideId}`
        : "MH session created",
      timestamp: Date.now(),
    });

    return { sessionId, sessionToken };
  },
});

export const getSessionById = query({
  args: {
    sessionId: v.id("mentalHealthSessions"),
  },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx);
    return await ctx.db.get(args.sessionId);
  },
});

export const listActiveSessions = query({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);

    const sessions = await ctx.db
      .query("mentalHealthSessions")
      .withIndex("by_status_createdAt")
      .order("desc")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "created"),
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "paused"),
          q.eq(q.field("status"), "escalated"),
        ),
      )
      .collect();

    // Join with latest alert status for each session
    const sessionsWithAlerts = await Promise.all(
      sessions.map(async (session) => {
        const latestAlert = await ctx.db
          .query("mentalHealthAlerts")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .order("desc")
          .first();
        return {
          ...session,
          latestAlert: latestAlert
            ? {
                _id: latestAlert._id,
                alertType: latestAlert.alertType,
                riskLevel: latestAlert.riskLevel,
                status: latestAlert.status,
                createdAt: latestAlert.createdAt,
              }
            : null,
        };
      }),
    );

    return sessionsWithAlerts;
  },
});

export const acknowledgeEscalation = mutation({
  args: {
    sessionId: v.id("mentalHealthSessions"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(args.sessionId, {
      escalationAcknowledgedAt: Date.now(),
      escalationAcknowledgedByUserId: user._id,
    });

    await ctx.db.insert("auditLogs", {
      userId: user._id,
      action: "mh_session.escalation_acknowledged",
      resourceType: "mh_session",
      resourceId: args.sessionId,
      details: `Escalation acknowledged by user ${user._id}`,
      timestamp: Date.now(),
    });

    return { acknowledged: true };
  },
});

// ---------------------------------------------------------------------------
// Patient-facing (no auth — validated by sessionToken)
// ---------------------------------------------------------------------------

export const getSessionByToken = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await findSessionByToken(ctx, args.sessionToken);
    if (!session) return null;

    // Treat expired sessions as non-existent
    if (session.expiresAt < Date.now() && session.status !== "completed") {
      return null;
    }

    // Return only patient-safe fields — never expose clinician info
    return {
      _id: session._id,
      status: session.status,
      consentGiven: session.consentGiven,
      preferredLanguage: session.preferredLanguage,
      preferredLanguageName: session.preferredLanguageName,
      currentRiskLevel: session.currentRiskLevel,
    };
  },
});

export const recordConsent = mutation({
  args: {
    sessionToken: v.string(),
    consentGiven: v.boolean(),
  },
  handler: async (ctx, args) => {
    const session = await findSessionByToken(ctx, args.sessionToken);
    if (!session) throw new Error("Session not found");
    if (session.status === "completed" || session.status === "abandoned") {
      throw new Error("Session is already closed");
    }

    if (!args.consentGiven) {
      await ctx.db.patch(session._id, { status: "abandoned" });
    } else {
      await ctx.db.patch(session._id, {
        consentGiven: true,
        activatedAt: Date.now(),
        status: "active",
        lastActivityAt: Date.now(),
      });
    }

    return { ok: true };
  },
});

export const updateSessionLanguage = mutation({
  args: {
    sessionToken: v.string(),
    languageCode: v.string(),
    languageName: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await findSessionByToken(ctx, args.sessionToken);
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(session._id, {
      preferredLanguage: args.languageCode,
      preferredLanguageName: args.languageName,
      lastActivityAt: Date.now(),
    });

    return { ok: true };
  },
});

export const triggerEscalation = mutation({
  args: {
    sessionToken: v.string(),
    riskLevel: v.union(
      v.literal("moderate"),
      v.literal("high"),
      v.literal("critical"),
    ),
    escalationNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await findSessionByToken(ctx, args.sessionToken);
    if (!session) throw new Error("Session not found");
    if (session.status === "completed" || session.status === "abandoned") {
      throw new Error("Session is already closed");
    }

    // Idempotency: skip if already escalated with an active alert
    const existingAlert = await ctx.db
      .query("mentalHealthAlerts")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("alertType"), "escalation_triggered"),
          q.eq(q.field("status"), "active"),
        ),
      )
      .first();

    if (existingAlert) {
      // Update risk level if higher, but don't create duplicate alert
      await ctx.db.patch(session._id, {
        currentRiskLevel: args.riskLevel,
        lastActivityAt: Date.now(),
      });
      return { ok: true, deduplicated: true };
    }

    await ctx.db.patch(session._id, {
      status: "escalated",
      escalationTriggeredAt: Date.now(),
      currentRiskLevel: args.riskLevel,
      lastActivityAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.mentalHealth.alerts.createAlert,
      {
        sessionId: session._id,
        alertType: "escalation_triggered",
        riskLevel: args.riskLevel,
        escalationNote: args.escalationNote,
      },
    );

    return { ok: true };
  },
});

export const markSessionCompleted = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await findSessionByToken(ctx, args.sessionToken);
    if (!session) throw new Error("Session not found");
    if (session.status === "completed" || session.status === "abandoned") {
      return { ok: true, alreadyClosed: true };
    }

    await ctx.db.patch(session._id, {
      status: "completed",
      completedAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.mentalHealth.documents.generateHandover,
      { sessionId: session._id },
    );

    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

export const updateRiskLevel = internalMutation({
  args: {
    sessionId: v.id("mentalHealthSessions"),
    riskLevel: v.union(
      v.literal("none"),
      v.literal("low"),
      v.literal("moderate"),
      v.literal("high"),
      v.literal("critical"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      currentRiskLevel: args.riskLevel,
      lastActivityAt: Date.now(),
    });
  },
});

export const expireOldSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const expired = await ctx.db
      .query("mentalHealthSessions")
      .withIndex("by_expiresAt")
      .filter((q) =>
        q.and(
          q.lt(q.field("expiresAt"), now),
          q.or(
            q.eq(q.field("status"), "created"),
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "paused"),
          ),
        ),
      )
      .collect();

    await Promise.all(
      expired.map((session) =>
        ctx.db.patch(session._id, { status: "abandoned" }),
      ),
    );

    return { expired: expired.length };
  },
});

export const checkIdleSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const idleThreshold = Date.now() - 20 * 60 * 1000; // 20 minutes

    const idleSessions = await ctx.db
      .query("mentalHealthSessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) =>
        q.lt(q.field("lastActivityAt"), idleThreshold),
      )
      .collect();

    // Only create idle alerts for sessions that don't already have an active idle alert
    let alertedCount = 0;
    await Promise.all(
      idleSessions.map(async (session) => {
        const existingIdleAlert = await ctx.db
          .query("mentalHealthAlerts")
          .withIndex("by_session", (q) => q.eq("sessionId", session._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("alertType"), "session_idle"),
              q.eq(q.field("status"), "active"),
            ),
          )
          .first();

        if (!existingIdleAlert) {
          await ctx.scheduler.runAfter(0, internal.mentalHealth.alerts.createAlert, {
            sessionId: session._id,
            alertType: "session_idle",
            riskLevel: "moderate",
          });
          alertedCount++;
        }
      }),
    );

    return { idleCount: alertedCount };
  },
});

export const getSessionByTokenInternal = internalQuery({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    return await findSessionByToken(ctx, args.sessionToken);
  },
});
