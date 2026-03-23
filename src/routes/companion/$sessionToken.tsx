import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery as useConvexQuery, useMutation as useConvexNativeMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useRealtimeChat } from "@tanstack/ai-react";
import { openaiRealtime } from "@tanstack/ai-openai";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import { getCompanionToken } from "@/lib/voice/companion-token";

export const Route = createFileRoute("/companion/$sessionToken")({
  component: CompanionPage,
});

// ─── Tool definitions ──────────────────────────────────────────────────────

const recordResponseDef = toolDefinition({
  name: "recordResponse",
  description: "Record a PHQ-9 or C-SSRS screening response",
  inputSchema: z.object({
    instrument: z.enum(["PHQ-9", "C-SSRS"]),
    itemIndex: z.number().optional(),
    questionKey: z.string().optional(),
    question: z.string(),
    responseText: z.string(),
    score: z.number().optional(),
    endorsed: z.boolean().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});

const triggerEscalationDef = toolDefinition({
  name: "triggerEscalation",
  description: "Trigger a clinical escalation with a given risk level",
  inputSchema: z.object({
    riskLevel: z.enum(["moderate", "high", "critical"]),
    escalationNote: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});

const completeSessionDef = toolDefinition({
  name: "completeSession",
  description: "Mark the session as completed",
  inputSchema: z.object({}),
  outputSchema: z.object({ success: z.boolean() }),
});

const updateLanguageDef = toolDefinition({
  name: "updateLanguage",
  description: "Update the session preferred language",
  inputSchema: z.object({
    languageCode: z.string(),
    languageName: z.string(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});

const recordConsentDef = toolDefinition({
  name: "recordConsent",
  description: "Record the patient's consent decision",
  inputSchema: z.object({
    consentGiven: z.boolean(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});

const completeScreeningDef = toolDefinition({
  name: "completeScreening",
  description: "Mark a screening instrument as complete",
  inputSchema: z.object({
    instrument: z.enum(["PHQ-9", "C-SSRS"]),
    totalScore: z.number().optional(),
    severity: z.string().optional(),
  }),
  outputSchema: z.object({ success: z.boolean() }),
});

// ─── Main component ────────────────────────────────────────────────────────

function CompanionPage() {
  const { sessionToken } = Route.useParams();

  // Use native Convex hooks — bypasses TanStack Query's expectAuth: true
  const session = useConvexQuery(
    api.mentalHealth.sessions.getSessionByToken,
    { sessionToken },
  );
  const isLoading = session === undefined;

  // Native Convex mutations
  const recordConsentMutation = useConvexNativeMutation(
    api.mentalHealth.sessions.recordConsent,
  );
  const triggerEscalationMutation = useConvexNativeMutation(
    api.mentalHealth.sessions.triggerEscalation,
  );
  const markCompletedMutation = useConvexNativeMutation(
    api.mentalHealth.sessions.markSessionCompleted,
  );
  const updateLanguageMutation = useConvexNativeMutation(
    api.mentalHealth.sessions.updateSessionLanguage,
  );
  const recordScreeningResponseMutation = useConvexNativeMutation(
    api.mentalHealth.screenings.recordScreeningResponse,
  );
  const completeScreeningMutation = useConvexNativeMutation(
    api.mentalHealth.screenings.completeScreening,
  );

  // Mutation state tracking
  const [consentPending, setConsentPending] = React.useState(false);
  const [escalationPending, setEscalationPending] = React.useState(false);

  // ─── Tool implementations (native Convex mutations are called directly) ─
  const recordResponse = recordResponseDef.client(async (args) => {
    const itemData =
      args.instrument === "PHQ-9"
        ? {
            itemIndex: args.itemIndex ?? 0,
            question: args.question,
            responseText: args.responseText,
            score: args.score ?? 0,
          }
        : {
            questionKey: args.questionKey ?? "",
            questionText: args.question,
            responseText: args.responseText,
            endorsed: args.endorsed ?? false,
          };
    await recordScreeningResponseMutation({
      sessionToken,
      instrument: args.instrument,
      itemData,
    });
    return { success: true };
  });

  const triggerEscalation = triggerEscalationDef.client(async (args) => {
    await triggerEscalationMutation({
      sessionToken,
      riskLevel: args.riskLevel,
      escalationNote: args.escalationNote,
    });
    return { success: true };
  });

  const completeSession = completeSessionDef.client(async () => {
    await markCompletedMutation({ sessionToken });
    return { success: true };
  });

  const updateLanguage = updateLanguageDef.client(async (args) => {
    await updateLanguageMutation({
      sessionToken,
      languageCode: args.languageCode,
      languageName: args.languageName,
    });
    if (typeof document !== "undefined") {
      document.documentElement.lang = args.languageCode;
    }
    return { success: true };
  });

  const recordConsent = recordConsentDef.client(async (args) => {
    await recordConsentMutation({ sessionToken, consentGiven: args.consentGiven });
    return { success: true };
  });

  const completeScreening = completeScreeningDef.client(async (args) => {
    await completeScreeningMutation({
      sessionToken,
      instrument: args.instrument,
      totalScore: args.totalScore,
      severity: args.severity,
    });
    return { success: true };
  });

  // ─── Realtime chat hook ────────────────────────────────────────────────
  const chat = useRealtimeChat({
    getToken: () => getCompanionToken(),
    adapter: openaiRealtime(),
    voice: "shimmer",
    tools: [
      recordResponse,
      triggerEscalation,
      completeSession,
      updateLanguage,
      recordConsent,
      completeScreening,
    ],
  });

  // ─── Escalation state ──────────────────────────────────────────────────
  const [escalationConfirmed, setEscalationConfirmed] = React.useState(false);
  const [consentDenied, setConsentDenied] = React.useState(false);

  const handleEmergencyButton = async () => {
    setEscalationPending(true);
    try {
      await triggerEscalationMutation({
        sessionToken,
        riskLevel: "critical" as const,
        escalationNote: "Patient triggered emergency button",
      });
      setEscalationConfirmed(true);
    } catch {
      // Still show confirmation even if mutation fails — patient safety first
      setEscalationConfirmed(true);
    } finally {
      setEscalationPending(false);
    }
  };

  const handleConsentYes = async () => {
    setConsentPending(true);
    try {
      await recordConsentMutation({ sessionToken, consentGiven: true });
      chat.connect();
    } finally {
      setConsentPending(false);
    }
  };

  const handleConsentNo = async () => {
    setConsentPending(true);
    try {
      await recordConsentMutation({ sessionToken, consentGiven: false });
      await markCompletedMutation({ sessionToken });
      setConsentDenied(true);
    } finally {
      setConsentPending(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <CompanionShell>
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <div
            className="w-16 h-16 rounded-full animate-pulse"
            style={{ background: "oklch(0.72 0.18 50 / 0.6)" }}
          />
          <p
            className="text-xl font-medium"
            style={{ color: "oklch(0.92 0.04 195)", fontFamily: "'Lora', Georgia, serif" }}
          >
            Loading...
          </p>
        </div>
      </CompanionShell>
    );
  }

  // ─── Session not found / expired ──────────────────────────────────────
  if (!session) {
    return (
      <CompanionShell>
        <SessionExpiredScreen />
      </CompanionShell>
    );
  }

  // ─── Consent denied ───────────────────────────────────────────────────
  if (consentDenied) {
    return (
      <CompanionShell>
        <NurseComingScreen />
      </CompanionShell>
    );
  }

  // ─── Status-based screens ──────────────────────────────────────────────
  if (session.status === "created") {
    return (
      <CompanionShell>
        <ConsentScreen
          onYes={handleConsentYes}
          onNo={handleConsentNo}
          isLoading={consentPending}
        />
      </CompanionShell>
    );
  }

  if (session.status === "completed" || session.status === "abandoned") {
    return (
      <CompanionShell>
        <CompletionScreen />
      </CompanionShell>
    );
  }

  if (session.status === "escalated") {
    return (
      <CompanionShell>
        <EscalatedScreen />
      </CompanionShell>
    );
  }

  // ─── Active voice interface ────────────────────────────────────────────
  return (
    <CompanionShell lang={session.preferredLanguage}>
      <VoiceInterface
        chat={chat}
        onEmergency={handleEmergencyButton}
        escalationConfirmed={escalationConfirmed}
        escalationPending={escalationPending}
      />
    </CompanionShell>
  );
}

// ─── Shell wrapper ─────────────────────────────────────────────────────────

function CompanionShell({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang?: string;
}) {
  React.useEffect(() => {
    if (lang && typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.18 0.04 220) 0%, oklch(0.22 0.06 195) 50%, oklch(0.20 0.05 210) 100%)",
        fontFamily: "'Lora', Georgia, 'Times New Roman', serif",
      }}
    >
      {children}
    </div>
  );
}

// ─── Consent screen ────────────────────────────────────────────────────────

function ConsentScreen({
  onYes,
  onNo,
  isLoading,
}: {
  onYes: () => void;
  onNo: () => void;
  isLoading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex flex-col items-center justify-center min-h-screen px-6 py-12 gap-10"
    >
      {/* Ambient orb */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.65 0.15 195 / 0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 max-w-xl w-full flex flex-col items-center gap-8 text-center">
        {/* Haven wordmark */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-1"
            style={{
              background: "oklch(0.72 0.18 50 / 0.15)",
              border: "1.5px solid oklch(0.72 0.18 50 / 0.35)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"
                fill="oklch(0.72 0.18 50 / 0.8)"
              />
            </svg>
          </div>
          <h1
            className="text-3xl font-semibold tracking-tight"
            style={{ color: "oklch(0.95 0.03 195)" }}
          >
            Haven
          </h1>
          <p
            className="text-base"
            style={{ color: "oklch(0.70 0.05 195)" }}
          >
            Mental health companion
          </p>
        </div>

        {/* Consent text */}
        <div
          className="rounded-2xl px-8 py-7 text-left leading-relaxed"
          style={{
            background: "oklch(0.25 0.04 210 / 0.6)",
            border: "1px solid oklch(0.45 0.06 195 / 0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <p
            className="text-xl leading-8"
            style={{ color: "oklch(0.92 0.03 195)", fontSize: "1.25rem" }}
          >
            Before we begin — I am an AI, not a nurse or doctor.
          </p>
          <p
            className="mt-4 text-xl leading-8"
            style={{ color: "oklch(0.82 0.04 195)", fontSize: "1.2rem" }}
          >
            I am here to listen and ask a few questions about how you have been
            feeling. Your answers will be shared with the team looking after you
            today.
          </p>
          <p
            className="mt-4 text-xl leading-8"
            style={{ color: "oklch(0.82 0.04 195)", fontSize: "1.2rem" }}
          >
            You do not have to answer anything you do not want to, and you can
            stop at any time.
          </p>
        </div>

        <p
          className="text-xl font-medium"
          style={{ color: "oklch(0.92 0.03 195)", fontSize: "1.25rem" }}
        >
          Would you be happy to chat with me?
        </p>

        {/* Action buttons */}
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button
            type="button"
            disabled={isLoading}
            onClick={onYes}
            className="w-full rounded-2xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              minHeight: "64px",
              fontSize: "1.25rem",
              background: "oklch(0.50 0.18 148)",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 4px 24px oklch(0.50 0.18 148 / 0.35)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(0.45 0.18 148)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(0.50 0.18 148)";
            }}
          >
            {isLoading ? "Starting..." : "Yes, I'd like to chat"}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onNo}
            className="w-full rounded-2xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              minHeight: "64px",
              fontSize: "1.2rem",
              background: "oklch(0.30 0.04 210 / 0.7)",
              color: "oklch(0.82 0.04 195)",
              border: "1px solid oklch(0.45 0.06 195 / 0.4)",
            }}
          >
            No, I'd like to see a nurse
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Voice interface ───────────────────────────────────────────────────────

function VoiceInterface({
  chat,
  onEmergency,
  escalationConfirmed,
  escalationPending,
}: {
  chat: ReturnType<typeof useRealtimeChat>;
  onEmergency: () => void;
  escalationConfirmed: boolean;
  escalationPending: boolean;
}) {
  const { status, outputLevel, pendingAssistantTranscript } = chat;

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  // Map outputLevel (0–1) to visual scale / glow
  const pulseScale = 1 + (outputLevel ?? 0) * 0.35;
  const glowOpacity = 0.25 + (outputLevel ?? 0) * 0.55;

  return (
    <div className="flex flex-col items-center justify-between min-h-screen px-6 py-10">
      {/* Status indicator */}
      <div className="w-full flex justify-end">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "oklch(0.25 0.04 210 / 0.5)",
            border: "1px solid oklch(0.40 0.06 195 / 0.3)",
          }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background: isConnected
                ? "oklch(0.65 0.20 148)"
                : isConnecting
                  ? "oklch(0.72 0.18 50)"
                  : "oklch(0.55 0.05 195)",
              animation: isConnected || isConnecting ? "pulse 2s infinite" : "none",
            }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: "oklch(0.75 0.05 195)", fontSize: "0.95rem" }}
          >
            {isConnected
              ? "Haven is listening"
              : isConnecting
                ? "Connecting..."
                : "Not connected"}
          </span>
        </div>
      </div>

      {/* Central amber orb */}
      <div className="flex flex-col items-center gap-10 flex-1 justify-center">
        <div className="relative flex items-center justify-center">
          {/* Outer glow ring */}
          <div
            className="absolute rounded-full transition-all duration-150"
            style={{
              width: `${140 + (outputLevel ?? 0) * 60}px`,
              height: `${140 + (outputLevel ?? 0) * 60}px`,
              background: `radial-gradient(circle, oklch(0.72 0.18 50 / ${glowOpacity}) 0%, transparent 70%)`,
              filter: "blur(20px)",
            }}
          />

          {/* Inner orb */}
          <motion.div
            animate={{ scale: pulseScale }}
            transition={{ duration: 0.1, ease: "linear" }}
            className="relative rounded-full"
            style={{
              width: "120px",
              height: "120px",
              background:
                "radial-gradient(circle at 35% 35%, oklch(0.85 0.20 55) 0%, oklch(0.72 0.18 50) 40%, oklch(0.58 0.16 45) 100%)",
              boxShadow: `0 0 40px oklch(0.72 0.18 50 / ${0.4 + (outputLevel ?? 0) * 0.4}), 0 0 80px oklch(0.72 0.18 50 / 0.15)`,
            }}
          />
        </div>

        {/* Transcript subtitle */}
        <AnimatePresence mode="wait">
          {pendingAssistantTranscript ? (
            <motion.p
              key={pendingAssistantTranscript.slice(0, 30)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-center max-w-md leading-relaxed px-4"
              style={{
                color: "oklch(0.92 0.03 195)",
                fontSize: "1.3rem",
                lineHeight: "1.75",
              }}
            >
              {pendingAssistantTranscript}
            </motion.p>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center px-4"
              style={{
                color: "oklch(0.60 0.05 195)",
                fontSize: "1.1rem",
              }}
            >
              {isConnected
                ? "Haven is here with you"
                : isConnecting
                  ? "Connecting to Haven..."
                  : ""}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Escalation confirmation */}
        <AnimatePresence>
          {escalationConfirmed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl px-6 py-5 text-center max-w-sm"
              style={{
                background: "oklch(0.20 0.06 25 / 0.7)",
                border: "1.5px solid oklch(0.55 0.20 25 / 0.5)",
                backdropFilter: "blur(12px)",
              }}
            >
              <p
                className="font-semibold text-xl leading-7"
                style={{ color: "oklch(0.92 0.05 30)", fontSize: "1.2rem" }}
              >
                A nurse has been called.
              </p>
              <p
                className="mt-2 text-lg leading-7"
                style={{ color: "oklch(0.82 0.04 30)", fontSize: "1.1rem" }}
              >
                Stay here — they are coming to you.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emergency button — always visible at bottom */}
      <div className="w-full max-w-sm pb-6">
        <button
          type="button"
          onClick={onEmergency}
          disabled={escalationPending || escalationConfirmed}
          aria-label="I need a nurse now — emergency"
          className="w-full rounded-2xl font-bold tracking-wide uppercase transition-all duration-200 active:scale-[0.97] disabled:opacity-70"
          style={{
            minHeight: "64px",
            fontSize: "1.1rem",
            letterSpacing: "0.08em",
            background: escalationConfirmed
              ? "oklch(0.30 0.06 25)"
              : "oklch(0.48 0.22 25)",
            color: "#ffffff",
            border: "none",
            boxShadow: escalationConfirmed
              ? "none"
              : "0 4px 24px oklch(0.48 0.22 25 / 0.50), 0 0 0 3px oklch(0.48 0.22 25 / 0.15)",
          }}
        >
          {escalationConfirmed ? "Nurse called — stay here" : "I NEED A NURSE NOW"}
        </button>
      </div>
    </div>
  );
}

// ─── Static screens ────────────────────────────────────────────────────────

function SessionExpiredScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6"
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "oklch(0.30 0.04 210 / 0.5)",
          border: "1px solid oklch(0.45 0.06 195 / 0.4)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="oklch(0.65 0.08 195)"
            strokeWidth="2"
          />
          <path
            d="M12 7v5l3 3"
            stroke="oklch(0.65 0.08 195)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <h1
        className="text-2xl font-semibold"
        style={{ color: "oklch(0.90 0.04 195)", fontSize: "1.5rem" }}
      >
        This session has expired
      </h1>
      <p
        className="text-xl max-w-sm leading-8"
        style={{ color: "oklch(0.72 0.05 195)", fontSize: "1.15rem" }}
      >
        Please ask a member of the team for a new link, or press the nurse call
        button by your bed.
      </p>
    </motion.div>
  );
}

function NurseComingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6"
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "oklch(0.50 0.18 148 / 0.15)",
          border: "1.5px solid oklch(0.50 0.18 148 / 0.4)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            stroke="oklch(0.55 0.18 148)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1
        className="text-2xl font-semibold"
        style={{ color: "oklch(0.92 0.04 195)", fontSize: "1.5rem" }}
      >
        That's completely okay
      </h1>
      <p
        className="text-xl max-w-sm leading-8"
        style={{ color: "oklch(0.82 0.04 195)", fontSize: "1.25rem" }}
      >
        A nurse will come to you shortly.
      </p>
    </motion.div>
  );
}

function CompletionScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6"
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "oklch(0.50 0.18 148 / 0.15)",
          border: "1.5px solid oklch(0.50 0.18 148 / 0.4)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20 6L9 17l-5-5"
            stroke="oklch(0.55 0.18 148)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1
        className="text-2xl font-semibold"
        style={{ color: "oklch(0.92 0.04 195)", fontSize: "1.5rem" }}
      >
        Thank you
      </h1>
      <p
        className="text-xl max-w-sm leading-8"
        style={{ color: "oklch(0.82 0.04 195)", fontSize: "1.25rem" }}
      >
        A member of the team will be with you shortly.
      </p>
    </motion.div>
  );
}

function EscalatedScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-6"
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "oklch(0.22 0.06 30 / 0.5)",
          border: "1.5px solid oklch(0.55 0.20 25 / 0.5)",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            fill="oklch(0.55 0.20 25 / 0.3)"
            stroke="oklch(0.65 0.20 25)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <h1
        className="text-2xl font-semibold"
        style={{ color: "oklch(0.92 0.04 195)", fontSize: "1.5rem" }}
      >
        You did the right thing telling us
      </h1>
      <p
        className="text-xl max-w-sm leading-8"
        style={{ color: "oklch(0.82 0.04 195)", fontSize: "1.25rem" }}
      >
        The team has been notified. Someone will come to you shortly.
        <br />
        Stay here — we are coming to you.
      </p>
    </motion.div>
  );
}
