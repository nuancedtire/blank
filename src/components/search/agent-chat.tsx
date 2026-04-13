import * as React from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import {
  useMutation as useConvexRawMutation,
  useQuery as useConvexRawQuery,
} from "convex/react";
import {
  useUIMessages,
  useSmoothText,
  optimisticallySendMessage,
  type UIMessage,
} from "@convex-dev/agent/react";
import { api } from "convex/_generated/api";
import { Link } from "@tanstack/react-router";
import {
  Bot,
  User,
  Loader2,
  CornerDownLeft,
  X,
  Sparkles,
  FileText,
  Search,
  BookOpen,
  Clock3,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Trash2,
  Check,
  History,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SearchScopeOption } from "@/components/ui/radiant-input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface AgentChatProps {
  initialQuery: string;
  initialRequestId?: number;
  initialThreadId?: string | null;
  initialSearchScope?: SearchScopeOption;
  className?: string;
  onClose: () => void;
}

function searchScopeLabel(scope: SearchScopeOption): string {
  switch (scope) {
    case "local":
      return "Local only";
    case "web":
      return "NICE + RCEM";
    default:
      return "Local only";
  }
}

const WAITING_STEPS = [
  "Preparing response plan",
  "Looking up relevant resources",
  "Scanning guideline excerpts",
  "Composing answer",
];

type AssistantFeedbackRecord = {
  _id: string;
  assistantMessageId: string;
  wasHelpful: boolean;
  comment?: string;
};

