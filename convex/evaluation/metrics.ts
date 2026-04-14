import { v } from "convex/values";
import { query, type QueryCtx, type MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { components } from "../_generated/api";
import { authComponent } from "../auth";
import { findUserProfile } from "../userProfile";
import rag from "../rag";
import { GUIDELINE_CATEGORIES } from "../guidelineCategories";

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

const ASSISTANT_CONFIDENCE_LEVELS = ["high", "moderate", "lower"] as const;

type ConfidenceLevel = (typeof ASSISTANT_CONFIDENCE_LEVELS)[number];

type AgentMessageRow = {
  _id: string;
  _creationTime: number;
  order: number;
  stepOrder: number;
  message?: {
    role?: string;
    content?: unknown;
  } | null;
  status: "pending" | "success" | "failed";
};

type AssistantThreadSnapshot = {
  _id: string;
  userId: string;
  title?: string;
  status: "active" | "archived";
  messages: AgentMessageRow[];
};

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

function startOfDay(timestamp: number) {
  const day = new Date(timestamp);
  day.setHours(0, 0, 0, 0);
  return day;
}

function toDayKey(timestamp: number) {
  return startOfDay(timestamp).toISOString().split("T")[0];
}

function startOfWeek(timestamp: number) {
  const date = startOfDay(timestamp);
  const day = date.getDay();
  const delta = (day + 6) % 7;
  date.setDate(date.getDate() - delta);
  return date;
}

function toWeekKey(timestamp: number) {
  return startOfWeek(timestamp).toISOString().split("T")[0];
}

function parseLocalGuidelineCitations(text: string) {
  const matches = text.matchAll(
    /📄\s*\*\*([^*]+)\*\*\s*[—-]+\s*Source:\s*local\s*[—-]+\s*File:\s*([^\n]+?)(?:\s*[—-]+\s*Slug:\s*([\w-]+))?\s*$/gmu,
  );

  const citations = new Map<string, { key: string; title: string; slug: string | null }>();
  for (const match of matches) {
    const title = match[1]?.trim() || "Untitled";
    const slug = match[3]?.trim() || null;
    const key = slug || title.toLowerCase();
    citations.set(key, { key, title, slug });
  }
  return Array.from(citations.values());
}

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function monthsSince(timestamp: number, now = Date.now()) {
  return Math.max(0, Math.floor((now - timestamp) / (1000 * 60 * 60 * 24 * 30.4375)));
}

function classifyCoverage(count: number) {
  if (count === 0) return "gap" as const;
  if (count <= 2) return "limited" as const;
  return "covered" as const;
}

function classifyFreshness(monthsOld: number) {
  if (monthsOld >= 24) return "overdue" as const;
  if (monthsOld >= 12) return "due" as const;
  return "current" as const;
}

function readToolConfidence(result: unknown): ConfidenceLevel | null {
  if (!result || typeof result !== "object") return null;
  const confidence = (result as { confidence?: { level?: string } }).confidence;
  if (!confidence?.level) return null;
  if (ASSISTANT_CONFIDENCE_LEVELS.includes(confidence.level as ConfidenceLevel)) {
    return confidence.level as ConfidenceLevel;
  }
  return null;
}

function unwrapToolResult(part: Record<string, unknown>) {
  if (part.result !== undefined) return part.result;
  const output = part.output;
  if (!output || typeof output !== "object") return undefined;
  const candidate = output as { type?: string; value?: unknown };
  if (candidate.type === "json" || candidate.type === "error-json") {
    return candidate.value;
  }
  return undefined;
}

function extractConfidenceSignals(content: unknown) {
  if (!Array.isArray(content)) return [] as Array<{ toolName: string; level: ConfidenceLevel }>;

  const signals: Array<{ toolName: string; level: ConfidenceLevel }> = [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const candidate = part as Record<string, unknown>;
    if (candidate.type !== "tool-result" || typeof candidate.toolName !== "string") {
      continue;
    }
    const level = readToolConfidence(unwrapToolResult(candidate));
    if (level) {
      signals.push({ toolName: candidate.toolName, level });
    }
  }
  return signals;
}

function selectConfidenceLevel(
  signals: Array<{ toolName: string; level: ConfidenceLevel }>,
): ConfidenceLevel {
  const rag = signals.find((signal) => signal.toolName === "ragSearch");
  if (rag) return rag.level;

  const keyword = signals.find((signal) => signal.toolName === "searchGuidelines");
  if (keyword) return keyword.level;

  const external = signals.find((signal) => signal.toolName === "searchExternalWeb");
  if (external) return external.level;

  return "lower";
}

function addCounts(
  buckets: Map<string, number>,
  key: string,
  amount = 1,
) {
  buckets.set(key, (buckets.get(key) ?? 0) + amount);
}

function buildDailySeries(counts: Map<string, number>, days: number, now: number) {
  return Array.from({ length: days }, (_, index) => {
    const timestamp = now - (days - 1 - index) * 86400000;
    const date = toDayKey(timestamp);
    return {
      date,
      count: counts.get(date) ?? 0,
    };
  });
}

function buildWeeklySeries(counts: Map<string, number>, weeks: number, now: number) {
  const result: Array<{ weekStart: string; count: number }> = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = toWeekKey(now - i * 7 * 86400000);
    if (!result.some((item) => item.weekStart === weekStart)) {
      result.push({
        weekStart,
        count: counts.get(weekStart) ?? 0,
      });
    }
  }
  return result;
}

