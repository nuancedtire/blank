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
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Queries Per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={metrics.queriesPerDay}>
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
                <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={metrics.mostAccessedGuidelines}
                  layout="vertical"
                  margin={{ left: 8, right: 12 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="title"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">
                No cited local guidelines yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Feedback Distribution</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Guideline Coverage</CardTitle>
          <p className="text-xs text-muted-foreground">
            Published local guideline coverage by category
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.guidelineCoverage.map((item) => (
              <div
                key={item.category}
                className="rounded-lg border px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{item.category}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.hasCoverage ? "Coverage available" : "Gap identified"}
                  </p>
                </div>
                <Badge variant={item.hasCoverage ? "secondary" : "outline"}>
                  {item.count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
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
          Unified metrics across voice AI tools — interpreter and mental health
          companion
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
