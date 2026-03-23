import { v } from "convex/values";
import {
  query,
  internalMutation,
  internalQuery,
  internalAction,
  type QueryCtx,
  type MutationCtx,
} from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { authComponent } from "../auth";
import { findUserProfile } from "../userProfile";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// ---------------------------------------------------------------------------
// Auth helper
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
// Internal queries — used by generateHandover via ctx.runQuery
// ---------------------------------------------------------------------------

export const getSessionForHandover = internalQuery({
  args: { sessionId: v.id("mentalHealthSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getScreeningsForHandover = internalQuery({
  args: { sessionId: v.id("mentalHealthSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mentalHealthScreenings")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Internal action — generates SBAR handover note via OpenAI
// ---------------------------------------------------------------------------

export const generateHandover = internalAction({
  args: {
    sessionId: v.id("mentalHealthSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(
      internal.mentalHealth.documents.getSessionForHandover,
      { sessionId: args.sessionId },
    );

    if (!session) return;

    const screenings = await ctx.runQuery(
      internal.mentalHealth.documents.getScreeningsForHandover,
      { sessionId: args.sessionId },
    );

    const phq9Screening = screenings.find(
      (s: { instrument: string }) => s.instrument === "PHQ-9",
    );
    const cssrsScreening = screenings.find(
      (s: { instrument: string }) => s.instrument === "C-SSRS",
    );

    const phq9Summary = phq9Screening
      ? [
          `PHQ-9 Total Score: ${phq9Screening.phq9TotalScore ?? "incomplete"}`,
          `Severity: ${phq9Screening.phq9Severity ?? "N/A"}`,
          `Status: ${phq9Screening.status}`,
          phq9Screening.phq9Responses && phq9Screening.phq9Responses.length > 0
            ? "Responses:\n" +
              phq9Screening.phq9Responses
                .map(
                  (r: { itemIndex: number; question: string; responseText: string; score: number }) =>
                    `  Q${r.itemIndex}: ${r.question}\n  Response: ${r.responseText} (Score: ${r.score})`,
                )
                .join("\n")
            : "No responses recorded",
        ].join("\n")
      : "PHQ-9: Not administered";

    const cssrsSummary = cssrsScreening
      ? [
          `C-SSRS Ideation Category: ${cssrsScreening.cssrsIdeationCategory ?? "N/A"}`,
          `High Risk: ${cssrsScreening.cssrsHighRisk ? "YES" : "No"}`,
          `Status: ${cssrsScreening.status}`,
          cssrsScreening.cssrsResponses &&
          cssrsScreening.cssrsResponses.length > 0
            ? "Responses:\n" +
              cssrsScreening.cssrsResponses
                .map(
                  (r: { questionKey: string; questionText: string; responseText: string; endorsed: boolean }) =>
                    `  ${r.questionKey}: ${r.questionText}\n  Response: ${r.responseText} (Endorsed: ${r.endorsed})`,
                )
                .join("\n")
            : "No responses recorded",
        ].join("\n")
      : "C-SSRS: Not administered";

    const sessionContext = [
      `Session ID: ${session._id}`,
      session.bedsideId ? `Bedside: ${session.bedsideId}` : null,
      `Language: ${session.preferredLanguageName ?? "English"} (${session.preferredLanguage ?? "en"})`,
      `Risk Level: ${session.currentRiskLevel}`,
      `Session Status: ${session.status}`,
      `Started: ${session.activatedAt ? new Date(session.activatedAt).toISOString() : "N/A"}`,
      `Completed: ${session.completedAt ? new Date(session.completedAt).toISOString() : "N/A"}`,
      session.escalationTriggeredAt
        ? `Escalation triggered at: ${new Date(session.escalationTriggeredAt).toISOString()}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = [
      "You are a clinical documentation assistant in an Emergency Department.",
      "Generate a concise SBAR (Situation, Background, Assessment, Recommendation) handover note for the mental health nursing team based on the following AI companion screening session data.",
      "",
      "Write in professional clinical language. Be factual and specific. Flag any high-risk indicators clearly.",
      "",
      "SESSION DATA:",
      sessionContext,
      "",
      "SCREENING RESULTS:",
      phq9Summary,
      "",
      cssrsSummary,
      "",
      "Generate the SBAR handover note now:",
    ].join("\n");

    let handoverText: string;
    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        prompt,
        maxOutputTokens: 800,
      });
      handoverText = result.text.trim();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      handoverText = [
        `[Handover generation failed: ${message}]`,
        "",
        "Raw screening data:",
        "",
        phq9Summary,
        "",
        cssrsSummary,
      ].join("\n");
    }

    await ctx.runMutation(internal.mentalHealth.documents.saveHandover, {
      sessionId: args.sessionId,
      text: handoverText,
    });
  },
});

// ---------------------------------------------------------------------------
// Internal mutation — persists handover text to the session
// ---------------------------------------------------------------------------

export const saveHandover = internalMutation({
  args: {
    sessionId: v.id("mentalHealthSessions"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      handoverDocumentText: args.text,
      handoverGeneratedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Clinician-facing query (auth required)
// ---------------------------------------------------------------------------

export const getHandoverDocument = query({
  args: {
    sessionId: v.id("mentalHealthSessions"),
  },
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    return {
      handoverDocumentText: session.handoverDocumentText ?? null,
      handoverGeneratedAt: session.handoverGeneratedAt ?? null,
    };
  },
});