export function AgentChat({
  initialQuery,
  initialRequestId = 0,
  initialThreadId = null,
  initialSearchScope = "local",
  className,
  onClose,
}: AgentChatProps) {
  const [threadId, setThreadId] = React.useState<string | null>(initialThreadId);
  const [historyCollapsed, setHistoryCollapsed] = React.useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [activeStep, setActiveStep] = React.useState(0);
  const [pendingAssistantTarget, setPendingAssistantTarget] = React.useState<number | null>(
    null,
  );
  const [editingThreadId, setEditingThreadId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState("");
  const [isRenaming, setIsRenaming] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const handledInitialRequestRef = React.useRef(0);

  const startThreadAndSendMessage = useConvexRawMutation(
    api.agentActions.startThreadAndSendMessage,
  );
  const sendFollowup = useConvexRawMutation(api.agentActions.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.agentActions.listThreadMessages),
  );
  const renameThread = useConvexRawMutation(api.agentActions.renameThread);
  const deleteThread = useConvexRawMutation(api.agentActions.deleteThread);
  const feedbackEntries = useConvexRawQuery(
    (api as any).assistantFeedback.listMineForThread,
    threadId ? { threadId } : "skip",
  ) as AssistantFeedbackRecord[] | undefined;
  const recentThreads = useConvexRawQuery(api.agentActions.listMyThreads, {
    limit: 20,
    includeArchived: false,
  });

  const messages = useUIMessages(
    api.agentActions.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 20, stream: true },
  );

  const assistantCount = React.useMemo(
    () => messages.results.filter((m) => m.role === "assistant").length,
    [messages.results],
  );
  const feedbackByMessageId = React.useMemo(
    () =>
      new Map(
        (feedbackEntries ?? []).map((entry) => [entry.assistantMessageId, entry]),
      ),
    [feedbackEntries],
  );
  const isAgentThinking = messages.results.some(
    (m) => m.role === "assistant" && m.status === "streaming",
  );

  React.useEffect(() => {
    setThreadId(initialThreadId ?? null);
  }, [initialThreadId]);

  React.useEffect(() => {
    if (!pendingAssistantTarget) return;
    if (assistantCount >= pendingAssistantTarget && !isAgentThinking) {
      setPendingAssistantTarget(null);
      setActiveStep(0);
    }
  }, [assistantCount, isAgentThinking, pendingAssistantTarget]);

  React.useEffect(() => {
    if (!pendingAssistantTarget) return;
    if (isAgentThinking) return;
    const id = window.setInterval(() => {
      setActiveStep((prev) => (prev + 1) % WAITING_STEPS.length);
    }, 1300);
    return () => window.clearInterval(id);
  }, [pendingAssistantTarget, isAgentThinking]);

  React.useEffect(() => {
    if (!threadId && recentThreads && recentThreads.length > 0 && initialRequestId === 0) {
      setThreadId(recentThreads[0]._id);
    }
  }, [threadId, recentThreads, initialRequestId]);

  React.useEffect(() => {
    if (!threadId || !recentThreads) return;
    const stillExists = recentThreads.some((thread) => thread._id === threadId);
    if (!stillExists) {
      setThreadId(recentThreads[0]?._id ?? null);
    }
  }, [threadId, recentThreads]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.results, pendingAssistantTarget]);

  React.useEffect(() => {
    if (initialRequestId <= 0) return;
    if (initialRequestId <= handledInitialRequestRef.current) return;
    if (!initialQuery.trim()) return;
    handledInitialRequestRef.current = initialRequestId;

    (async () => {
      try {
        const expected = assistantCount + 1;
        setPendingAssistantTarget(expected);

        if (threadId) {
          await sendFollowup({
            threadId,
            prompt: initialQuery.trim(),
            searchScope: initialSearchScope,
          });
          return;
        }

        setIsCreating(true);
        const { threadId: newThreadId } = await startThreadAndSendMessage({
          prompt: initialQuery.trim(),
          searchScope: initialSearchScope,
        });
        setThreadId(newThreadId);
      } catch (e) {
        console.error("Failed to process initial request:", e);
        setPendingAssistantTarget(null);
      } finally {
        setIsCreating(false);
      }
    })();
  }, [
    assistantCount,
    initialQuery,
    initialRequestId,
    initialSearchScope,
    sendFollowup,
    startThreadAndSendMessage,
    threadId,
  ]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const prompt = inputValue.trim();
    setInputValue("");
    try {
      setPendingAssistantTarget(assistantCount + 1);
      if (threadId) {
        await sendFollowup({
          threadId,
          prompt,
          searchScope: initialSearchScope,
        });
      } else {
        setIsCreating(true);
        const { threadId: newThreadId } = await startThreadAndSendMessage({
          prompt,
          searchScope: initialSearchScope,
        });
        setThreadId(newThreadId);
      }
    } catch (e) {
      console.error("Failed to send:", e);
      setPendingAssistantTarget(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const startRename = (thread: { _id: string; title?: string }) => {
    setEditingThreadId(thread._id);
    setEditingTitle(thread.title ?? "");
  };

  const commitRename = async () => {
    if (!editingThreadId) return;
    try {
      setIsRenaming(true);
      await renameThread({
        threadId: editingThreadId,
        title: editingTitle.trim() || "Untitled conversation",
      });
      setEditingThreadId(null);
      setEditingTitle("");
    } catch (e) {
      console.error("Failed to rename thread:", e);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteThread = async (targetThreadId: string) => {
    if (!window.confirm("Delete this conversation from recent history?")) return;
    try {
      await deleteThread({ threadId: targetThreadId });
      if (threadId === targetThreadId) {
        setThreadId(null);
      }
    } catch (e) {
      console.error("Failed to delete thread:", e);
    }
  };

  const selectThread = (id: string) => {
    setThreadId(id);
    setMobileHistoryOpen(false);
  };

  const isLoading = isCreating || messages.status === "LoadingFirstPage";
  const hasPendingNoStream = !!pendingAssistantTarget && !isAgentThinking;

  return (
    <MotionConfig reducedMotion="user">
      <div
        className={cn(
          "grid h-full min-h-0 border rounded-2xl bg-card shadow-[var(--shadow-md)] animate-in slide-in-from-top-2 fade-in duration-300 overflow-hidden",
          historyCollapsed
            ? "md:grid-cols-[72px_minmax(0,1fr)]"
            : "md:grid-cols-[280px_minmax(0,1fr)]",
          className,
        )}
      >
      {/* Desktop sidebar — hidden on mobile, visible on md+ */}
      <aside
        className={cn(
          "relative hidden md:flex flex-col border-r bg-gradient-to-b from-muted/30 to-card min-h-0",
          historyCollapsed ? "overflow-visible z-20" : "overflow-x-hidden",
        )}
      >
        <div className="px-3 py-3 border-b flex items-center justify-between gap-2">
          {historyCollapsed ? (
            <span className="h-6 w-6 rounded-md bg-muted/70 flex items-center justify-center text-muted-foreground">
              <MessagesSquare className="h-3.5 w-3.5" />
            </span>
          ) : (
            <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <MessagesSquare className="h-3.5 w-3.5" />
              Recent Conversations
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setHistoryCollapsed((prev) => !prev)}
            title={historyCollapsed ? "Expand history" : "Collapse history"}
          >
            {historyCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {historyCollapsed ? (
          <div className="flex-1 flex flex-col justify-between py-3">
            <div className="px-2 space-y-2">
              {(recentThreads ?? []).slice(0, 6).map((thread) => (
                <div key={thread._id} className="group relative w-9 mx-auto">
                  <button
                    type="button"
                    className={cn(
                      "w-9 h-9 rounded-full border text-[11px] font-semibold transition-colors shadow-sm block",
                      threadId === thread._id
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-card/90 border-border text-muted-foreground hover:bg-muted",
                    )}
                    title={thread.title ?? "Untitled conversation"}
                    onClick={() => setThreadId(thread._id)}
                  >
                    {(thread.title ?? "C").slice(0, 1).toUpperCase()}
                  </button>
                  <div className="pointer-events-none absolute top-1/2 left-full ml-2 -translate-y-1/2 z-40 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-180">
                    <div className="w-56 rounded-lg border bg-card/95 backdrop-blur px-2.5 py-2 shadow-lg">
                      <p className="text-xs font-semibold truncate">
                        {thread.title ?? "Untitled conversation"}
                      </p>
                      <p className="text-[11px] leading-4 text-muted-foreground line-clamp-2 mt-0.5">
                        {thread.summary ?? "No summary yet"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!!recentThreads?.length && recentThreads.length > 6 && (
                <div className="w-9 h-6 mx-auto rounded-full bg-muted/70 text-[10px] text-muted-foreground flex items-center justify-center">
                  +{recentThreads.length - 6}
                </div>
              )}
            </div>

            <div className="px-2 pt-3 border-t">
              <Link
                to="/history"
                className="w-9 h-9 mx-auto rounded-full border border-border bg-card hover:bg-muted/60 flex items-center justify-center text-muted-foreground"
                title="Open full history"
              >
                <History className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 space-y-1.5">
              {(recentThreads ?? []).map((thread) => {
                const isActive = threadId === thread._id;
                const isEditing = editingThreadId === thread._id;
                return (
                  <ThreadItem
                    key={thread._id}
                    thread={thread}
                    isActive={isActive}
                    isEditing={isEditing}
                    editingTitle={editingTitle}
                    isRenaming={isRenaming}
                    onSelect={() => setThreadId(thread._id)}
                    onStartRename={() => startRename(thread)}
                    onCommitRename={() => void commitRename()}
                    onEditingTitleChange={setEditingTitle}
                    onCancelRename={() => {
                      setEditingThreadId(null);
                      setEditingTitle("");
                    }}
                    onDelete={() => void handleDeleteThread(thread._id)}
                  />
                );
              })}
              {!recentThreads?.length && (
                <p className="text-xs text-muted-foreground px-2 py-3">
                  No history yet.
                </p>
              )}
            </div>
            <div className="border-t p-2">
              <Link
                to="/history"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60"
              >
                <History className="h-3.5 w-3.5" />
                View Full History
              </Link>
            </div>
          </>
        )}
      </aside>

      {/* Mobile history drawer */}
      <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-[300px] p-0 flex flex-col">
          <SheetHeader className="px-3 py-3 border-b">
            <SheetTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2 font-normal">
              <MessagesSquare className="h-3.5 w-3.5" />
              Recent Conversations
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
            {(recentThreads ?? []).map((thread) => {
              const isActive = threadId === thread._id;
              const isEditing = editingThreadId === thread._id;
              return (
                <ThreadItem
                  key={thread._id}
                  thread={thread}
                  isActive={isActive}
                  isEditing={isEditing}
                  editingTitle={editingTitle}
                  isRenaming={isRenaming}
                  onSelect={() => selectThread(thread._id)}
                  onStartRename={() => startRename(thread)}
                  onCommitRename={() => void commitRename()}
                  onEditingTitleChange={setEditingTitle}
                  onCancelRename={() => {
                    setEditingThreadId(null);
                    setEditingTitle("");
                  }}
                  onDelete={() => void handleDeleteThread(thread._id)}
                />
              );
            })}
            {!recentThreads?.length && (
              <p className="text-xs text-muted-foreground px-2 py-3">
                No history yet.
              </p>
            )}
          </div>
          <div className="border-t p-2">
            <Link
              to="/history"
              onClick={() => setMobileHistoryOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted/60"
            >
              <History className="h-3.5 w-3.5" />
              View Full History
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main chat area */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center justify-between px-3 md:px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile: history button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-full md:hidden shrink-0"
              onClick={() => setMobileHistoryOpen(true)}
              title="Conversation history"
            >
              <MessagesSquare className="h-4 w-4" />
            </Button>

            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Guidelines Agent</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {isAgentThinking
                  ? "Actively reasoning with tools..."
                  : `Ask about any guideline · ${searchScopeLabel(initialSearchScope)}`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-full shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto p-3 md:p-5 space-y-4"
        >
          {isLoading && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Starting conversation...</span>
            </div>
          )}

          {!threadId && !isLoading && (
            <div className="text-sm text-muted-foreground border border-dashed rounded-xl px-4 py-3">
              Select a conversation from history or send a new prompt.
            </div>
          )}

            <AnimatePresence initial={false}>
              {messages.results.map((msg) => (
                <MessageBubble
                  key={msg.key}
                  message={msg}
                  threadId={threadId}
                  feedback={feedbackByMessageId.get(String(msg.key))}
                />
              ))}
            </AnimatePresence>

          <AnimatePresence>
            {hasPendingNoStream && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="flex gap-3"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border bg-muted/25 px-4 py-3 space-y-2">
                  <div className="inline-flex items-center gap-2 text-xs rounded-lg px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 overflow-hidden">
                    <Clock3 className="h-3 w-3 shrink-0" />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={activeStep}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.18 }}
                      >
                        {WAITING_STEPS[activeStep]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <PulsingDots />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up question..."
              className="flex-1 resize-none rounded-xl border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px] max-h-[120px]"
              rows={1}
            />
            <Button
              size="sm"
              className="h-11 w-11 p-0 rounded-xl shrink-0"
              onClick={() => void handleSend()}
              disabled={!inputValue.trim()}
            >
              <CornerDownLeft className="h-4 w-4" />
            </Button>
          </div>
          <p className="hidden sm:block text-[10px] text-muted-foreground/50 mt-1.5 px-1">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
      </div>
    </MotionConfig>
  );
}

interface ThreadItemProps {
  thread: { _id: string; title?: string; summary?: string };
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  isRenaming: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onEditingTitleChange: (v: string) => void;
  onCancelRename: () => void;
  onDelete: () => void;
}

function ThreadItem({
  thread,
  isActive,
  isEditing,
  editingTitle,
  isRenaming,
  onSelect,
  onStartRename,
  onCommitRename,
  onEditingTitleChange,
  onCancelRename,
  onDelete,
}: ThreadItemProps) {
  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border",
        isActive
          ? "bg-primary/10 border-primary/30"
          : "bg-card/60 border-border hover:bg-muted/60",
      )}
      animate={{
        borderColor: isActive ? "var(--color-primary)" : undefined,
      }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-start gap-1 min-w-0">
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 min-w-0 text-left px-3 py-2.5"
        >
          {isEditing ? (
            <input
              autoFocus
              value={editingTitle}
              onChange={(e) => onEditingTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitRename();
                if (e.key === "Escape") onCancelRename();
              }}
              className="w-full text-sm font-medium bg-background border rounded px-2 py-1"
              placeholder="Conversation title"
            />
          ) : (
            <>
              <p className="text-sm font-medium truncate">
                {thread.title ?? "Untitled conversation"}
              </p>
              <p className="text-[11px] leading-4 text-muted-foreground line-clamp-2 mt-0.5">
                {thread.summary ?? "No summary yet"}
              </p>
            </>
          )}
        </button>
        <div className="flex items-center gap-0.5 p-1.5">
          {isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onCommitRename}
              disabled={isRenaming}
              title="Save name"
            >
              {isRenaming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onStartRename}
              title="Rename conversation"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

type ResponseTransparency = {
  level: "high" | "moderate" | "lower";
  label: string;
  summary: string;
  sourceLabel: string;
  topScore?: number;
};

function getTransparencyTone(level: ResponseTransparency["level"]) {
  switch (level) {
    case "high":
      return {
        badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
        source: "bg-emerald-500/5 text-emerald-700 border-emerald-500/15 dark:text-emerald-300",
      };
    case "moderate":
      return {
        badge: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
        source: "bg-amber-500/5 text-amber-700 border-amber-500/15 dark:text-amber-300",
      };
    default:
      return {
        badge: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300",
        source: "bg-rose-500/5 text-rose-700 border-rose-500/15 dark:text-rose-300",
      };
  }
}

function readConfidence(
  result?: Record<string, unknown>,
): ResponseTransparency | null {
  const confidence = result?.confidence;
  if (!confidence || typeof confidence !== "object") return null;

  const candidate = confidence as {
    level?: ResponseTransparency["level"];
    label?: string;
    summary?: string;
    sourceLabel?: string;
    topScore?: number;
  };
  if (!candidate.level || !candidate.label || !candidate.summary) {
    return null;
  }

  return {
    level: candidate.level,
    label: candidate.label,
    summary: candidate.summary,
    sourceLabel: candidate.sourceLabel ?? "Unverified",
    topScore: candidate.topScore,
  };
}

function getResponseTransparency(
  invocations: Array<{
    toolName: string;
    result?: Record<string, unknown>;
  }>,
): ResponseTransparency {
  const rag = invocations.find(
    (invocation) => invocation.toolName === "ragSearch" && invocation.result?.found,
  );
  const keyword = invocations.find(
    (invocation) =>
      invocation.toolName === "searchGuidelines" && invocation.result?.found,
  );
  const external = invocations.find(
    (invocation) =>
      invocation.toolName === "searchExternalWeb" && invocation.result?.found,
  );

  const ragConfidence = readConfidence(rag?.result);
  const keywordConfidence = readConfidence(keyword?.result);
  const externalConfidence = readConfidence(external?.result);

  if (ragConfidence) {
    return {
      ...ragConfidence,
      sourceLabel: externalConfidence
        ? "Local guidelines + external NICE/RCEM"
        : ragConfidence.sourceLabel,
      summary: externalConfidence
        ? `${ragConfidence.summary} External NICE/RCEM guidance was also consulted.`
        : ragConfidence.summary,
    };
  }

  if (keywordConfidence) {
    return {
      ...keywordConfidence,
      sourceLabel: externalConfidence
        ? "Local guidelines + external NICE/RCEM"
        : keywordConfidence.sourceLabel,
      summary: externalConfidence
        ? `${keywordConfidence.summary} External NICE/RCEM guidance was also consulted.`
        : keywordConfidence.summary,
    };
  }

  if (externalConfidence) {
    return externalConfidence;
  }

  return {
    level: "lower",
    label: "Unverified provenance",
    summary:
      "No structured retrieval evidence was captured for this response. Verify directly against the source guideline.",
    sourceLabel: "Unverified",
  };
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  threadId,
  feedback,
}: {
  message: UIMessage;
  threadId: string | null;
  feedback?: AssistantFeedbackRecord;
}) {
  const isUser = message.role === "user";
  const submitFeedback = useConvexRawMutation((api as any).assistantFeedback.submit);
  const [draftRating, setDraftRating] = React.useState<boolean | null>(null);
  const [draftComment, setDraftComment] = React.useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);

  const textParts = message.parts?.filter(
    (p): p is { type: "text"; text: string } => p.type === "text",
  );
  const toolParts = message.parts?.filter(
    (p): p is Extract<
      (typeof message.parts)[number],
      { type: "tool-invocation" }
    > => p.type === "tool-invocation",
  );

  const fullText = textParts?.map((t) => t.text).join("") ?? "";
  const displayText = isUser ? sanitizeUserPrompt(fullText) : fullText;
  const isStreaming = message.status === "streaming";
  const toolInvocations =
    toolParts?.map((part) => (part as any).toolInvocation).filter(Boolean) ?? [];
  const transparency = !isUser && !isStreaming
    ? getResponseTransparency(toolInvocations)
    : null;

  React.useEffect(() => {
    if (!feedback) return;
    setDraftRating(null);
    setDraftComment(feedback.comment ?? "");
  }, [feedback]);

  const handleSubmitFeedback = async (comment?: string) => {
    if (!threadId || isUser) return;
    try {
      setIsSubmittingFeedback(true);
      await submitFeedback({
        threadId,
        assistantMessageId: String(message.key),
        wasHelpful: draftRating ?? false,
        comment,
      });
      setDraftRating(null);
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <motion.div
      className={cn("flex gap-2 md:gap-3", isUser ? "justify-end" : "justify-start")}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "space-y-2 min-w-0",
          isUser
            ? "max-w-[90%] sm:max-w-[88%] md:max-w-[85%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 md:px-4 py-2.5"
            : "w-full max-w-full sm:max-w-[92%] md:max-w-[85%]",
        )}
      >
        <AnimatePresence initial={false}>
          {toolParts?.map((tp, i) => (
            <ToolCallChip key={i} invocation={(tp as any).toolInvocation} index={i} />
          ))}
        </AnimatePresence>

        {displayText ? (
          <StreamingText
            text={displayText}
            isStreaming={isStreaming}
            isUser={isUser}
          />
        ) : (
          isStreaming && !toolParts?.length && <PulsingDots />
        )}

        {!isUser && !isStreaming && transparency && (
          <ResponseMeta transparency={transparency} />
        )}

        {!isUser && !isStreaming && (
          <ClinicalSafetyDisclaimer />
        )}

        {!isUser && !isStreaming && threadId && (
          <AssistantFeedbackPanel
            feedback={feedback}
            draftRating={draftRating}
            draftComment={draftComment}
            isSubmitting={isSubmittingFeedback}
            onSelectRating={(value) => setDraftRating(value)}
            onCommentChange={setDraftComment}
            onCancel={() => {
              setDraftRating(null);
              setDraftComment(feedback?.comment ?? "");
            }}
            onSubmit={() => void handleSubmitFeedback(draftComment.trim() || undefined)}
            onSkipComment={() => void handleSubmitFeedback(undefined)}
          />
        )}
      </div>

      {isUser && (
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
});

function sanitizeUserPrompt(text: string): string {
  if (!text.startsWith("Search scope preference:")) {
    return text;
  }
  const marker = "\n\nUser question:";
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    return text;
  }
  return text.slice(markerIndex + marker.length).trim();
}

function ResponseMeta({ transparency }: { transparency: ResponseTransparency }) {
  const tone = getTransparencyTone(transparency.level);

  return (
    <div className="rounded-xl border border-border/70 bg-muted/25 px-3 py-2.5 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={tone.badge}>
          <ShieldCheck className="h-3 w-3" />
          {transparency.label}
        </Badge>
        <Badge variant="outline" className={tone.source}>
          {transparency.sourceLabel}
        </Badge>
        {typeof transparency.topScore === "number" && (
          <Badge variant="outline" className="text-muted-foreground">
            Top match {(transparency.topScore * 100).toFixed(0)}%
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{transparency.summary}</p>
    </div>
  );
}

function ClinicalSafetyDisclaimer() {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-foreground/90">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="leading-relaxed">
          <span className="font-semibold">AI-generated response</span>
          {" — "}
          for clinical decision support only. Always verify against the source
          guideline and apply clinical judgement. This tool does not replace
          clinical assessment. Report concerns using the feedback buttons below.
        </p>
      </div>
    </div>
  );
}

function AssistantFeedbackPanel({
  feedback,
  draftRating,
  draftComment,
  isSubmitting,
  onSelectRating,
  onCommentChange,
  onCancel,
  onSubmit,
  onSkipComment,
}: {
  feedback?: AssistantFeedbackRecord;
  draftRating: boolean | null;
  draftComment: string;
  isSubmitting: boolean;
  onSelectRating: (value: boolean) => void;
  onCommentChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onSkipComment: () => void;
}) {
  if (feedback) {
    return (
      <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={feedback.wasHelpful ? "secondary" : "outline"}>
            {feedback.wasHelpful ? (
              <ThumbsUp className="h-3 w-3 text-emerald-600" />
            ) : (
              <ThumbsDown className="h-3 w-3 text-rose-600" />
            )}
            {feedback.wasHelpful ? "Marked helpful" : "Marked not helpful"}
          </Badge>
          <span>Feedback saved for this response.</span>
        </div>
        {feedback.comment && (
          <p className="text-xs text-muted-foreground rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2 whitespace-pre-wrap">
            {feedback.comment}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <p className="text-xs font-medium text-foreground/90">
          Was this response helpful?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={draftRating === true ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onSelectRating(true)}
            disabled={isSubmitting}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            Helpful
          </Button>
          <Button
            type="button"
            variant={draftRating === false ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => onSelectRating(false)}
            disabled={isSubmitting}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            Not helpful
          </Button>
        </div>
      </div>

      {draftRating !== null && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground block">
            What could be improved? Optional.
          </label>
          <Textarea
            value={draftComment}
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="Add optional feedback for evaluation and safety monitoring..."
            className="min-h-[84px] resize-y text-sm bg-background"
            maxLength={2000}
            disabled={isSubmitting}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Submit feedback
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onSkipComment}
              disabled={isSubmitting}
            >
              Save without comment
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StreamingText({
  text,
  isStreaming,
  isUser,
}: {
  text: string;
  isStreaming: boolean;
  isUser: boolean;
}) {
  const [visibleText] = useSmoothText(text, {
    charsPerSec: 420,
    startStreaming: isStreaming,
  });

  if (isUser) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{visibleText}</p>;
  }

  return (
    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:leading-relaxed [&_p]:my-1.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children, ...props }) => {
            const text = extractText(children);
            const sourceMatch = text?.match(
              /\u{1F4C4}\s*\*?\*?(.+?)\*?\*?\s*[\u2014—-]+\s*Source:\s*(\w+)\s*[\u2014—-]+\s*File:\s*(.+?)(?:\s*[\u2014—-]+\s*Slug:\s*([\w-]+))?\s*$/mu,
            );
            if (sourceMatch) {
              return (
                <SourceCard
                  title={sourceMatch[1].trim()}
                  source={sourceMatch[2]}
                  fileName={sourceMatch[3]}
                  slug={
                    sourceMatch[4] &&
                    !["none", "n/a", "unknown", "null", "undefined", "na", "the-slug-value"].includes(
                      sourceMatch[4].toLowerCase(),
                    )
                      ? sourceMatch[4]
                      : null
                  }
                />
              );
            }
            return <p {...props}>{children}</p>;
          },
        }}
      >
        {visibleText}
      </ReactMarkdown>
    </div>
  );
}

function extractText(children: React.ReactNode): string | null {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (React.isValidElement(children)) {
    const props = children.props as Record<string, unknown>;
    if (props.children) {
      return extractText(props.children as React.ReactNode);
    }
  }
  return null;
}

function ToolCallChip({
  invocation,
  index = 0,
}: {
  invocation: {
    toolName: string;
    state: string;
    args?: Record<string, unknown>;
    result?: Record<string, unknown>;
  };
  index?: number;
}) {
  const isRunning = invocation.state === "call" || invocation.state === "partial-call";
  const query = (invocation.args as Record<string, string>)?.query ?? "guidelines";

  let icon = <Sparkles className="h-3 w-3" />;
  let label = invocation.toolName;

  if (invocation.toolName === "ragSearch") {
    icon = isRunning ? (
      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-flex">
        <Loader2 className="h-3 w-3" />
      </motion.span>
    ) : (
      <BookOpen className="h-3 w-3" />
    );
    const sourceFiles = Array.isArray((invocation.result as any)?.sources)
      ? ((invocation.result as any).sources as Array<{ fileName?: string }>)
          .map((s) => s.fileName)
          .filter(Boolean)
          .slice(0, 2)
      : [];
    label = sourceFiles.length > 0 ? `RAG: ${sourceFiles.join(", ")}` : `RAG: "${query}"`;
  } else if (invocation.toolName === "searchGuidelines") {
    icon = isRunning ? (
      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-flex">
        <Loader2 className="h-3 w-3" />
      </motion.span>
    ) : (
      <Search className="h-3 w-3" />
    );
    label = `Local search: "${query}"`;
  } else if (invocation.toolName === "searchExternalWeb") {
    icon = isRunning ? (
      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-flex">
        <Loader2 className="h-3 w-3" />
      </motion.span>
    ) : (
      <Search className="h-3 w-3" />
    );
    label = `Web (Exa): "${query}"`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.88, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 440, damping: 32, delay: index * 0.06 }}
      className={cn(
        "inline-flex items-center gap-2 text-xs rounded-lg px-2.5 md:px-3 py-1.5",
        isRunning
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-muted/50 text-muted-foreground",
      )}
    >
      {icon}
      <span className="truncate max-w-[140px] sm:max-w-[220px] md:max-w-[260px]">{label}</span>
    </motion.div>
  );
}

function PulsingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-primary"
          animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1.1, 0.75] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function SourceCard({
  title,
  source,
  fileName,
  slug,
}: {
  title: string;
  source: string;
  fileName: string;
  slug?: string | null;
}) {
  const lookedUpSlug = useConvexRawQuery(
    api.guidelines.getSlugByTitle,
    !slug ? { title } : "skip",
  );
  const resolvedSlug = slug ?? lookedUpSlug ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
    >
      <Link
        to={resolvedSlug ? "/guideline/$slug" : "/browse"}
        {...(resolvedSlug ? { params: { slug: resolvedSlug } } : {})}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-3 py-2.5 my-1.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors group no-underline"
      >
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
            {title}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {source.toUpperCase()} · {fileName}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