async function getAssistantThreadSnapshots(
  ctx: QueryCtx,
): Promise<AssistantThreadSnapshot[]> {
  const users = await ctx.db.query("users").collect();

  const threadPages = await Promise.all(
    users.map((user) =>
      ctx.runQuery(components.agent.threads.listThreadsByUserId, {
        userId: user._id,
        order: "desc",
        paginationOpts: { cursor: null, numItems: 100 },
      }),
    ),
  );

  const threadOwners = threadPages.flatMap((page, index) =>
    page.page.map((thread) => ({
      thread,
      userId: users[index]._id,
    })),
  );

  const messagePages = await Promise.all(
    threadOwners.map(({ thread }) =>
      ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
        threadId: thread._id,
        order: "asc",
        excludeToolMessages: false,
        statuses: ["success"],
        paginationOpts: { cursor: null, numItems: 400 },
      }),
    ),
  );

  return threadOwners.map(({ thread, userId }, index) => ({
    _id: thread._id,
    userId,
    title: thread.title,
    status: thread.status,
    messages: messagePages[index].page.map((row) => ({
      _id: row._id,
      _creationTime: row._creationTime,
      order: row.order,
      stepOrder: row.stepOrder,
      status: row.status,
      message: row.message,
    })),
  }));
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
// Assistant metrics
// ---------------------------------------------------------------------------

export const getAssistantMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [threads, feedback] = await Promise.all([
      getAssistantThreadSnapshots(ctx),
      ctx.db.query("assistantFeedback").withIndex("by_createdAt").order("desc").collect(),
    ]);

    const userMessages = threads.flatMap((thread) =>
      thread.messages
        .filter((row) => row.message?.role === "user")
        .map((row) => ({
          userId: thread.userId,
          createdAt: row._creationTime,
        })),
    );

    const assistantResponses: Array<{
      createdAt: number;
      text: string;
      confidenceLevel: ConfidenceLevel;
    }> = [];

    for (const thread of threads) {
      let responseSignals: Array<{ toolName: string; level: ConfidenceLevel }> = [];

      for (const row of thread.messages) {
        const role = row.message?.role;
        if (role === "user") {
          responseSignals = [];
          continue;
        }

        responseSignals.push(...extractConfidenceSignals(row.message?.content));

        if (role === "assistant") {
          const text = messageContentToText(row.message?.content);
          if (!text) continue;

          assistantResponses.push({
            createdAt: row._creationTime,
            text,
            confidenceLevel: selectConfidenceLevel(responseSignals),
          });
          responseSignals = [];
        }
      }
    }

    const uniqueUsers = new Set(userMessages.map((message) => message.userId)).size;
    const now = Date.now();

    const queryDayCounts = new Map<string, number>();
    for (const message of userMessages) {
      addCounts(queryDayCounts, toDayKey(message.createdAt));
    }

    const queriesPerDay = buildDailySeries(queryDayCounts, 30, now);
    let runningQueryTotal = 0;
    const totalQueriesOverTime = queriesPerDay.map((point) => {
      runningQueryTotal += point.count;
      return {
        date: point.date,
        totalQueries: runningQueryTotal,
      };
    });

    const queryWeekCounts = new Map<string, number>();
    for (const message of userMessages) {
      addCounts(queryWeekCounts, toWeekKey(message.createdAt));
    }
    const queriesPerWeek = buildWeeklySeries(queryWeekCounts, 8, now);

    const guidelineCounts = new Map<string, { title: string; slug: string | null; count: number }>();
    for (const message of assistantResponses) {
      for (const citation of parseLocalGuidelineCitations(message.text)) {
        const existing = guidelineCounts.get(citation.key);
        if (existing) {
          existing.count += 1;
        } else {
          guidelineCounts.set(citation.key, {
            title: citation.title,
            slug: citation.slug,
            count: 1,
          });
        }
      }
    }
    const mostAccessedGuidelines = Array.from(guidelineCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const helpfulCount = feedback.filter((item) => item.wasHelpful).length;
    const notHelpfulCount = feedback.length - helpfulCount;
    const averageFeedbackRating = feedback.length > 0 ? helpfulCount / feedback.length : 0;

    const confidenceCounts = new Map<ConfidenceLevel, number>(
      ASSISTANT_CONFIDENCE_LEVELS.map((level) => [level, 0]),
    );
    for (const response of assistantResponses) {
      addCounts(confidenceCounts as Map<string, number>, response.confidenceLevel);
    }
    const confidenceDistribution = ASSISTANT_CONFIDENCE_LEVELS.map((level) => ({
      level,
      count: confidenceCounts.get(level) ?? 0,
    }));

    return {
      totalQueries: userMessages.length,
      totalResponses: assistantResponses.length,
      totalThreads: threads.length,
      uniqueUsers,
      averageFeedbackRating,
      feedbackCount: feedback.length,
      feedbackDistribution: {
        helpful: helpfulCount,
        notHelpful: notHelpfulCount,
      },
      totalQueriesOverTime,
      queriesPerDay,
      queriesPerWeek,
      mostAccessedGuidelines,
      confidenceDistribution,
    };
  },
});

