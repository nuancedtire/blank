import * as React from "react";
import { useMutation as useConvexRawMutation } from "convex/react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { SearchScopeOption } from "@/components/ui/radiant-input";

interface AgentChatProps {
  initialQuery: string;
  initialSearchScope?: SearchScopeOption;
  onClose: () => void;
}

function searchScopeLabel(scope: SearchScopeOption): string {
  switch (scope) {
    case "local":
      return "Local only";
    case "external_all":
      return "NICE + RCEM";
    case "external_nice":
      return "NICE only";
    case "external_rcem":
      return "RCEM only";
    default:
      return "All sources";
  }
}

export function AgentChat({
  initialQuery,
  initialSearchScope = "all",
  onClose,
}: AgentChatProps) {
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const sentInitialRef = React.useRef(false);

  // Create thread mutation
  const createThread = useConvexRawMutation(api.agentActions.createAgentThread);

  // Send message mutation with optimistic update
  const sendMessage = useConvexRawMutation(
    api.agentActions.sendMessage,
  ).withOptimisticUpdate(
    optimisticallySendMessage(api.agentActions.listThreadMessages),
  );

  // Fetch messages with streaming
  const messages = useUIMessages(
    api.agentActions.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true },
  );

  // Create thread & send initial query
  React.useEffect(() => {
    if (sentInitialRef.current || !initialQuery.trim()) return;
    sentInitialRef.current = true;

    (async () => {
      setIsCreating(true);
      try {
        const { threadId: newThreadId } = await createThread({});
        setThreadId(newThreadId);
        await sendMessage({
          threadId: newThreadId,
          prompt: initialQuery.trim(),
          searchScope: initialSearchScope,
        });
      } catch (e) {
        console.error("Failed to create thread:", e);
      } finally {
        setIsCreating(false);
      }
    })();
  }, [initialQuery, initialSearchScope, createThread, sendMessage]);

  // Auto-scroll on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.results]);

  const handleSend = async () => {
    if (!inputValue.trim() || !threadId) return;
    const prompt = inputValue.trim();
    setInputValue("");
    try {
      await sendMessage({
        threadId,
        prompt,
        searchScope: initialSearchScope,
      });
    } catch (e) {
      console.error("Failed to send:", e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading =
    isCreating || messages.status === "LoadingFirstPage";

  // Check if agent is currently generating (any message is streaming)
  const isAgentThinking = messages.results.some(
    (m) => m.status === "streaming",
  );

  return (
    <div className="flex flex-col border rounded-2xl bg-card shadow-[var(--clay-shadow-md)] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold">Guidelines Agent</p>
            <p className="text-[10px] text-muted-foreground">
              {isAgentThinking
                ? "Searching & analysing guidelines..."
                : `Ask about any clinical guideline · ${searchScopeLabel(initialSearchScope)}`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-full"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh] min-h-[200px]"
      >
        {isLoading && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Starting conversation...</span>
          </div>
        )}

        {messages.results.map((msg) => (
          <MessageBubble key={msg.key} message={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up question..."
            className="flex-1 resize-none rounded-xl border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={!threadId}
          />
          <Button
            size="sm"
            className="h-10 w-10 p-0 rounded-xl shrink-0"
            onClick={handleSend}
            disabled={!inputValue.trim() || !threadId}
          >
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  const textParts = message.parts?.filter(
    (p): p is { type: "text"; text: string } => p.type === "text",
  );
  const toolParts = message.parts?.filter(
    (p): p is Extract<(typeof message.parts)[number], { type: "tool-invocation" }> =>
      p.type === "tool-invocation",
  );

  const fullText = textParts?.map((t) => t.text).join("") ?? "";
  const displayText = isUser ? sanitizeUserPrompt(fullText) : fullText;
  const isStreaming = message.status === "streaming";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] space-y-2",
          isUser
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5"
            : "",
        )}
      >
        {/* Tool invocations — show as thinking steps */}
        {toolParts?.map((tp, i) => (
          <ToolCallChip key={i} invocation={(tp as any).toolInvocation} />
        ))}

        {/* Text content with smooth streaming */}
        {displayText ? (
          <StreamingText text={displayText} isStreaming={isStreaming} isUser={isUser} />
        ) : (
          /* Streaming but no text yet — pulsing dots */
          isStreaming &&
          !toolParts?.length && (
            <PulsingDots />
          )
        )}
      </div>

      {isUser && (
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

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

// ─── Streaming text with smooth reveal ─────────────────────────────────────

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
          // Render source cards for lines matching the citation format
          p: ({ children, ...props }) => {
            const text = extractText(children);
            // Match: 📄 **Title** — Source: xxx — File: yyy — Slug: zzz
            const sourceMatch = text?.match(
              /\u{1F4C4}\s*\*?\*?(.+?)\*?\*?\s*[\u2014—-]+\s*Source:\s*(\w+)\s*[\u2014—-]+\s*File:\s*([\w.-]+)(?:\s*[\u2014—-]+\s*Slug:\s*([\w-]+))?/u,
            );
            if (sourceMatch) {
              return (
                <SourceCard
                  title={sourceMatch[1].trim()}
                  source={sourceMatch[2]}
                  fileName={sourceMatch[3]}
                  slug={sourceMatch[4] || null}
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

/** Recursively extract plain text from React children */
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

// ─── Tool call chip ────────────────────────────────────────────────────────

function ToolCallChip({
  invocation,
}: {
  invocation: {
    toolName: string;
    state: string;
    args?: Record<string, unknown>;
  };
}) {
  const isRunning =
    invocation.state === "call" || invocation.state === "partial-call";
  const query =
    (invocation.args as Record<string, string>)?.query ?? "guidelines";

  let icon = <Sparkles className="h-3 w-3" />;
  let label = invocation.toolName;

  if (invocation.toolName === "ragSearch") {
    icon = isRunning ? (
      <Loader2 className="h-3 w-3 animate-spin" />
    ) : (
      <BookOpen className="h-3 w-3" />
    );
    label = `RAG: "${query}"`;
  } else if (invocation.toolName === "searchGuidelines") {
    icon = isRunning ? (
      <Loader2 className="h-3 w-3 animate-spin" />
    ) : (
      <Search className="h-3 w-3" />
    );
    label = `Search: "${query}"`;
  } else if (invocation.toolName === "searchExternalWeb") {
    icon = isRunning ? (
      <Loader2 className="h-3 w-3 animate-spin" />
    ) : (
      <Search className="h-3 w-3" />
    );
    label = `External: "${query}"`;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 transition-colors",
        isRunning
          ? "bg-primary/10 text-primary border border-primary/20"
          : "bg-muted/50 text-muted-foreground",
      )}
    >
      {icon}
      <span className="truncate max-w-[250px]">{label}</span>
    </div>
  );
}

// ─── Pulsing dots ──────────────────────────────────────────────────────────

function PulsingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
      <span
        className="w-2 h-2 rounded-full bg-primary/40 animate-pulse"
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className="w-2 h-2 rounded-full bg-primary/20 animate-pulse"
        style={{ animationDelay: "0.4s" }}
      />
    </div>
  );
}


// ─── Source card ───────────────────────────────────────────────────────────

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
  return (
    <Link
      to={slug ? "/guideline/$slug" : "/browse"}
      {...(slug ? { params: { slug } } : {})}
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
  );
}
