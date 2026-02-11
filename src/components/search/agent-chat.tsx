import * as React from "react";
import { useConvex } from "convex/react";
import { useUIMessages } from "@convex-dev/agent/react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AgentChatProps {
  initialQuery: string;
  onClose: () => void;
}

export function AgentChat({ initialQuery, onClose }: AgentChatProps) {
  const convex = useConvex();
  const [threadId, setThreadId] = React.useState<string | null>(null);
  const [isCreatingThread, setIsCreatingThread] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const sentInitialRef = React.useRef(false);

  // Fetch messages with streaming support
  const messages = useUIMessages(
    api.agentActions.listThreadMessages,
    threadId ? { threadId } : "skip",
    { initialNumItems: 50, stream: true },
  );

  // Create thread & send initial query on mount
  React.useEffect(() => {
    if (sentInitialRef.current || !initialQuery.trim()) return;
    sentInitialRef.current = true;

    (async () => {
      setIsCreatingThread(true);
      try {
        const { threadId: newThreadId } = await convex.action(
          api.agentActions.createAgentThread,
          {},
        );
        setThreadId(newThreadId);
        setIsSending(true);
        // Fire and forget - streaming will show results
        convex
          .action(api.agentActions.sendMessage, {
            threadId: newThreadId,
            prompt: initialQuery.trim(),
          })
          .finally(() => setIsSending(false));
      } catch (e) {
        console.error("Failed to create thread:", e);
      } finally {
        setIsCreatingThread(false);
      }
    })();
  }, [initialQuery, convex]);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.results]);

  const handleSend = async () => {
    if (!inputValue.trim() || !threadId || isSending) return;

    const prompt = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      await convex.action(api.agentActions.sendMessage, {
        threadId,
        prompt,
      });
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLoading =
    isCreatingThread ||
    messages.status === "LoadingFirstPage" ||
    (isSending && messages.results.length === 0);

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
              Searching guidelines for you
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
            <span className="text-sm">Searching guidelines...</span>
          </div>
        )}

        {messages.results.map((msg) => {
          const isUser = msg.role === "user";
          const textPart = msg.parts?.find(
            (p: { type: string }) => p.type === "text",
          ) as { type: "text"; text: string } | undefined;
          const toolParts = msg.parts?.filter(
            (p: { type: string }) => p.type === "tool-invocation",
          ) as unknown as Array<{
            type: "tool-invocation";
            toolInvocation: {
              toolName: string;
              state: string;
              args?: Record<string, unknown>;
            };
          }>;

          return (
            <div
              key={msg.order + "-" + msg.stepOrder}
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
                {/* Tool invocations */}
                {toolParts?.map((tp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5"
                  >
                    {tp.toolInvocation.state === "call" ||
                    tp.toolInvocation.state === "partial-call" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span>
                      {tp.toolInvocation.toolName === "searchGuidelines"
                        ? `Searching: ${(tp.toolInvocation.args as Record<string, string>)?.query ?? "guidelines"}`
                        : tp.toolInvocation.toolName === "ragSearch"
                          ? `RAG search: ${(tp.toolInvocation.args as Record<string, string>)?.query ?? "documents"}`
                          : tp.toolInvocation.toolName}
                    </span>
                  </div>
                ))}

                {/* Text content */}
                {textPart?.text && (
                  <div
                    className={cn(
                      "text-sm leading-relaxed whitespace-pre-wrap",
                      !isUser && "prose prose-sm dark:prose-invert max-w-none",
                    )}
                  >
                    {formatMarkdownLight(textPart.text)}
                  </div>
                )}

                {/* Streaming indicator */}
                {!isUser &&
                  (msg as { status?: string }).status === "streaming" &&
                  !textPart?.text && (
                    <div className="flex items-center gap-1.5">
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
                  )}
              </div>
              {isUser && (
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
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
            disabled={!threadId || isSending}
          />
          <Button
            size="sm"
            className="h-10 w-10 p-0 rounded-xl shrink-0"
            onClick={handleSend}
            disabled={!inputValue.trim() || !threadId || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CornerDownLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// Lightweight markdown-ish formatting for agent responses
function formatMarkdownLight(text: string): React.ReactNode {
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((p, i) => {
    // Headers
    if (p.startsWith("### ")) {
      return (
        <h4 key={i} className="font-bold text-sm mt-3 mb-1">
          {p.slice(4)}
        </h4>
      );
    }
    if (p.startsWith("## ")) {
      return (
        <h3 key={i} className="font-bold text-base mt-3 mb-1">
          {p.slice(3)}
        </h3>
      );
    }
    if (p.startsWith("# ")) {
      return (
        <h2 key={i} className="font-extrabold text-lg mt-3 mb-1">
          {p.slice(2)}
        </h2>
      );
    }

    // Source citation blocks (📄 **Title** — Source: xxx — File: yyy)
    if (p.includes("\ud83d\udcc4") || p.match(/\*\*Source\*\*:/)) {
      const lines = p.split(/\n/).filter(Boolean);
      return (
        <div key={i} className="space-y-1.5 my-2">
          {lines.map((line, j) => {
            const sourceCard = renderSourceCard(line);
            if (sourceCard) return <React.Fragment key={j}>{sourceCard}</React.Fragment>;
            return (
              <p key={j} className="text-sm">
                {formatInline(line)}
              </p>
            );
          })}
        </div>
      );
    }

    // List items
    if (p.match(/^[-*\u2022]\s/m)) {
      const items = p.split(/\n/).filter(Boolean);
      return (
        <ul key={i} className="list-disc list-inside space-y-0.5 my-1">
          {items.map((item, j) => (
            <li key={j} className="text-sm">
              {formatInline(item.replace(/^[-*\u2022]\s*/, ""))}
            </li>
          ))}
        </ul>
      );
    }

    // Numbered lists
    if (p.match(/^\d+\.\s/m)) {
      const items = p.split(/\n/).filter(Boolean);
      return (
        <ol key={i} className="list-decimal list-inside space-y-0.5 my-1">
          {items.map((item, j) => (
            <li key={j} className="text-sm">
              {formatInline(item.replace(/^\d+\.\s*/, ""))}
            </li>
          ))}
        </ol>
      );
    }

    return (
      <p key={i} className="my-1">
        {formatInline(p)}
      </p>
    );
  });
}

// Render a source citation line as a clickable card
function renderSourceCard(line: string): React.ReactNode | null {
  // Match patterns like: 📄 **Title** — Source: local — File: something.pdf
  // or: **Source**: Title (Source: local, File: something.pdf)
  const pdfMatch = line.match(
    /(?:\ud83d\udcc4\s*)?\*\*(.+?)\*\*.*?(?:Source:|source:)\s*(\w+).*?(?:File:|file:)\s*([\w.-]+)/i,
  );
  if (!pdfMatch) return null;

  const [, title, source, fileName] = pdfMatch;

  return (
    <Link
      to="/browse"
      className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors group no-underline"
    >
      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {source.toUpperCase()} · {fileName}
        </p>
      </div>
    </Link>
  );
}

function formatInline(text: string): React.ReactNode {
  // Bold + inline code
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-muted px-1 py-0.5 rounded text-xs font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