export const getGuidelineAuditMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const now = Date.now();
    const [guidelines, uploadedDocuments, namespace] = await Promise.all([
      ctx.db.query("guidelines").collect(),
      ctx.db.query("uploadedDocuments").collect(),
      rag.getNamespace(ctx, { namespace: "guidelines" }),
    ]);

    const activeGuidelines = guidelines.filter((guideline) => guideline.status !== "archived");
    const publishedGuidelines = guidelines.filter((guideline) => guideline.status === "published");
    const allCategories = Array.from(
      new Set([...GUIDELINE_CATEGORIES, ...activeGuidelines.map((guideline) => guideline.category)]),
    );

    const activeCategoryCounts = new Map<string, number>();
    const publishedCategoryCounts = new Map<string, number>();
    for (const guideline of activeGuidelines) {
      addCounts(activeCategoryCounts, guideline.category);
    }
    for (const guideline of publishedGuidelines) {
      addCounts(publishedCategoryCounts, guideline.category);
    }

    const guidelinesByCategory = allCategories
      .map((category) => {
        const activeCount = activeCategoryCounts.get(category) ?? 0;
        const publishedCount = publishedCategoryCounts.get(category) ?? 0;
        return {
          category,
          activeCount,
          publishedCount,
          gapSeverity: classifyCoverage(publishedCount),
        };
      })
      .sort((a, b) => b.publishedCount - a.publishedCount || a.category.localeCompare(b.category));

    const freshness = publishedGuidelines
      .map((guideline) => {
        const monthsOld = monthsSince(guideline.lastUpdated, now);
        return {
          id: String(guideline._id),
          title: guideline.title,
          slug: guideline.slug,
          category: guideline.category,
          status: classifyFreshness(monthsOld),
          monthsOld,
          lastUpdated: guideline.lastUpdated,
        };
      })
      .sort((a, b) => b.monthsOld - a.monthsOld);

    const freshnessSummary = freshness.reduce(
      (summary, item) => {
        summary[item.status] += 1;
        return summary;
      },
      { current: 0, due: 0, overdue: 0 },
    );

    const guidelineById = new Map(guidelines.map((guideline) => [String(guideline._id), guideline]));
    const duplicateCandidates: Array<{
      key: string;
      type: "exact" | "version" | "potential" | "title";
      severity: "high" | "medium" | "low";
      titles: string[];
      reason: string;
    }> = [];
    const duplicateKeys = new Set<string>();

    const pushDuplicate = (
      type: "exact" | "version" | "potential" | "title",
      severity: "high" | "medium" | "low",
      titles: string[],
      reason: string,
    ) => {
      const key = `${type}:${titles.map((title) => normalizeTitle(title)).sort().join("|")}`;
      if (duplicateKeys.has(key)) return;
      duplicateKeys.add(key);
      duplicateCandidates.push({ key, type, severity, titles, reason });
    };

    const contentHashGroups = new Map<string, string[]>();
    for (const guideline of activeGuidelines) {
      if (!guideline.contentHash) continue;
      const group = contentHashGroups.get(guideline.contentHash) ?? [];
      group.push(guideline.title);
      contentHashGroups.set(guideline.contentHash, group);
    }
    for (const titles of contentHashGroups.values()) {
      if (titles.length > 1) {
        pushDuplicate("exact", "high", titles, "Shared content hash across active guidelines.");
      }
    }

    for (const guideline of activeGuidelines) {
      if (guideline.likelyVersionOf) {
        const related = guidelineById.get(String(guideline.likelyVersionOf));
        if (related) {
          pushDuplicate(
            "version",
            "medium",
            [guideline.title, related.title],
            "High-confidence semantic overlap suggests a versioned replacement.",
          );
        }
      }

      for (const candidateId of guideline.potentialDuplicateOf ?? []) {
        const related = guidelineById.get(String(candidateId));
        if (related) {
          pushDuplicate(
            "potential",
            "medium",
            [guideline.title, related.title],
            "Potential duplicate flagged from content similarity during ingestion.",
          );
        }
      }
    }

    const titleGroups = new Map<string, string[]>();
    for (const guideline of activeGuidelines) {
      const key = normalizeTitle(guideline.title);
      if (!key) continue;
      const group = titleGroups.get(key) ?? [];
      group.push(guideline.title);
      titleGroups.set(key, group);
    }
    for (const titles of titleGroups.values()) {
      if (titles.length > 1) {
        pushDuplicate("title", "low", titles, "Similar normalized titles detected.");
      }
    }

    duplicateCandidates.sort((a, b) => {
      const severityRank = { high: 0, medium: 1, low: 2 };
      return severityRank[a.severity] - severityRank[b.severity] || a.titles[0].localeCompare(b.titles[0]);
    });

    const uploadCounts = new Map<string, number>();
    for (const document of uploadedDocuments) {
      addCounts(uploadCounts, toWeekKey(document.uploadedAt));
    }
    const updateCounts = new Map<string, number>();
    for (const guideline of activeGuidelines) {
      addCounts(updateCounts, toWeekKey(guideline.lastUpdated));
    }
    const uploadActivity = buildWeeklySeries(uploadCounts, 12, now).map((week) => ({
      weekStart: week.weekStart,
      uploads: week.count,
      updates: updateCounts.get(week.weekStart) ?? 0,
    }));

    const documentStatusBreakdown = ["pending", "extracting", "queued", "indexing", "indexed", "error"].map(
      (status) => ({
        status,
        count: uploadedDocuments.filter((document) => document.status === status).length,
      }),
    );

    let totalRagEntries = 0;
    let totalRagChunks = 0;
    if (namespace) {
      const entries = await ctx.runQuery(components.rag.entries.list, {
        namespaceId: namespace.namespaceId,
        order: "desc",
        status: "ready",
        paginationOpts: { cursor: null, numItems: 5000 },
      });
      totalRagEntries = entries.page.length;

      const chunkPages = await Promise.all(
        entries.page.map((entry) =>
          ctx.runQuery(components.rag.chunks.list, {
            entryId: entry.entryId,
            order: "asc",
            paginationOpts: { cursor: null, numItems: 5000 },
          }),
        ),
      );
      totalRagChunks = chunkPages.reduce((sum, page) => sum + page.page.length, 0);
    }

    const categoriesCovered = guidelinesByCategory.filter((item) => item.publishedCount > 0).length;

    return {
      guidelinesByCategory,
      coverageSummary: {
        covered: guidelinesByCategory.filter((item) => item.gapSeverity === "covered").length,
        limited: guidelinesByCategory.filter((item) => item.gapSeverity === "limited").length,
        gaps: guidelinesByCategory.filter((item) => item.gapSeverity === "gap").length,
      },
      freshnessSummary,
      staleGuidelines: freshness.filter((item) => item.status !== "current").slice(0, 12),
      duplicateCandidates: duplicateCandidates.slice(0, 12),
      uploadActivity,
      indexedContent: {
        totalDocuments: uploadedDocuments.length,
        indexedDocuments: uploadedDocuments.filter((document) => document.status === "indexed").length,
        totalGuidelines: activeGuidelines.length,
        publishedGuidelines: publishedGuidelines.length,
        totalRagEntries,
        totalRagChunks,
        categoriesCovered,
        expectedCategories: GUIDELINE_CATEGORIES.length,
        coveragePercent:
          GUIDELINE_CATEGORIES.length > 0 ? categoriesCovered / GUIDELINE_CATEGORIES.length : 0,
      },
      documentStatusBreakdown,
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
