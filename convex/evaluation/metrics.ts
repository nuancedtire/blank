import { v } from "convex/values";
import { query, type QueryCtx, type MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { authComponent } from "../auth";
import { findUserProfile } from "../userProfile";

async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) throw new Error("Not authenticated");
  const profile = await findUserProfile(ctx, authUser);
  if (!profile) throw new Error("User profile not found");
  if (profile.role !== "admin") throw new Error("Admin access required");
  return profile;
}

// ---------------------------------------------------------------------------
// Interpreter metrics
// ---------------------------------------------------------------------------

export const getInterpreterMetrics = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const allSessions = await ctx.db
      .query("interpreterSessions")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    const filtered = allSessions.filter((s) => {
      if (args.dateFrom && s.createdAt < args.dateFrom) return false;
      if (args.dateTo && s.createdAt > args.dateTo) return false;
      return true;
    });

    const total = filtered.length;
    const completed = filtered.filter((s) => s.status === "completed").length;
    const abandoned = filtered.filter((s) => s.status === "abandoned").length;

    // Language distribution
    const languageCounts: Record<string, number> = {};
    for (const s of filtered) {
      const lang = s.patientLanguageName;
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
    const languageDistribution = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // Template usage
    const templateCounts: Record<string, number> = {};
    for (const s of filtered) {
      if (s.scenarioTemplate) {
        templateCounts[s.scenarioTemplate] =
          (templateCounts[s.scenarioTemplate] || 0) + 1;
      }
    }
    const templateDistribution = Object.entries(templateCounts)
      .map(([template, count]) => ({ template, count }))
      .sort((a, b) => b.count - a.count);

    // Duration stats
    const completedWithDuration = filtered.filter(
      (s) => s.status === "completed" && s.durationSeconds,
    );
    const meanDuration =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce(
            (sum, s) => sum + (s.durationSeconds ?? 0),
            0,
          ) / completedWithDuration.length
        : 0;

    // Unique clinicians
    const uniqueClinicians = new Set(filtered.map((s) => s.userId)).size;

    // Sessions per day (last 30 days)
    const sessionsPerDay: { date: string; count: number }[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dateStr = dayStart.toISOString().split("T")[0];
      const count = filtered.filter(
        (s) => s.createdAt >= dayStart.getTime() && s.createdAt < dayEnd.getTime(),
      ).length;
      sessionsPerDay.push({ date: dateStr, count });
    }

    return {
      totalSessions: total,
      completedSessions: completed,
      abandonedSessions: abandoned,
      completionRate: total > 0 ? completed / total : 0,
      abandonRate: total > 0 ? abandoned / total : 0,
      meanDurationSeconds: Math.round(meanDuration),
      uniqueClinicians,
      languageDistribution,
      templateDistribution,
      sessionsPerDay,
    };
  },
});

// ---------------------------------------------------------------------------
// Mental health metrics
// ---------------------------------------------------------------------------

