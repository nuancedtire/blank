import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { QRCodeSVG } from "qrcode.react";
import {
  HeartPulse,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Wifi,
  WifiOff,
  Copy,
  ExternalLink,
  Bed,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authed/mental-health/")({
  component: MentalHealthDashboard,
});

// ─── Types ─────────────────────────────────────────────────────────────────

type SessionStatus =
  | "created"
  | "active"
  | "paused"
  | "escalated"
  | "completed"
  | "abandoned";

type RiskLevel = "none" | "low" | "moderate" | "high" | "critical";

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDuration(createdAt: number) {
  const mins = Math.floor((Date.now() - createdAt) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
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
      return "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400 animate-pulse";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function statusLabel(status: SessionStatus) {
  const map: Record<string, string> = {
    created: "Waiting",
    active: "Active",
    paused: "Paused",
    escalated: "Escalated",
  };
  return map[status] ?? status;
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
      return "bg-rose-600/20 text-rose-700 border-rose-600/35 dark:text-rose-400 animate-pulse";
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

function alertTypeLabel(type: string) {
  const map: Record<string, string> = {
    escalation_triggered: "Patient escalated",
    session_idle: "Session idle",
    high_phq9: "High PHQ-9 score",
    cssrs_high_risk: "C-SSRS high risk",
    connection_lost: "Connection lost",
  };
  return map[type] ?? type;
}

// ─── Main dashboard ────────────────────────────────────────────────────────

function MentalHealthDashboard() {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false);
  const [qrSession, setQrSession] = React.useState<{
    sessionId: string;
    sessionToken: string;
  } | null>(null);

  const { data: sessions = [] } = useQuery(
    convexQuery(api.mentalHealth.sessions.listActiveSessions, {}),
  );

  const { data: alerts = [] } = useQuery(
    convexQuery(api.mentalHealth.alerts.listActiveAlerts, {}),
  );

  const acknowledgeAlertFn = useConvexMutation(
    api.mentalHealth.alerts.acknowledgeAlert,
  );
  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: Id<"mentalHealthAlerts">) =>
      acknowledgeAlertFn({ alertId }),
    onSuccess: () => toast.success("Alert acknowledged"),
    onError: () => toast.error("Failed to acknowledge alert"),
  });

  const handleSessionCreated = (data: {
    sessionId: string;
    sessionToken: string;
  }) => {
    setCreateDialogOpen(false);
    setQrSession(data);
    setQrDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-6 w-6 text-rose-500" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Mental Health Companion
            </h1>
            <p className="text-sm text-muted-foreground">
              Active sessions and clinical alerts
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard
          label="Active"
          value={(sessions as any[]).filter((s) => s.status === "active").length}
          accent="sky"
        />
        <StatsCard
          label="Waiting"
          value={(sessions as any[]).filter((s) => s.status === "created").length}
          accent="muted"
        />
        <StatsCard
          label="Escalated"
          value={(sessions as any[]).filter((s) => s.status === "escalated").length}
          accent="rose"
          pulse={(sessions as any[]).some((s) => s.status === "escalated")}
        />
        <StatsCard
          label="Alerts"
          value={(alerts as any[]).length}
          accent={alerts.length > 0 ? "rose" : "muted"}
          pulse={alerts.length > 0}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Sessions */}
        <section aria-label="Active sessions" className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Wifi className="h-4 w-4 text-sky-500" />
            Active Sessions
            {sessions.length > 0 && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({sessions.length})
              </span>
            )}
          </h2>

          {sessions.length === 0 ? (
            <EmptyState
              icon={WifiOff}
              text="No active sessions"
              subtext="Create a session to generate a QR code for a patient."
            />
          ) : (
            <div className="space-y-2">
              {(sessions as any[]).map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  onClick={() =>
                    navigate({
                      to: "/mental-health/$sessionId",
                      params: { sessionId: session._id },
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Active Alerts */}
        <section aria-label="Active alerts" className="space-y-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Active Alerts
            {alerts.length > 0 && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({alerts.length})
              </span>
            )}
          </h2>

          {alerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              text="No active alerts"
              subtext="Clinical escalations and risk flags will appear here in real time."
            />
          ) : (
            <div className="space-y-2">
              {(alerts as any[]).map((alert) => (
                <AlertCard
                  key={alert._id}
                  alert={alert}
                  onAcknowledge={() =>
                    acknowledgeAlertMutation.mutate(alert._id)
                  }
                  onViewSession={() =>
                    navigate({
                      to: "/mental-health/$sessionId",
                      params: { sessionId: alert.sessionId },
                    })
                  }
                  isAcknowledging={acknowledgeAlertMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <CreateSessionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleSessionCreated}
      />

      {qrSession && (
        <QrCodeDialog
          open={qrDialogOpen}
          onOpenChange={setQrDialogOpen}
          sessionToken={qrSession.sessionToken}
        />
      )}
    </div>
  );
}

// ─── Stats card ────────────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  accent,
  pulse = false,
}: {
  label: string;
  value: number;
  accent: "sky" | "rose" | "muted";
  pulse?: boolean;
}) {
  const colorMap = {
    sky: "text-sky-600 dark:text-sky-400",
    rose: "text-rose-600 dark:text-rose-400",
    muted: "text-muted-foreground",
  };

  return (
    <Card className="border-border">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p
          className={cn(
            "text-3xl font-bold mt-1",
            colorMap[accent],
            pulse && value > 0 && "animate-pulse",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Session card ──────────────────────────────────────────────────────────

function SessionCard({
  session,
  onClick,
}: {
  session: any;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-card hover:bg-accent/30 hover:border-primary/30 transition-all duration-200 p-4 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {session.bedsideId ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                {session.bedsideId}
              </span>
            ) : (
              <span className="text-sm font-semibold text-muted-foreground italic">
                No bedside ID
              </span>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 px-1.5",
                statusBadgeClasses(session.status),
              )}
            >
              {statusLabel(session.status)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 px-1.5",
                riskBadgeClasses(session.currentRiskLevel),
              )}
            >
              {riskLabel(session.currentRiskLevel)}
            </Badge>
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(session.createdAt)}
            </span>
            {session.preferredLanguageName && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {session.preferredLanguageName}
              </span>
            )}
            {session.latestAlert && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3 w-3" />
                {alertTypeLabel(session.latestAlert.alertType)}
              </span>
            )}
          </div>
        </div>

        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
      </div>
    </button>
  );
}

// ─── Alert card ────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onAcknowledge,
  onViewSession,
  isAcknowledging,
}: {
  alert: any;
  onAcknowledge: () => void;
  onViewSession: () => void;
  isAcknowledging: boolean;
}) {
  const isCritical = alert.riskLevel === "critical";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 space-y-3",
        isCritical
          ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-500/10"
          : "border-orange-500/30 bg-orange-500/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className={cn(
              "h-4 w-4 mt-0.5 shrink-0",
              isCritical
                ? "text-rose-600 dark:text-rose-400"
                : "text-orange-600 dark:text-orange-400",
            )}
          />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {alertTypeLabel(alert.alertType)}
            </p>
            {alert.session?.bedsideId && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Bed className="h-3 w-3" />
                Bedside {alert.session.bedsideId}
              </p>
            )}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] h-5 px-1.5 shrink-0",
            riskBadgeClasses(alert.riskLevel),
          )}
        >
          {riskLabel(alert.riskLevel)}
        </Badge>
      </div>

      {alert.escalationNote && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
          {alert.escalationNote}
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDuration(alert.createdAt)}
        </span>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={onViewSession}
          >
            View Session
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={onAcknowledge}
            disabled={isAcknowledging}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Acknowledge
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  text,
  subtext,
}: {
  icon: React.ElementType;
  text: string;
  subtext: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium text-muted-foreground">{text}</p>
      <p className="mt-1 text-xs text-muted-foreground/70">{subtext}</p>
    </div>
  );
}

