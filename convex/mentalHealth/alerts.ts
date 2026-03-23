import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { authComponent } from "../auth";
import { findUserProfile } from "../userProfile";

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
// Internal — creates an alert and a broadcast notification
// ---------------------------------------------------------------------------

export const createAlert = internalMutation({
  args: {
    sessionId: v.id("mentalHealthSessions"),
    alertType: v.union(
      v.literal("escalation_triggered"),
      v.literal("session_idle"),
      v.literal("high_phq9"),
      v.literal("cssrs_high_risk"),
      v.literal("connection_lost"),
    ),
    riskLevel: v.union(
      v.literal("moderate"),
      v.literal("high"),
      v.literal("critical"),
    ),
    escalationNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const alertId = await ctx.db.insert("mentalHealthAlerts", {
      sessionId: args.sessionId,
      alertType: args.alertType,
      riskLevel: args.riskLevel,
      escalationNote: args.escalationNote,
      status: "active",
      createdAt: now,
    });

    // Fetch the session to get assignedByUserId for createdBy
    const session = await ctx.db.get(args.sessionId);
    if (!session) return alertId;

    const riskLabel =
      args.riskLevel === "critical"
        ? "CRITICAL"
        : args.riskLevel === "high"
          ? "HIGH"
          : "MODERATE";

    const typeLabel: Record<string, string> = {
      escalation_triggered: "Patient escalated",
      session_idle: "Session idle",
      high_phq9: "High PHQ-9 score",
      cssrs_high_risk: "C-SSRS high risk",
      connection_lost: "Connection lost",
    };

    const title = `[${riskLabel}] ${typeLabel[args.alertType] ?? args.alertType}`;
    const bedsideInfo = session.bedsideId
      ? ` — Bedside ${session.bedsideId}`
      : "";
    const message = args.escalationNote
      ? `${args.escalationNote}${bedsideInfo}`
      : `Mental health companion alert${bedsideInfo}`;

    await ctx.db.insert("notifications", {
      title,
      message,
      type: "alert",
      isBroadcast: true,
      readBy: [],
      dismissedBy: [],
      createdBy: session.assignedByUserId,
      createdAt: now,
      link: `/mental-health/${args.sessionId}`,
    });

    await ctx.db.insert("auditLogs", {
      userId: session.assignedByUserId,
      action: "mh_alert.created",
      resourceType: "mh_alert",
      resourceId: alertId,
      details: `Alert type: ${args.alertType}, risk: ${args.riskLevel}`,
      timestamp: now,
    });

    return alertId;
  },
});

// ---------------------------------------------------------------------------
// Clinician-facing (auth required)
// ---------------------------------------------------------------------------

export const listActiveAlerts = query({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);

    const alerts = await ctx.db
      .query("mentalHealthAlerts")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();

    // Join with session data for each alert
    const alertsWithSessions = await Promise.all(
      alerts.map(async (alert) => {
        const session = await ctx.db.get(alert.sessionId);
        return {
          ...alert,
          session: session
            ? {
                _id: session._id,
                bedsideId: session.bedsideId,
                currentRiskLevel: session.currentRiskLevel,
                status: session.status,
              }
            : null,
        };
      }),
    );

    return alertsWithSessions;
  },
});

export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("mentalHealthAlerts"),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const alert = await ctx.db.get(args.alertId);
    if (!alert) throw new Error("Alert not found");

    await ctx.db.patch(args.alertId, {
      status: "acknowledged",
      acknowledgedAt: Date.now(),
      acknowledgedByUserId: user._id,
    });

    return { acknowledged: true };
  },
});

export const resolveAlert = mutation({
  args: {
    alertId: v.id("mentalHealthAlerts"),
    resolutionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const alert = await ctx.db.get(args.alertId);
    if (!alert) throw new Error("Alert not found");

    await ctx.db.patch(args.alertId, {
      status: "resolved",
      resolvedAt: Date.now(),
      resolvedByUserId: user._id,
      resolutionNote: args.resolutionNote,
    });

    return { resolved: true };
  },
});
