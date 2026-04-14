import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Languages,
  HeartPulse,
  Activity,
  Users,
  Clock,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  MessagesSquare,
  ThumbsDown,
  ThumbsUp,
  BookOpen,
  Database,
  Files,
  GitBranch,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authed/admin/evaluation/")({
  component: EvaluationDashboard,
});

const RISK_COLORS: Record<string, string> = {
  none: "#71717a",
  low: "#22c55e",
  moderate: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const SEVERITY_COLORS: Record<string, string> = {
  none: "#71717a",
  mild: "#22c55e",
  moderate: "#f59e0b",
  moderately_severe: "#f97316",
  severe: "#ef4444",
  unknown: "#a1a1aa",
};

function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatWeekLabel(weekStart: string): string {
  return weekStart.slice(5);
}

function formatDateLabel(value: string | number) {
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function formatMonthsLabel(months: number) {
  return `${months} month${months === 1 ? "" : "s"}`;
}

function confidenceLabel(level: string) {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function coverageBadgeVariant(level: "gap" | "limited" | "covered") {
  if (level === "covered") return "secondary" as const;
  return "outline" as const;
}

function freshnessBadgeVariant(level: "current" | "due" | "overdue") {
  if (level === "current") return "secondary" as const;
  return "outline" as const;
}

function InterpreterPanel() {
  const { data: metrics } = useQuery(
    convexQuery(api.evaluation.metrics.getInterpreterMetrics, {}),
  );

  if (!metrics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Sessions"
          value={metrics.totalSessions}
          icon={Languages}
        />
        <StatCard
          label="Completion Rate"
          value={formatPercent(metrics.completionRate)}
          icon={TrendingUp}
        />
        <StatCard
          label="Mean Duration"
          value={`${metrics.meanDurationSeconds}s`}
          icon={Clock}
        />
        <StatCard
          label="Unique Clinicians"
          value={metrics.uniqueClinicians}
          icon={Users}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Sessions Per Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={metrics.sessionsPerDay}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0891b2"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Language Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={metrics.languageDistribution.slice(0, 10)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="language"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {metrics.templateDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Template Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics.templateDistribution.map((t) => (
                <Badge key={t.template} variant="secondary">
                  {t.template}: {t.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MentalHealthPanel() {
  const { data: metrics } = useQuery(
    convexQuery(api.evaluation.metrics.getMentalHealthMetrics, {}),
  );

  if (!metrics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading metrics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Sessions"
          value={metrics.totalSessions}
          icon={HeartPulse}
        />
        <StatCard
          label="Consent Rate"
          value={formatPercent(metrics.consentRate)}
          icon={TrendingUp}
          description="Patients who agreed to screening"
        />
        <StatCard
          label="Escalation Rate"
          value={formatPercent(metrics.escalationRate)}
          icon={AlertTriangle}
          description="Of completed sessions"
        />
        <StatCard
          label="Avg Alert Response"
          value={
            metrics.meanAcknowledgeTimeMs > 0
              ? formatDuration(metrics.meanAcknowledgeTimeMs)
              : "—"
          }
          icon={Clock}
          description="Time to acknowledge"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Risk Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={metrics.riskDistribution}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={((props: { level?: string; count?: number }) =>
                    `${props.level}: ${props.count}`
                  ) as unknown as boolean}
                >
                  {metrics.riskDistribution.map((entry) => (
                    <Cell
                      key={entry.level}
                      fill={RISK_COLORS[entry.level] || "#71717a"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              PHQ-9 Severity Distribution
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Screening tools only — not diagnoses
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={metrics.phq9SeverityDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="severity" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {metrics.phq9SeverityDistribution.map((entry) => (
                    <Cell
                      key={entry.severity}
                      fill={SEVERITY_COLORS[entry.severity] || "#71717a"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Sessions Per Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metrics.sessionsPerDay}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#e11d48"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Language Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={metrics.languageDistribution.slice(0, 8)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="language"
                  tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#e11d48" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AssistantPanel() {
  const { data: metrics } = useQuery(
    convexQuery(api.evaluation.metrics.getAssistantMetrics, {}),
  );
  const { data: audit } = useQuery(
    convexQuery(api.evaluation.metrics.getGuidelineAuditMetrics, {}),
  );

  if (!metrics || !audit) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading metrics...
      </div>
    );
  }

  return (
    <Tabs defaultValue="usage" className="space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
      </TabsList>

      <TabsContent value="usage" className="space-y-6 mt-0">
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard
            label="Total Queries"
            value={metrics.totalQueries}
            icon={MessagesSquare}
          />
          <StatCard
            label="Unique Users"
            value={metrics.uniqueUsers}
            icon={Users}
          />
          <StatCard
            label="Helpful Rating"
            value={formatPercent(metrics.averageFeedbackRating)}
            icon={TrendingUp}
            description="Based on clinician feedback"
          />
          <StatCard
            label="Feedback Entries"
            value={metrics.feedbackCount}
            icon={BarChart3}
          />
          <StatCard
            label="High Confidence"
            value={
              metrics.confidenceDistribution.find((item) => item.level === "high")?.count ?? 0
            }
            icon={BookOpen}
          />
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Queries Over Time</CardTitle>
              <p className="text-xs text-muted-foreground">
                Cumulative assistant usage over the last 30 days
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={metrics.totalQueriesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="totalQueries"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Queries Per Day</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={metrics.queriesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => value.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#0f766e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Queries Per Week</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics.queriesPerWeek}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="weekStart"
                    tick={{ fontSize: 10 }}
                    tickFormatter={formatWeekLabel}
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(value) => `Week of ${value}`} />
                  <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Confidence Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={metrics.confidenceDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="level" tickFormatter={confidenceLabel} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    <Cell fill="#16a34a" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#dc2626" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Most Accessed Guidelines
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Derived from local guideline citations in assistant responses
              </p>
            </CardHeader>
            <CardContent>
              {metrics.mostAccessedGuidelines.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={metrics.mostAccessedGuidelines}
                    layout="vertical"
                    margin={{ left: 8, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="title" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">
                  No cited local guidelines yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Feedback Rating</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.feedbackCount > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          label: "Helpful",
                          count: metrics.feedbackDistribution.helpful,
                        },
                        {
                          label: "Not helpful",
                          count: metrics.feedbackDistribution.notHelpful,
                        },
                      ]}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={((props: { label?: string; count?: number }) =>
                        `${props.label}: ${props.count}`
                      ) as unknown as boolean}
                    >
                      <Cell fill="#16a34a" />
                      <Cell fill="#dc2626" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">
                  No response feedback submitted yet.
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                    Helpful
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {metrics.feedbackDistribution.helpful}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
                    Not helpful
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {metrics.feedbackDistribution.notHelpful}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="knowledge-base" className="space-y-6 mt-0">
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard
            label="Active Guidelines"
            value={audit.indexedContent.totalGuidelines}
            icon={BookOpen}
          />
          <StatCard
            label="Published"
            value={audit.indexedContent.publishedGuidelines}
            icon={Files}
          />
          <StatCard
            label="Coverage"
            value={`${audit.indexedContent.categoriesCovered}/${audit.indexedContent.expectedCategories}`}
            icon={Database}
            description={`${formatPercent(audit.indexedContent.coveragePercent)} of expected categories`}
          />
          <StatCard
            label="Indexed Chunks"
            value={audit.indexedContent.totalRagChunks}
            icon={BarChart3}
          />
          <StatCard
            label="Due Review"
            value={audit.freshnessSummary.due + audit.freshnessSummary.overdue}
            icon={AlertTriangle}
          />
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Guidelines By Category</CardTitle>
              <p className="text-xs text-muted-foreground">
                Published guideline coverage across the expanded ED taxonomy
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={audit.guidelinesByCategory} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip />
                  <Bar dataKey="publishedCount" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Coverage Gaps</CardTitle>
              <p className="text-xs text-muted-foreground">
                Red = no published guidelines, amber = very limited coverage
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Covered</p>
                  <p className="mt-1 text-lg font-semibold">{audit.coverageSummary.covered}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Limited</p>
                  <p className="mt-1 text-lg font-semibold">{audit.coverageSummary.limited}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Gaps</p>
                  <p className="mt-1 text-lg font-semibold">{audit.coverageSummary.gaps}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 max-h-[300px] overflow-auto pr-1">
                {audit.guidelinesByCategory.map((item) => (
                  <div key={item.category} className="rounded-lg border px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.category}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.publishedCount} published / {item.activeCount} active
                      </p>
                    </div>
                    <Badge variant={coverageBadgeVariant(item.gapSeverity)}>
                      {item.gapSeverity === "covered"
                        ? "Covered"
                        : item.gapSeverity === "limited"
                          ? "Limited"
                          : "Gap"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Guideline Freshness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="mt-1 text-lg font-semibold">{audit.freshnessSummary.current}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Due 12m+</p>
                  <p className="mt-1 text-lg font-semibold">{audit.freshnessSummary.due}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Overdue 24m+</p>
                  <p className="mt-1 text-lg font-semibold">{audit.freshnessSummary.overdue}</p>
                </div>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {audit.staleGuidelines.length > 0 ? (
                  audit.staleGuidelines.map((item) => (
                    <div key={item.id} className="rounded-lg border px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.category} · Updated {formatDateLabel(item.lastUpdated)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={freshnessBadgeVariant(item.status)}>
                          {item.status === "overdue" ? "Overdue" : "Due review"}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatMonthsLabel(item.monthsOld)} old
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
                    No stale published guidelines flagged yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Duplicate Detection</CardTitle>
              <p className="text-xs text-muted-foreground">
                Flags exact duplicates, version overlaps, and similar titles/content
              </p>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[430px] overflow-auto pr-1">
              {audit.duplicateCandidates.length > 0 ? (
                audit.duplicateCandidates.map((candidate) => (
                  <div key={candidate.key} className="rounded-lg border px-4 py-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <p className="text-sm font-medium">
                        {candidate.titles.join(" / ")}
                      </p>
                      <Badge variant={candidate.severity === "high" ? "outline" : "secondary"}>
                        {candidate.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{candidate.reason}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
                  No duplicate candidates flagged yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Upload Activity</CardTitle>
              <p className="text-xs text-muted-foreground">
                Weekly document uploads and guideline updates
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={audit.uploadActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="weekStart" tickFormatter={formatWeekLabel} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(value) => `Week of ${value}`} />
                  <Bar dataKey="uploads" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="updates" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Indexed Content Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Documents</p>
                  <p className="mt-1 text-lg font-semibold">{audit.indexedContent.totalDocuments}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Indexed Documents</p>
                  <p className="mt-1 text-lg font-semibold">{audit.indexedContent.indexedDocuments}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">RAG Entries</p>
                  <p className="mt-1 text-lg font-semibold">{audit.indexedContent.totalRagEntries}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">RAG Chunks</p>
                  <p className="mt-1 text-lg font-semibold">{audit.indexedContent.totalRagChunks}</p>
                </div>
              </div>

              <div className="rounded-lg border p-4 flex items-start gap-3">
                <GitBranch className="h-4 w-4 mt-0.5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Coverage against expected taxonomy</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {audit.indexedContent.categoriesCovered} of {audit.indexedContent.expectedCategories} expected categories currently have published guidance.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {audit.documentStatusBreakdown.map((item) => (
                  <div key={item.status} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground capitalize">{item.status}</p>
                    <p className="mt-1 text-lg font-semibold">{item.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function EvaluationDashboard() {
  const { data: overview } = useQuery(
    convexQuery(api.evaluation.metrics.getCombinedOverview, {}),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Evaluation Framework
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Unified analytics across the assistant, interpreter, and mental health
          companion, including knowledge-base quality audit signals.
        </p>
      </div>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            label="Interpreter Sessions"
            value={overview.interpreter.total}
            icon={Languages}
          />
          <StatCard
            label="MH Sessions"
            value={overview.mentalHealth.total}
            icon={HeartPulse}
          />
          <StatCard
            label="Active Now"
            value={
              overview.interpreter.active + overview.mentalHealth.active
            }
            icon={Activity}
          />
          <StatCard
            label="Active Alerts"
            value={overview.activeAlerts}
            icon={AlertTriangle}
          />
          <StatCard
            label="Total Completed"
            value={
              overview.interpreter.completed +
              overview.mentalHealth.completed
            }
            icon={BarChart3}
          />
        </div>
      )}

      <Tabs defaultValue="interpreter">
        <TabsList>
          <TabsTrigger value="interpreter">
            <Languages className="h-4 w-4 mr-2" />
            Interpreter
          </TabsTrigger>
          <TabsTrigger value="assistant">
            <MessagesSquare className="h-4 w-4 mr-2" />
            Assistant
          </TabsTrigger>
          <TabsTrigger value="mental-health">
            <HeartPulse className="h-4 w-4 mr-2" />
            Mental Health
          </TabsTrigger>
        </TabsList>
        <TabsContent value="interpreter" className="mt-6">
          <InterpreterPanel />
        </TabsContent>
        <TabsContent value="assistant" className="mt-6">
          <AssistantPanel />
        </TabsContent>
        <TabsContent value="mental-health" className="mt-6">
          <MentalHealthPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
