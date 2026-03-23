import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { authComponent } from "../auth";
import { findUserProfile } from "../userProfile";
import { findSessionByToken } from "./sessions";

// ---------------------------------------------------------------------------
// Auth helper (clinician queries)
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
// PHQ-9 score → severity mapping
// ---------------------------------------------------------------------------

type Phq9Severity =
  | "none"
  | "mild"
  | "moderate"
  | "moderately_severe"
  | "severe";

function phq9Severity(score: number): Phq9Severity {
  if (score <= 4) return "none";
  if (score <= 9) return "mild";
  if (score <= 14) return "moderate";
  if (score <= 19) return "moderately_severe";
  return "severe";
}

// ---------------------------------------------------------------------------
// Patient-facing mutations (validated by sessionToken)
// ---------------------------------------------------------------------------

export const recordScreeningResponse = mutation({
  args: {
    sessionToken: v.string(),
    instrument: v.union(v.literal("PHQ-9"), v.literal("C-SSRS")),
    itemData: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await findSessionByToken(ctx, args.sessionToken);
    if (!session) throw new Error("Session not found");
    if (session.expiresAt < Date.now()) throw new Error("Session has expired");
    if (session.status === "completed" || session.status === "abandoned") {
      throw new Error("Session is already closed");
    }
    if (!session.consentGiven) {
      throw new Error("Cannot record screening data without patient consent");
    }

    // Update session activity timestamp
    await ctx.db.patch(session._id, { lastActivityAt: Date.now() });

    // Find or create screening record for this session + instrument
    const existing = await ctx.db
      .query("mentalHealthScreenings")
      .withIndex("by_session_instrument", (q) =>
        q.eq("sessionId", session._id).eq("instrument", args.instrument),
      )
      .first();

    const now = Date.now();

    if (args.instrument === "PHQ-9") {
      const item = args.itemData as {
        itemIndex: number;
        question: string;
        responseText: string;
        score: number;
      };

      // Validate PHQ-9 score range (0=Not at all, 1=Several days, 2=More than half, 3=Nearly every day)
      if (!Number.isInteger(item.score) || item.score < 0 || item.score > 3) {
        throw new Error("PHQ-9 item score must be an integer between 0 and 3");
      }

      const existingResponses = existing?.phq9Responses ?? [];

      // Upsert response for this item index
      const updatedResponses = [
        ...existingResponses.filter((r) => r.itemIndex !== item.itemIndex),
        {
          itemIndex: item.itemIndex,
          question: item.question,
          responseText: item.responseText,
          score: item.score,
          scoredAt: now,
        },
      ].sort((a, b) => a.itemIndex - b.itemIndex);

      const runningTotal = updatedResponses.reduce(
        (sum, r) => sum + r.score,
        0,
      );

      if (existing) {
        await ctx.db.patch(existing._id, {
          phq9Responses: updatedResponses,
          phq9TotalScore: runningTotal,
        });
      } else {
        await ctx.db.insert("mentalHealthScreenings", {
          sessionId: session._id,
          instrument: "PHQ-9",
          status: "in_progress",
          phq9Responses: updatedResponses,
          phq9TotalScore: runningTotal,
          startedAt: now,
        });
      }

      // PHQ-9 item 9 is the suicidality question — any score > 0 triggers alert
      if (item.itemIndex === 9 && item.score > 0) {
        await ctx.scheduler.runAfter(
          0,
          internal.mentalHealth.alerts.createAlert,
          {
            sessionId: session._id,
            alertType: "high_phq9",
            riskLevel: "moderate",
            escalationNote: `PHQ-9 item 9 endorsed with score ${item.score}`,
          },
        );
      }

      // Derive risk level from running PHQ-9 total
      const severity = phq9Severity(runningTotal);
      let riskLevel: "none" | "low" | "moderate" | "high" | "critical" =
        "none";
      if (severity === "mild") riskLevel = "low";
      else if (severity === "moderate") riskLevel = "moderate";
      else if (severity === "moderately_severe") riskLevel = "high";
      else if (severity === "severe") riskLevel = "critical";

      await ctx.scheduler.runAfter(
        0,
        internal.mentalHealth.sessions.updateRiskLevel,
        { sessionId: session._id, riskLevel },
      );
    } else {
      // C-SSRS
      const item = args.itemData as {
        questionKey: string;
        questionText: string;
        responseText: string;
        endorsed: boolean;
      };

      const existingResponses = existing?.cssrsResponses ?? [];

      const updatedResponses = [
        ...existingResponses.filter((r) => r.questionKey !== item.questionKey),
        {
          questionKey: item.questionKey,
          questionText: item.questionText,
          responseText: item.responseText,
          endorsed: item.endorsed,
          answeredAt: now,
        },
      ];

      // Derive ideation category from responses
      const endorsed = (key: string) =>
        updatedResponses.find((r) => r.questionKey === key)?.endorsed ?? false;

      let cssrsIdeationCategory:
        | "none"
        | "passive"
        | "active_no_plan"
        | "active_with_plan"
        | "active_with_intent" = "none";

      if (endorsed("q4")) cssrsIdeationCategory = "active_with_intent";
      else if (endorsed("q3")) cssrsIdeationCategory = "active_with_plan";
      else if (endorsed("q2")) cssrsIdeationCategory = "active_no_plan";
      else if (endorsed("q1")) cssrsIdeationCategory = "passive";

      const cssrsHighRisk = cssrsIdeationCategory === "active_with_intent";

      if (existing) {
        await ctx.db.patch(existing._id, {
          cssrsResponses: updatedResponses,
          cssrsIdeationCategory,
          cssrsHighRisk,
        });
      } else {
        await ctx.db.insert("mentalHealthScreenings", {
          sessionId: session._id,
          instrument: "C-SSRS",
          status: "in_progress",
          cssrsResponses: updatedResponses,
          cssrsIdeationCategory,
          cssrsHighRisk,
          startedAt: now,
        });
      }

      // C-SSRS high risk alert
      if (cssrsHighRisk) {
        await ctx.scheduler.runAfter(
          0,
          internal.mentalHealth.alerts.createAlert,
          {
            sessionId: session._id,
            alertType: "cssrs_high_risk",
            riskLevel: "critical",
          },
        );
        await ctx.scheduler.runAfter(
          0,
          internal.mentalHealth.sessions.updateRiskLevel,
          { sessionId: session._id, riskLevel: "critical" },
        );
      }
    }

    return { ok: true };
  },
});

