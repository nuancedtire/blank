import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { useRealtimeChat } from "@tanstack/ai-react";
import { openaiRealtime } from "@tanstack/ai-openai";
import { motion, AnimatePresence } from "motion/react";
import {
  Languages,
  ChevronDown,
  Mic,
  MicOff,
  PhoneOff,
  Clock,
  MessageSquare,
  RotateCcw,
  Stethoscope,
  Pill,
  FileText,
  LogOut,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/interpreter/languages";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_PHRASES,
} from "@/lib/interpreter/templates";
import { getInterpreterToken, buildInterpreterPrompt } from "@/lib/voice/interpreter-token";
import { api } from "convex/_generated/api";

export const Route = createFileRoute("/_authed/interpreter")({
  component: InterpreterPage,
});

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "setup" | "active" | "summary";

const SCENARIO_TEMPLATES = [
  {
    id: "chest_pain",
    label: "Chest Pain",
    description: "Cardiac history & presenting complaint",
    icon: Activity,
    color: "from-rose-500/20 to-rose-600/10 border-rose-500/25",
    iconColor: "text-rose-400",
  },
  {
    id: "trauma",
    label: "Trauma Assessment",
    description: "Mechanism, injuries & pain",
    icon: Stethoscope,
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/25",
    iconColor: "text-amber-400",
  },
  {
    id: "medication",
    label: "Medication & Allergies",
    description: "Drug history & adverse reactions",
    icon: Pill,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/25",
    iconColor: "text-violet-400",
  },
  {
    id: "consent",
    label: "Consent Discussion",
    description: "Explaining procedures & obtaining agreement",
    icon: FileText,
    color: "from-sky-500/20 to-sky-600/10 border-sky-500/25",
    iconColor: "text-sky-400",
  },
  {
    id: "discharge",
    label: "Discharge Planning",
    description: "Follow-up instructions & safety-netting",
    icon: LogOut,
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/25",
    iconColor: "text-emerald-400",
  },
  {
    id: "general",
    label: "General History",
    description: "Open-ended history taking",
    icon: MessageSquare,
    color: "from-zinc-500/20 to-zinc-600/10 border-zinc-500/25",
    iconColor: "text-zinc-400",
  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ─── Language Picker ─────────────────────────────────────────────────────────

const PRIORITY_CODES = ["ur", "bn", "so", "ar", "pl", "zh", "ro", "gu", "pa"];

function LanguagePicker({
  value,
  onChange,
}: {
  value: SupportedLanguage | null;
  onChange: (lang: SupportedLanguage) => void;
}) {
  const [open, setOpen] = React.useState(false);

  const priorityLanguages = SUPPORTED_LANGUAGES.filter((l) =>
    PRIORITY_CODES.includes(l.code),
  );
  const otherLanguages = SUPPORTED_LANGUAGES.filter(
    (l) => !PRIORITY_CODES.includes(l.code),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select patient language"
          className={cn(
            "w-full justify-between h-14 px-4 text-base border-border bg-card hover:bg-accent/40 transition-colors",
            !value && "text-muted-foreground",
          )}
        >
          {value ? (
            <span className="flex items-center gap-3">
              <span className="text-2xl leading-none">{value.flag}</span>
              <span className="flex flex-col items-start gap-0.5">
                <span className="font-medium text-foreground">{value.name}</span>
                <span className="text-xs text-muted-foreground">
                  {value.nativeName}
                </span>
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Languages className="w-4 h-4" />
              Select patient language
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search language..." className="h-10" />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            <CommandGroup heading="Common Languages">
              {priorityLanguages.map((lang) => (
                <CommandItem
                  key={lang.code}
                  value={`${lang.name} ${lang.nativeName}`}
                  onSelect={() => {
                    onChange(lang);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 py-3 cursor-pointer"
                >
                  <span className="text-xl leading-none">{lang.flag}</span>
                  <span className="flex flex-col">
                    <span className="font-medium">{lang.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {lang.nativeName}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="All Languages">
              {otherLanguages.map((lang) => (
                <CommandItem
                  key={lang.code}
                  value={`${lang.name} ${lang.nativeName}`}
                  onSelect={() => {
                    onChange(lang);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 py-3 cursor-pointer"
                >
                  <span className="text-xl leading-none">{lang.flag}</span>
                  <span className="flex flex-col">
                    <span className="font-medium">{lang.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {lang.nativeName}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Setup Phase ─────────────────────────────────────────────────────────────

function SetupPhase({
  onStart,
}: {
  onStart: (language: SupportedLanguage, scenario: string | null) => void;
}) {
  const [selectedLanguage, setSelectedLanguage] =
    React.useState<SupportedLanguage | null>(null);
  const [selectedScenario, setSelectedScenario] = React.useState<string | null>(
    null,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-2xl mx-auto px-4 py-8 md:py-12"
    >
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Languages className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "'Lora', Georgia, serif" }}
            >
              AI Interpreter
            </h1>
            <p className="text-sm text-muted-foreground">
              Real-time interpretation for ED consultations
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
            <strong>Clinical use only.</strong> This AI interpreter is a
            supplementary tool. For sensitive or complex clinical conversations,
            use a qualified human interpreter where possible.
          </p>
        </div>
      </div>

      {/* Language Selection */}
      <section className="mb-8">
        <label className="block text-sm font-medium text-foreground mb-3">
          Patient language <span className="text-destructive">*</span>
        </label>
        <LanguagePicker value={selectedLanguage} onChange={setSelectedLanguage} />
      </section>

      {/* Scenario Templates */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-foreground">
            Clinical scenario
          </label>
          <span className="text-xs text-muted-foreground">Optional</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {SCENARIO_TEMPLATES.map((scenario) => {
            const Icon = scenario.icon;
            const isSelected = selectedScenario === scenario.id;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() =>
                  setSelectedScenario(isSelected ? null : scenario.id)
                }
                className={cn(
                  "relative flex flex-col gap-2 p-4 rounded-xl border text-left transition-all duration-200",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "min-h-[88px]",
                  isSelected
                    ? `bg-gradient-to-br ${scenario.color} ring-1 ring-primary/40`
                    : "border-border bg-card hover:border-primary/30 hover:bg-accent/30",
                )}
                aria-pressed={isSelected}
              >
                <Icon
                  className={cn(
                    "w-4 h-4",
                    isSelected ? scenario.iconColor : "text-muted-foreground",
                  )}
                />
                <div>
                  <p
                    className={cn(
                      "text-xs font-medium leading-tight",
                      isSelected ? "text-foreground" : "text-foreground",
                    )}
                  >
                    {scenario.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {scenario.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Start Button */}
      <Button
        size="lg"
        className="w-full h-14 text-base font-semibold gap-3 rounded-xl"
        disabled={!selectedLanguage}
        onClick={() => {
          if (selectedLanguage) {
            onStart(selectedLanguage, selectedScenario);
          }
        }}
      >
        <Mic className="w-5 h-5" />
        Start Interpreting
        {selectedLanguage && (
          <span className="opacity-70 font-normal">
            — {selectedLanguage.name}
          </span>
        )}
      </Button>

      {!selectedLanguage && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          Select a patient language to begin
        </p>
      )}
    </motion.div>
  );
}

// ─── Pulsing Circle ───────────────────────────────────────────────────────────

function AudioOrb({
  outputLevel,
  inputLevel,
  mode,
}: {
  outputLevel: number;
  inputLevel: number;
  mode: string;
}) {
  const isSpeaking = mode === "speaking";
  const isListening = mode === "listening";

  const baseScale = 1;
  const dynamicScale = isSpeaking
    ? baseScale + outputLevel * 0.5
    : isListening
      ? baseScale + inputLevel * 0.25
      : baseScale;

  return (
    <div className="relative flex items-center justify-center w-56 h-56">
      {/* Outer glow rings */}
      <div
        className={cn(
          "absolute inset-0 rounded-full opacity-20 transition-all duration-300",
          isSpeaking
            ? "bg-sky-400 animate-ping"
            : isListening
              ? "bg-emerald-400 animate-ping"
              : "bg-zinc-400",
        )}
        style={{ animationDuration: isSpeaking ? "1.2s" : "1.8s" }}
      />
      <div
        className={cn(
          "absolute rounded-full opacity-30 transition-all duration-200",
          isSpeaking ? "bg-sky-500" : isListening ? "bg-emerald-500" : "bg-zinc-600",
        )}
        style={{
          inset: "-12px",
          transform: `scale(${dynamicScale * 0.9})`,
          transition: "transform 100ms ease-out",
        }}
      />

      {/* Core orb */}
      <motion.div
        className={cn(
          "relative w-40 h-40 rounded-full border-2 flex items-center justify-center",
          "backdrop-blur-sm transition-colors duration-300",
          isSpeaking
            ? "bg-sky-500/20 border-sky-400/60"
            : isListening
              ? "bg-emerald-500/20 border-emerald-400/60"
              : "bg-zinc-800/80 border-zinc-700/60",
        )}
        animate={{ scale: dynamicScale }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Inner gradient circle */}
        <div
          className={cn(
            "w-24 h-24 rounded-full",
            isSpeaking
              ? "bg-gradient-to-br from-sky-400/40 to-blue-600/40"
              : isListening
                ? "bg-gradient-to-br from-emerald-400/40 to-teal-600/40"
                : "bg-gradient-to-br from-zinc-600/40 to-zinc-800/40",
          )}
        />

        {/* Mode icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isSpeaking && <Mic className="w-8 h-8 text-sky-300 opacity-80" />}
          {isListening && (
            <Mic className="w-8 h-8 text-emerald-300 opacity-80 animate-pulse" />
          )}
          {!isSpeaking && !isListening && (
            <MicOff className="w-7 h-7 text-zinc-500 opacity-60" />
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Template Strip ───────────────────────────────────────────────────────────

function TemplateStrip({
  languageName,
  onTap,
}: {
  languageName: string;
  onTap: (phrase: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto pb-2 no-scrollbar">
      <div className="flex gap-2 px-4 w-max">
        {TEMPLATE_CATEGORIES.map((category, catIdx) => {
          const phrases = TEMPLATE_PHRASES.filter(
            (p) => p.category === category.id,
          );
          return (
            <React.Fragment key={category.id}>
              {catIdx > 0 && (
                <div className="w-px bg-zinc-700 self-stretch mx-1 shrink-0" />
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider whitespace-nowrap shrink-0 pr-1">
                  {category.name}
                </span>
                {phrases.map((phrase) => (
                  <button
                    key={phrase.id}
                    type="button"
                    onClick={() => onTap(phrase.englishText)}
                    className={cn(
                      "shrink-0 whitespace-nowrap rounded-full px-4 py-2.5",
                      "text-xs font-medium text-zinc-200",
                      "border border-zinc-700 bg-zinc-800/80",
                      "hover:bg-zinc-700 hover:border-zinc-600 hover:text-white",
                      "active:scale-95 transition-all duration-150",
                      "min-h-[48px] cursor-pointer",
                    )}
                    title={`Say in ${languageName}: "${phrase.englishText}"`}
                  >
                    {phrase.englishText}
                  </button>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}


// ─── Summary Phase ────────────────────────────────────────────────────────────

function SummaryPhase({
  language,
  durationSeconds,
  messages,
  onReset,
}: {
  language: SupportedLanguage;
  durationSeconds: number;
  messages: any[];
  onReset: () => void;
}) {
  const turnCount = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-2xl mx-auto px-4 py-8"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">
            Session Complete
          </span>
        </div>
        <h2
          className="text-2xl font-semibold text-foreground"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          Interpretation Summary
        </h2>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Duration",
            value: formatDuration(durationSeconds),
            icon: Clock,
          },
          {
            label: "Language",
            value: language.name,
            icon: Languages,
            prefix: language.flag,
          },
          {
            label: "Exchanges",
            value: String(Math.ceil(turnCount / 2)),
            icon: MessageSquare,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <stat.icon className="w-3.5 h-3.5" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {stat.prefix && (
                <span className="mr-1.5">{stat.prefix}</span>
              )}
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Transcript */}
      {messages.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Conversation Transcript
          </h3>
          <ScrollArea className="h-64 rounded-xl border border-border bg-card/50 p-4">
            <div className="flex flex-col gap-3">
              {messages.map((msg: any, idx: number) => {
                const textContent = msg.parts
                  ?.map((p: any) => p.transcript || p.content || "")
                  .filter(Boolean)
                  .join(" ");
                if (!textContent) return null;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm",
                        msg.role === "user"
                          ? "bg-primary/15 text-foreground"
                          : "bg-muted text-foreground",
                      )}
                    >
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                        {msg.role === "user" ? "Clinician" : "Interpreter"}
                      </p>
                      <p className="leading-relaxed">{textContent}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="w-full h-12 gap-2"
          onClick={onReset}
        >
          <RotateCcw className="w-4 h-4" />
          Start New Session
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function InterpreterPage() {
  const [phase, setPhase] = React.useState<Phase>("setup");
  const [selectedLanguage, setSelectedLanguage] =
    React.useState<SupportedLanguage | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = React.useState(0);
  const [sessionMessages, setSessionMessages] = React.useState<any[]>([]);

  const createSessionMutation = useConvexMutation(
    (api as any).interpreter.sessions.createSession,
  );
  const completeSessionMutation = useConvexMutation(
    (api as any).interpreter.sessions.completeSession,
  );

  const createMutation = useMutation({
    mutationFn: (args: {
      patientLanguage: string;
      patientLanguageName: string;
      scenarioTemplate?: string;
    }) => createSessionMutation(args),
  });

  const completeMutation = useMutation({
    mutationFn: (args: {
      sessionId: any;
      durationSeconds: number;
      transcriptTurns?: Array<{
        speaker: "clinician" | "patient";
        englishText: string;
        timestamp: number;
      }>;
    }) => completeSessionMutation(args),
  });

  const handleStart = React.useCallback(
    async (language: SupportedLanguage, scenario: string | null) => {
      setSelectedLanguage(language);
      try {
        const result = await createMutation.mutateAsync({
          patientLanguage: language.code,
          patientLanguageName: language.name,
          ...(scenario ? { scenarioTemplate: scenario } : {}),
        });
        setSessionId((result as any)?.sessionId ?? null);
      } catch {
        // Session tracking failure is non-blocking — proceed anyway
        setSessionId(null);
      }
      setPhase("active");
    },
    [createMutation],
  );

  const handleEnd = React.useCallback(
    async (durationSeconds: number, messages: any[] = []) => {
      setSessionDuration(durationSeconds);
      setSessionMessages(messages);

      if (sessionId) {
        try {
          await completeMutation.mutateAsync({
            sessionId: sessionId as any,
            durationSeconds,
          });
        } catch {
          // Non-blocking
        }
      }

      setPhase("summary");
    },
    [sessionId, completeMutation],
  );

  const handleReset = React.useCallback(() => {
    setPhase("setup");
    setSelectedLanguage(null);
    setSessionId(null);
    setSessionDuration(0);
    setSessionMessages([]);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {phase === "setup" && (
        <SetupPhase key="setup" onStart={handleStart} />
      )}

      {phase === "active" && selectedLanguage && (
        <ActivePhaseWrapper
          key="active"
          language={selectedLanguage}
          sessionId={sessionId}
          onEnd={handleEnd}
        />
      )}

      {phase === "summary" && selectedLanguage && (
        <SummaryPhase
          key="summary"
          language={selectedLanguage}
          durationSeconds={sessionDuration}
          messages={sessionMessages}
          onReset={handleReset}
        />
      )}
    </AnimatePresence>
  );
}

// Wrapper to thread messages out of ActivePhase on end
function ActivePhaseWrapper({
  language,
  onEnd,
}: {
  language: SupportedLanguage;
  sessionId: string | null;
  onEnd: (durationSeconds: number, messages: any[]) => void;
}) {
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [showEndConfirm, setShowEndConfirm] = React.useState(false);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Instructions are built client-side so language name is injected without
  // a server round-trip. Voice and instructions live here, NOT in the token
  // endpoint — openaiRealtimeToken only configures the model server-side.
  const instructions = React.useMemo(
    () => buildInterpreterPrompt(language.name),
    [language.name],
  );

  const chat = useRealtimeChat({
    getToken: () => getInterpreterToken(),
    adapter: openaiRealtime(),
    instructions,
    voice: "alloy",
    vadMode: "server",
  });

  const {
    status,
    mode,
    messages,
    pendingAssistantTranscript,
    pendingUserTranscript,
    outputLevel,
    inputLevel,
    connect,
    disconnect,
    sendText,
  } = chat;

  const connectRef = React.useRef(connect);
  const disconnectRef = React.useRef(disconnect);
  connectRef.current = connect;
  disconnectRef.current = disconnect;

  React.useEffect(() => {
    connectRef.current();
    return () => {
      disconnectRef.current();
    };
  }, []);

  const handleEndConfirmed = React.useCallback(() => {
    setShowEndConfirm(false);
    disconnect();
    onEnd(elapsedSeconds, messages);
  }, [disconnect, onEnd, elapsedSeconds, messages]);

  const handleRetry = React.useCallback(() => {
    connect();
  }, [connect]);

  const handleTemplateTap = React.useCallback(
    (phrase: string) => {
      sendText(`[TEMPLATE] Say this in ${language.name}: "${phrase}"`);
    },
    [sendText, language.name],
  );

  const lastAssistantText = React.useMemo(() => {
    if (pendingAssistantTranscript) return pendingAssistantTranscript;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        const parts = msg.parts ?? [];
        for (const p of parts) {
          const text = (p as any).transcript || (p as any).content;
          if (text) return text;
        }
      }
    }
    return "";
  }, [messages, pendingAssistantTranscript]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.3 0.06 220 / 0.15) 0%, transparent 60%), #09090b",
      }}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{language.flag}</span>
          <div>
            <p className="text-sm font-semibold text-zinc-100">{language.name}</p>
            <p className="text-xs text-zinc-500">{language.nativeName}</p>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border",
              status === "connected"
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : status === "connecting"
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                  : status === "error"
                    ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-500",
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === "connected"
                  ? "bg-emerald-400 animate-pulse"
                  : status === "connecting"
                    ? "bg-amber-400 animate-pulse"
                    : status === "error"
                      ? "bg-rose-400"
                      : "bg-zinc-600",
              )}
            />
            {status === "connected"
              ? "Live"
              : status === "connecting"
                ? "Connecting…"
                : status === "error"
                  ? "Error"
                  : "Idle"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm font-mono tabular-nums">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowEndConfirm(true)}
            className="h-9 px-4 gap-2 bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            End Session
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 pb-4">
        {/* Error state with retry */}
        {status === "error" ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
              <MicOff className="w-8 h-8 text-rose-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-100 mb-2">
                Connection failed
              </p>
              <p className="text-sm text-zinc-500 max-w-sm">
                Unable to connect to the interpreter. Check your internet
                connection and try again.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Connection
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEndConfirmed}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Exit
              </Button>
            </div>
          </div>
        ) : (
          <>
            <AudioOrb
              outputLevel={outputLevel ?? 0}
              inputLevel={inputLevel ?? 0}
              mode={mode ?? "idle"}
            />

            <div
              className="w-full max-w-lg min-h-[80px] flex flex-col gap-2 text-center px-4"
              aria-live="polite"
              aria-label="Interpretation output"
            >
              {lastAssistantText ? (
                <motion.p
                  key={lastAssistantText.slice(0, 40)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-lg text-zinc-100 leading-relaxed"
                  style={{ fontFamily: "'Lora', Georgia, serif" }}
                >
                  {lastAssistantText}
                </motion.p>
              ) : (
                <p className="text-zinc-600 text-sm">
                  {status === "connecting"
                    ? "Connecting to interpreter…"
                    : status === "connected"
                      ? "Speak to begin interpreting…"
                      : "Awaiting connection…"}
                </p>
              )}

              {pendingUserTranscript && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-zinc-500 italic"
                >
                  You: {pendingUserTranscript}
                </motion.p>
              )}
            </div>

            <div className="flex items-center gap-2 h-8">
              <AnimatePresence>
                {(mode === "speaking" || mode === "listening" || mode === "thinking") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                      mode === "speaking"
                        ? "bg-sky-500/10 text-sky-400"
                        : mode === "listening"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-zinc-800 text-zinc-400",
                    )}
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full animate-pulse",
                        mode === "speaking"
                          ? "bg-sky-400"
                          : mode === "listening"
                            ? "bg-emerald-400"
                            : "bg-zinc-500",
                      )}
                    />
                    {mode === "speaking"
                      ? "Interpreter speaking"
                      : mode === "listening"
                        ? "Listening…"
                        : "Processing…"}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      {/* Template Strip — only show when connected */}
      {status === "connected" && (
        <div className="border-t border-zinc-800/60 bg-zinc-900/80 py-3">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-4 mb-2">
            Quick Phrases
          </p>
          <TemplateStrip languageName={language.name} onTap={handleTemplateTap} />
        </div>
      )}

      {/* End Session Confirmation Overlay */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6 max-w-sm mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                End interpretation session?
              </h3>
              <p className="text-sm text-zinc-400 mb-6">
                The voice connection will be closed. You can review the session
                summary afterwards.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEndConfirm(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Continue Session
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndConfirmed}
                  className="gap-2"
                >
                  <PhoneOff className="w-3.5 h-3.5" />
                  End Session
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
