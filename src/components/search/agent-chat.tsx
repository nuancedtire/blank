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

interface AgentChatProps {
  initialQuery: string;
  onClose: () => void;
}

export function AgentChat({ initialQuery, onClose }: AgentChatProps) {
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
        });
      } catch (e) {
        console.error("Failed to create thread:", e);
      } finally {
        setIsCreating(false);
      }
    })();
  }, [initialQuery, createThread, sendMessage]);

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
      await sendMessage({ threadId, prompt });
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
                : "Ask about any clinical guideline"}
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
        {fullText ? (
          <StreamingText text={fullText} isStreaming={isStreaming} isUser={isUser} />
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
    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
      <MarkdownRenderer text={visibleText} />
    </div>
  );
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

// ─── Markdown renderer ─────────────────────────────────────────────────────

function MarkdownRenderer({ text }: { text: string }) {
  const blocks = React.useMemo(() => parseMarkdown(text), [text]);

  return (
    <>
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} />
      ))}
    </>
  );
}

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "source-card"; title: string; source: string; fileName: string };

function parseMarkdown(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Source citation: 📄 **Title** — Source: xxx — File: yyy
    const sourceMatch = line.match(
      /(?:\u{1F4C4}\s*)?\*\*(.+?)\*\*.*?(?:Source:|source:)\s*(\w+).*?(?:File:|file:)\s*([\w.-]+)/u,
    );
    if (sourceMatch) {
      blocks.push({
        type: "source-card",
        title: sourceMatch[1],
        source: sourceMatch[2],
        fileName: sourceMatch[3],
      });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^\s*[-*•]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*•]\s/)) {
        items.push(lines[i].replace(/^\s*[-*•]\s*/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered list
    if (line.match(/^\s*\d+[.)\s]\s*/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*\d+[.)\s]\s*/)) {
        items.push(lines[i].replace(/^\s*\d+[.)\s]\s*/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph — collect consecutive non-empty lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].match(/^#{1,4}\s/) &&
      !lines[i].match(/^\s*[-*•]\s/) &&
      !lines[i].match(/^\s*\d+[.)\s]\s*/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

function MarkdownBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const Tag = (`h${Math.min(block.level, 4)}` as "h1" | "h2" | "h3" | "h4");
      const sizes = {
        h1: "text-base font-extrabold mt-4 mb-1.5",
        h2: "text-[15px] font-bold mt-3.5 mb-1",
        h3: "text-sm font-bold mt-3 mb-1",
        h4: "text-sm font-semibold mt-2 mb-0.5",
      };
      return (
        <Tag className={sizes[Tag]}>
          <InlineText text={block.text} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="my-1.5 leading-relaxed">
          <InlineText text={block.text} />
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol className="my-1.5 ml-4 space-y-1 list-decimal list-outside">
          {block.items.map((item, j) => (
            <li key={j} className="leading-relaxed pl-1">
              <InlineText text={item} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="my-1.5 ml-4 space-y-1 list-disc list-outside">
          {block.items.map((item, j) => (
            <li key={j} className="leading-relaxed pl-1">
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
    case "source-card":
      return <SourceCard title={block.title} source={block.source} fileName={block.fileName} />;
  }
}

// ─── Source card ───────────────────────────────────────────────────────────

function SourceCard({
  title,
  source,
  fileName,
}: {
  title: string;
  source: string;
  fileName: string;
}) {
  return (
    <Link
      to="/browse"
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

// ─── Inline text with bold / code ──────────────────────────────────────────

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
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
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}