// ─── Create session dialog ─────────────────────────────────────────────────

function CreateSessionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (data: { sessionId: string; sessionToken: string }) => void;
}) {
  const [bedsideId, setBedsideId] = React.useState("");

  const createSessionFn = useConvexMutation(
    api.mentalHealth.sessions.createSession,
  );
  const createMutation = useMutation({
    mutationFn: () =>
      createSessionFn({ bedsideId: bedsideId.trim() || undefined }),
    onSuccess: (data) => {
      setBedsideId("");
      onCreated(data as any);
    },
    onError: () => {
      toast.error("Failed to create session");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            A QR code will be generated for the patient to scan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="bedsideId">
              Bedside ID{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Input
              id="bedsideId"
              placeholder="e.g. Bay 3B"
              value={bedsideId}
              onChange={(e) => setBedsideId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createMutation.mutate();
              }}
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Session"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── QR code dialog ────────────────────────────────────────────────────────

function QrCodeDialog({
  open,
  onOpenChange,
  sessionToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionToken: string;
}) {
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/companion/${sessionToken}`
      : `/companion/${sessionToken}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Patient Session Link</DialogTitle>
          <DialogDescription>
            Ask the patient to scan this QR code or visit the URL below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 pt-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <QRCodeSVG value={url} size={200} level="M" includeMargin={false} />
          </div>

          <div className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 flex items-center gap-2">
            <code className="text-xs text-muted-foreground break-all flex-1">
              {url}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={copyUrl}
              title="Copy link"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            This link is valid for 8 hours and is specific to this patient
            session.
          </p>

          <Button
            className="w-full"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