export const completeScreening = mutation({
  args: {
    sessionToken: v.string(),
    instrument: v.union(v.literal("PHQ-9"), v.literal("C-SSRS")),
    totalScore: v.optional(v.number()),
    severity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await findSessionByToken(ctx, args.sessionToken);
    if (!session) throw new Error("Session not found");
    if (session.expiresAt < Date.now()) throw new Error("Session has expired");
    if (!session.consentGiven) {
      throw new Error("Cannot complete screening without patient consent");
    }

    const screening = await ctx.db
      .query("mentalHealthScreenings")
      .withIndex("by_session_instrument", (q) =>
        q.eq("sessionId", session._id).eq("instrument", args.instrument),
      )
      .first();

    if (!screening) throw new Error("Screening not found");

    const now = Date.now();
    const patch: Partial<{
      status: "completed";
      completedAt: number;
      phq9TotalScore: number;
      phq9Severity:
        | "none"
        | "mild"
        | "moderate"
        | "moderately_severe"
        | "severe";
    }> = {
      status: "completed",
      completedAt: now,
    };

    if (args.instrument === "PHQ-9" && args.totalScore !== undefined) {
      patch.phq9TotalScore = args.totalScore;
      patch.phq9Severity = phq9Severity(args.totalScore);

      // Update session risk level based on final PHQ-9 score
      let riskLevel: "none" | "low" | "moderate" | "high" | "critical" =
        "none";
      const sev = phq9Severity(args.totalScore);
      if (sev === "mild") riskLevel = "low";
      else if (sev === "moderate") riskLevel = "moderate";
      else if (sev === "moderately_severe") riskLevel = "high";
      else if (sev === "severe") riskLevel = "critical";

      await ctx.scheduler.runAfter(
        0,
        internal.mentalHealth.sessions.updateRiskLevel,
        { sessionId: session._id, riskLevel },
      );
    }

    await ctx.db.patch(screening._id, patch);
    await ctx.db.patch(session._id, { lastActivityAt: now });

    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Clinician-facing query (auth required)
// ---------------------------------------------------------------------------

export const getScreeningsForSession = query({
  args: {
    sessionId: v.id("mentalHealthSessions"),
  },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx);

    return await ctx.db
      .query("mentalHealthScreenings")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});
