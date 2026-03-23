import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Bed,
  Copy,
  FileText,
  Activity,
  BarChart3,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/mental-health/$sessionId")({
  component: SessionDetailPage,
});

// ─── Types ─────────────────────────────────────────────────────────────────

type RiskLevel = "none" | "low" | "moderate" | "high" | "critical";
type SessionStatus =
  | "created"
  | "active"
  | "paused"
  | "escalated"
  | "completed"
  | "abandoned";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTs(ts: number | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startMs: number, endMs?: number) {
  const diff = (endMs ?? Date.now()) - startMs;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function riskBadgeClasses(risk: RiskLevel) {
  switch (risk) {
    case "none":
      return "bg-muted text-muted-foreground border-border";
    case "low":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400";
    case "moderate":
      return "bg-amber-400/15 text-amber-700 border-amber-400/30 dark:text-amber-400";
    case "high":
      return "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400";
    case "critical":
      return "bg-rose-600/20 text-rose-700 border-rose-600/35 dark:text-rose-400";
  }
}

function riskLabel(risk: RiskLevel) {
  const map: Record<string, string> = {
    none: "No risk",
    low: "Low",
    moderate: "Moderate",
    high: "High",
    critical: "Critical",
  };
  return map[risk] ?? risk;
}

function statusBadgeClasses(status: SessionStatus) {
  switch (status) {
    case "created":
      return "bg-muted text-muted-foreground border-border";
    case "active":
      return "bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400";
    case "paused":
      return "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400";
    case "escalated":
      return "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400";
    case "completed":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400";
    case "abandoned":
      return "bg-muted text-muted-foreground border-border";
  }
}

function statusLabel(status: SessionStatus) {
  const map: Record<string, string> = {
    created: "Waiting",
    active: "Active",
    paused: "Paused",
    escalated: "Escalated",
    completed: "Completed",
    abandoned: "Abandoned",
  };
  return map[status] ?? status;
}

function phq9SeverityClasses(severity: string) {
  switch (severity) {
    case "mild":
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
    case "moderate":
      return "text-amber-700 dark:text-amber-400 bg-amber-400/15 border-amber-400/30";
    case "moderately_severe":
      return "text-orange-700 dark:text-orange-400 bg-orange-500/15 border-orange-500/30";
    case "severe":
      return "text-rose-700 dark:text-rose-400 bg-rose-600/20 border-rose-600/35";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
}

function phq9SeverityLabel(severity: string) {
  const map: Record<string, string> = {
    none: "Minimal / None",
    mild: "Mild",
    moderate: "Moderate",
    moderately_severe: "Moderately Severe",
    severe: "Severe",
  };
  return map[severity] ?? severity;
}

function cssrsIdeationLabel(category: string) {
  const map: Record<string, string> = {
    none: "No ideation",
    passive: "Passive ideation",
    active_no_plan: "Active ideation, no plan",
    active_with_plan: "Active ideation with plan",
    active_with_intent: "Active ideation with intent",
  };
  return map[category] ?? category;
}

function cssrsIdeationClasses(category: string) {
  switch (category) {
    case "none":
      return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
    case "passive":
      return "text-amber-700 dark:text-amber-400 bg-amber-400/15 border-amber-400/30";
    case "active_no_plan":
      return "text-orange-700 dark:text-orange-400 bg-orange-500/15 border-orange-500/30";
    case "active_with_plan":
      return "text-rose-700 dark:text-rose-400 bg-rose-600/20 border-rose-600/35";
    case "active_with_intent":
      return "text-rose-700 dark:text-rose-400 bg-rose-700/25 border-rose-700/40";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
}

// ─── Main page ─────────────────────────────────────────────────────────────

function SessionDetailPage() {
  const { sessionId } = Route.useParams();

  const { data: session, isLoading: sessionLoading } = useQuery(
    convexQuery(api.mentalHealth.sessions.getSessionById, {
      sessionId: sessionId as Id<"mentalHealthSessions">,
    }),
  );

  const { data: screenings = [], isLoading: screeningsLoading } = useQuery(
    convexQuery(api.mentalHealth.screenings.getScreeningsForSession, {
      sessionId: sessionId as Id<"mentalHealthSessions">,
    }),
  );

  const { data: handover, isLoading: handoverLoading } = useQuery(
    convexQuery(api.mentalHealth.documents.getHandoverDocument, {
      sessionId: sessionId as Id<"mentalHealthSessions">,
    }),
  );

  const acknowledgeEscalationFn = useConvexMutation(
    api.mentalHealth.sessions.acknowledgeEscalation,
  );
  const acknowledgeMutation = useMutation({
    mutationFn: () =>
      acknowledgeEscalationFn({
        sessionId: sessionId as Id<"mentalHealthSessions">,
      }),
    onSuccess: () => toast.success("Escalation acknowledged"),
    onError: () => toast.error("Failed to acknowledge escalation"),
  });

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="font-semibold text-muted-foreground">Session not found</p>
        <Link to="/mental-health">
          <Button variant="link" className="mt-2">
            Back to dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const phq9 = (screenings as any[]).find((s) => s.instrument === "PHQ-9");
  const cssrs = (screenings as any[]).find((s) => s.instrument === "C-SSRS");

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link to="/mental-health">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-1">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {(session as any).bedsideId ? (
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Bed className="h-5 w-5 text-muted-foreground" />
                {(session as any).bedsideId}
              </h1>
            ) : (
              <h1 className="text-2xl font-bold text-muted-foreground italic">
                No bedside ID
              </h1>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                statusBadgeClasses((session as any).status),
              )}
            >
              {statusLabel((session as any).status)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                riskBadgeClasses((session as any).currentRiskLevel),
              )}
            >
              {riskLabel((session as any).currentRiskLevel)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Session {sessionId.slice(0, 12)}...
          </p>
        </div>

        {(session as any).status === "escalated" &&
          !(session as any).escalationAcknowledgedAt && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => acknowledgeMutation.mutate()}
              disabled={acknowledgeMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {acknowledgeMutation.isPending
                ? "Acknowledging..."
                : "Acknowledge Escalation"}
            </Button>
          )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="screening" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Screening Results
          </TabsTrigger>
          <TabsTrigger value="handover" className="gap-2">
            <FileText className="h-4 w-4" />
            Handover Note
          </TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetadataCard title="Session Details">
              <MetaRow label="Status" value={statusLabel((session as any).status)} />
              <MetaRow label="Risk Level" value={riskLabel((session as any).currentRiskLevel)} />
              <MetaRow label="Bedside ID" value={(session as any).bedsideId ?? "—"} />
              <MetaRow
                label="Language"
                value={
                  (session as any).preferredLanguageName
                    ? `${(session as any).preferredLanguageName} (${(session as any).preferredLanguage})`
                    : "English (en)"
                }
              />
              <MetaRow
                label="Consent"
                value={(session as any).consentGiven ? "Given" : "Not given"}
              />
            </MetadataCard>

            <MetadataCard title="Timeline">
              <MetaRow
                label="Created"
                value={formatTs((session as any).createdAt)}
              />
              <MetaRow
                label="Activated"
                value={formatTs((session as any).activatedAt)}
              />
              <MetaRow
                label="Completed"
                value={formatTs((session as any).completedAt)}
              />
              <MetaRow
                label="Duration"
                value={
                  (session as any).activatedAt
                    ? formatDuration(
                        (session as any).activatedAt,
                        (session as any).completedAt,
                      )
                    : "—"
                }
              />
              <MetaRow
                label="Expires"
                value={formatTs((session as any).expiresAt)}
              />
            </MetadataCard>
          </div>

          {/* Escalation details */}
          {(session as any).status === "escalated" && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Escalation Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MetaRow
                  label="Triggered At"
                  value={formatTs((session as any).escalationTriggeredAt)}
                />
                <MetaRow
                  label="Acknowledged At"
                  value={formatTs((session as any).escalationAcknowledgedAt)}
                />
                {!(session as any).escalationAcknowledgedAt && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-2">
                    This escalation has not yet been acknowledged by a clinician.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Screening results tab */}
        <TabsContent value="screening" className="mt-5 space-y-5">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              Screening tools only — not diagnoses. Results require clinical interpretation.
            </p>
          </div>

          {screeningsLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!screeningsLoading && screenings.length === 0 && (
            <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                No screening data yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Screening results will appear here as Haven collects responses.
              </p>
            </div>
          )}

          {phq9 && <Phq9Results screening={phq9} />}
          {cssrs && <CssrsResults screening={cssrs} />}
        </TabsContent>

        {/* Handover note tab */}
        <TabsContent value="handover" className="mt-5">
          <HandoverNote
            handover={handover as any}
            isLoading={handoverLoading}
            sessionStatus={(session as any).status}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── PHQ-9 results ─────────────────────────────────────────────────────────

function Phq9Results({ screening }: { screening: any }) {
  const score = screening.phq9TotalScore ?? 0;
  const severity = screening.phq9Severity ?? "none";
  const responses: any[] = screening.phq9Responses ?? [];
  const maxScore = 27;
  const pct = Math.round((score / maxScore) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">PHQ-9</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", phq9SeverityClasses(severity))}
            >
              {phq9SeverityLabel(severity)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {screening.status === "completed" ? "Complete" : "In progress"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score visualisation */}
        <div className="space-y-2">
          <div className="flex items-end justify-between text-sm">
            <span className="text-muted-foreground">Total Score</span>
            <span className="text-2xl font-bold text-foreground">
              {score}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {maxScore}
              </span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                severity === "severe"
                  ? "bg-rose-500"
                  : severity === "moderately_severe"
                    ? "bg-orange-500"
                    : severity === "moderate"
                      ? "bg-amber-400"
                      : severity === "mild"
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/40",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0–4: None</span>
            <span>5–9: Mild</span>
            <span>10–14: Moderate</span>
            <span>15–19: Mod-Severe</span>
            <span>20–27: Severe</span>
          </div>
        </div>

        {/* Individual responses */}
        {responses.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
              Item Breakdown
            </p>
            <div className="space-y-2">
              {responses.map((r: any) => (
                <div
                  key={r.itemIndex}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      Q{r.itemIndex}
                    </p>
                    <p className="text-sm text-foreground leading-snug mt-0.5">
                      {r.question}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      "{r.responseText}"
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold shrink-0",
                      r.score === 0
                        ? "bg-muted text-muted-foreground"
                        : r.score === 1
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                          : r.score === 2
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
                    )}
                  >
                    {r.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── C-SSRS results ────────────────────────────────────────────────────────

function CssrsResults({ screening }: { screening: any }) {
  const ideationCategory = screening.cssrsIdeationCategory ?? "none";
  const isHighRisk = screening.cssrsHighRisk ?? false;
  const responses: any[] = screening.cssrsResponses ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">C-SSRS</CardTitle>
          <div className="flex items-center gap-2">
            {isHighRisk && (
              <Badge
                variant="outline"
                className="text-xs bg-rose-700/25 text-rose-700 border-rose-700/40 dark:text-rose-400"
              >
                High Risk
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {screening.status === "completed" ? "Complete" : "In progress"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Ideation summary card */}
        <div
          className={cn(
            "rounded-xl border px-4 py-3",
            cssrsIdeationClasses(ideationCategory),
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Ideation Category
          </p>
          <p className="text-base font-semibold mt-0.5">
            {cssrsIdeationLabel(ideationCategory)}
          </p>
        </div>

        {/* Individual question endorsements */}
        {responses.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
              Question Endorsements
            </p>
            <div className="space-y-2">
              {responses.map((r: any) => (
                <div
                  key={r.questionKey}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5",
                    r.endorsed
                      ? "border-rose-500/30 bg-rose-500/5"
                      : "border-border bg-muted/30",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      {r.questionKey}
                    </p>
                    <p className="text-sm text-foreground leading-snug mt-0.5">
                      {r.questionText}
                    </p>
                    {r.responseText && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{r.responseText}"
                      </p>
                    )}
                  </div>
                  <div
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold shrink-0 border",
                      r.endorsed
                        ? "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400"
                        : "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400",
                    )}
                  >
                    {r.endorsed ? "Yes" : "No"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Handover note ─────────────────────────────────────────────────────────

function HandoverNote({
  handover,
  isLoading,
  sessionStatus,
}: {
  handover: { handoverDocumentText: string | null; handoverGeneratedAt: number | null } | null;
  isLoading: boolean;
  sessionStatus: string;
}) {
  const copyToClipboard = () => {
    if (handover?.handoverDocumentText) {
      navigator.clipboard.writeText(handover.handoverDocumentText).then(() => {
        toast.success("Handover note copied to clipboard");
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!handover?.handoverDocumentText) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        {sessionStatus === "completed" || sessionStatus === "escalated" ? (
          <>
            <p className="text-sm font-medium text-muted-foreground">
              Generating handover note...
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              The SBAR note is being generated by the AI. Refresh in a moment.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-muted-foreground">
              Session in progress
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              The handover note will be generated once the session is completed.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            SBAR Handover Note
          </h3>
          {handover.handoverGeneratedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Generated{" "}
              {new Date(handover.handoverGeneratedAt).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={copyToClipboard}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
      </div>

      <Card className="border-border">
        <CardContent className="p-5">
          <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {handover.handoverDocumentText}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        AI-generated clinical summary. Verify all information before use in
        patient records.
      </p>
    </div>
  );
}

// ─── Metadata helpers ──────────────────────────────────────────────────────

function MetadataCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}