export const getMentalHealthMetrics = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const allSessions = await ctx.db
      .query("mentalHealthSessions")
      .withIndex("by_status_createdAt")
      .order("desc")
      .collect();

    const filtered = allSessions.filter((s) => {
      if (args.dateFrom && s.createdAt < args.dateFrom) return false;
      if (args.dateTo && s.createdAt > args.dateTo) return false;
      return true;
    });

    const total = filtered.length;
    const consented = filtered.filter((s) => s.consentGiven).length;
    const completed = filtered.filter((s) => s.status === "completed").length;
    const escalated = filtered.filter((s) => s.status === "escalated").length;
    const abandoned = filtered.filter((s) => s.status === "abandoned").length;

    const consentRate = total > 0 ? consented / total : 0;
    const completionRate = consented > 0 ? completed / consented : 0;
    const escalationRate =
      completed + escalated > 0 ? escalated / (completed + escalated) : 0;

    // Risk level distribution
    const riskCounts: Record<string, number> = {};
    for (const s of filtered.filter(
      (s) => s.status === "completed" || s.status === "escalated",
    )) {
      riskCounts[s.currentRiskLevel] =
        (riskCounts[s.currentRiskLevel] || 0) + 1;
    }
    const riskDistribution = Object.entries(riskCounts)
      .map(([level, count]) => ({ level, count }))
      .sort(
        (a, b) =>
          ["none", "low", "moderate", "high", "critical"].indexOf(a.level) -
          ["none", "low", "moderate", "high", "critical"].indexOf(b.level),
      );

    // Language distribution
    const languageCounts: Record<string, number> = {};
    for (const s of filtered) {
      const lang = s.preferredLanguageName || "Not detected";
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
    const languageDistribution = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // Duration stats
    const completedWithTiming = filtered.filter(
      (s) =>
        (s.status === "completed" || s.status === "escalated") &&
        s.activatedAt &&
        s.completedAt,
    );
    const meanDuration =
      completedWithTiming.length > 0
        ? completedWithTiming.reduce(
            (sum, s) => sum + ((s.completedAt ?? 0) - (s.activatedAt ?? 0)),
            0,
          ) / completedWithTiming.length
        : 0;

    // Alert response time
    const alerts = await ctx.db
      .query("mentalHealthAlerts")
      .withIndex("by_status")
      .collect();

    const filteredAlerts = alerts.filter((a) => {
      if (args.dateFrom && a.createdAt < args.dateFrom) return false;
      if (args.dateTo && a.createdAt > args.dateTo) return false;
      return true;
    });

    const acknowledgedAlerts = filteredAlerts.filter((a) => a.acknowledgedAt);
    const meanAcknowledgeTime =
      acknowledgedAlerts.length > 0
        ? acknowledgedAlerts.reduce(
            (sum, a) => sum + ((a.acknowledgedAt ?? 0) - a.createdAt),
            0,
          ) / acknowledgedAlerts.length
        : 0;

    // PHQ-9 severity distribution
    const screenings = await ctx.db
      .query("mentalHealthScreenings")
      .collect();

    const phq9Completed = screenings.filter(
      (s) => s.instrument === "PHQ-9" && s.status === "completed",
    );
    const severityCounts: Record<string, number> = {};
    for (const s of phq9Completed) {
      const severity = s.phq9Severity || "unknown";
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    }
    const phq9SeverityDistribution = Object.entries(severityCounts)
      .map(([severity, count]) => ({ severity, count }))
      .sort(
        (a, b) =>
          ["none", "mild", "moderate", "moderately_severe", "severe", "unknown"].indexOf(
            a.severity,
          ) -
          ["none", "mild", "moderate", "moderately_severe", "severe", "unknown"].indexOf(
            b.severity,
          ),
      );

    // C-SSRS categories
    const cssrsCompleted = screenings.filter(
      (s) => s.instrument === "C-SSRS" && s.status === "completed",
    );
    const ideationCounts: Record<string, number> = {};
    for (const s of cssrsCompleted) {
      const cat = s.cssrsIdeationCategory || "unknown";
      ideationCounts[cat] = (ideationCounts[cat] || 0) + 1;
    }
    const cssrsIdeationDistribution = Object.entries(ideationCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Sessions per day
    const sessionsPerDay: { date: string; count: number }[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const dateStr = dayStart.toISOString().split("T")[0];
      const count = filtered.filter(
        (s) => s.createdAt >= dayStart.getTime() && s.createdAt < dayEnd.getTime(),
      ).length;
      sessionsPerDay.push({ date: dateStr, count });
    }

    return {
      totalSessions: total,
      consentedSessions: consented,
      completedSessions: completed,
      escalatedSessions: escalated,
      abandonedSessions: abandoned,
      consentRate,
      completionRate,
      escalationRate,
      meanDurationMs: Math.round(meanDuration),
      meanAcknowledgeTimeMs: Math.round(meanAcknowledgeTime),
      totalAlerts: filteredAlerts.length,
      riskDistribution,
      languageDistribution,
      phq9SeverityDistribution,
      cssrsIdeationDistribution,
      sessionsPerDay,
    };
  },
});

// ---------------------------------------------------------------------------
// Combined overview
// ---------------------------------------------------------------------------

export const getCombinedOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const interpreterSessions = await ctx.db
      .query("interpreterSessions")
      .collect();
    const mhSessions = await ctx.db.query("mentalHealthSessions").collect();
    const activeAlerts = await ctx.db
      .query("mentalHealthAlerts")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    return {
      interpreter: {
        total: interpreterSessions.length,
        active: interpreterSessions.filter((s) => s.status === "active").length,
        completed: interpreterSessions.filter((s) => s.status === "completed")
          .length,
      },
      mentalHealth: {
        total: mhSessions.length,
        active: mhSessions.filter(
          (s) =>
            s.status === "active" ||
            s.status === "created" ||
            s.status === "paused",
        ).length,
        completed: mhSessions.filter((s) => s.status === "completed").length,
        escalated: mhSessions.filter((s) => s.status === "escalated").length,
      },
      activeAlerts: activeAlerts.length,
    };
  },
});

// ---------------------------------------------------------------------------
// Audit export
// ---------------------------------------------------------------------------

export const listSessionsForAudit = query({
  args: {
    tool: v.union(v.literal("interpreter"), v.literal("mentalHealth")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = Math.min(args.limit ?? 50, 100);

    if (args.tool === "interpreter") {
      const sessions = await ctx.db
        .query("interpreterSessions")
        .withIndex("by_createdAt")
        .order("desc")
        .take(limit + (args.offset ?? 0));

      return sessions.slice(args.offset ?? 0).map((s) => ({
        id: s._id,
        type: "interpreter" as const,
        status: s.status,
        language: s.patientLanguageName,
        template: s.scenarioTemplate,
        durationSeconds: s.durationSeconds,
        turnCount: s.transcriptTurns?.length ?? 0,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      }));
    }

    const sessions = await ctx.db
      .query("mentalHealthSessions")
      .withIndex("by_status_createdAt")
      .order("desc")
      .take(limit + (args.offset ?? 0));

    return sessions.slice(args.offset ?? 0).map((s) => ({
      id: s._id,
      type: "mentalHealth" as const,
      status: s.status,
      bedsideId: s.bedsideId,
      language: s.preferredLanguageName,
      riskLevel: s.currentRiskLevel,
      consentGiven: s.consentGiven,
      createdAt: s.createdAt,
      completedAt: s.completedAt,
    }));
  },
});
