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
          <TabsTrigger value="mental-health">
            <HeartPulse className="h-4 w-4 mr-2" />
            Mental Health
          </TabsTrigger>
        </TabsList>
        <TabsContent value="interpreter" className="mt-6">
          <InterpreterPanel />
        </TabsContent>
        <TabsContent value="mental-health" className="mt-6">
          <MentalHealthPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
