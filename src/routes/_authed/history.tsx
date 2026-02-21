import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation as useConvexRawMutation, useQuery as useConvexRawQuery } from "convex/react";
import { api } from "convex/_generated/api";
import {
  History,
  Search,
  Pencil,
  Trash2,
  RotateCcw,
  Check,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const [filter, setFilter] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [titleDraft, setTitleDraft] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const threads = useConvexRawQuery(api.agentActions.listMyThreads, {
    limit: 250,
    includeArchived: true,
  });
  const renameThread = useConvexRawMutation(api.agentActions.renameThread);
  const deleteThread = useConvexRawMutation(api.agentActions.deleteThread);
  const restoreThread = useConvexRawMutation(api.agentActions.restoreThread);

  const filteredThreads = React.useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return threads ?? [];
    return (threads ?? []).filter((thread) => {
      const title = (thread.title ?? "").toLowerCase();
      const summary = (thread.summary ?? "").toLowerCase();
      return title.includes(q) || summary.includes(q);
    });
  }, [threads, filter]);

  const startRename = (thread: { _id: string; title?: string }) => {
    setEditingId(thread._id);
    setTitleDraft(thread.title ?? "");
  };

  const saveRename = async () => {
    if (!editingId) return;
    try {
      setBusyId(editingId);
      await renameThread({
        threadId: editingId,
        title: titleDraft.trim() || "Untitled conversation",
      });
      setEditingId(null);
      setTitleDraft("");
    } finally {
      setBusyId(null);
    }
  };

  const archive = async (threadId: string) => {
    if (!window.confirm("Delete this conversation from active history?")) return;
    try {
      setBusyId(threadId);
      await deleteThread({ threadId });
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (threadId: string) => {
    try {
      setBusyId(threadId);
      await restoreThread({ threadId });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="w-7 h-7 text-primary" />
            Full Conversation History
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Open previous conversations, rename them, or remove them from active history.
          </p>
        </div>
        <Link
          to="/search"
          search={{ threadId: undefined }}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/60"
        >
          <Search className="h-4 w-4" />
          Back to Search
        </Link>
      </div>

      <Card className="p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title or summary..."
            className="w-full h-10 rounded-lg border bg-background pl-9 pr-3 text-sm"
          />
        </div>
      </Card>

      <div className="space-y-3">
        {threads === undefined && (
          <Card className="p-5 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading conversation history...
          </Card>
        )}

        {threads !== undefined && filteredThreads.length === 0 && (
          <Card className="p-8 text-center">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
            <p className="text-sm text-muted-foreground">No conversations found.</p>
          </Card>
        )}

        {filteredThreads.map((thread) => {
          const isArchived = thread.status === "archived";
          const isBusy = busyId === thread._id;
          const isEditing = editingId === thread._id;

          return (
            <Card
              key={thread._id}
              className={cn(
                "p-4 transition-colors",
                isArchived && "opacity-80 bg-muted/20",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void saveRename();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-9 rounded-lg border bg-background px-2 text-sm w-full max-w-lg"
                      />
                      <Button size="sm" onClick={() => void saveRename()} disabled={isBusy}>
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="font-semibold truncate">
                      {thread.title ?? "Untitled conversation"}
                    </p>
                  )}
                  <p className="text-xs leading-5 text-muted-foreground mt-1 line-clamp-2">
                    {thread.summary ?? "No summary yet"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {new Date(thread._creationTime).toLocaleString("en-GB")} ·{" "}
                    {isArchived ? "Archived" : "Active"}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to="/search"
                    search={{ threadId: thread._id }}
                    className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted/60"
                  >
                    Open
                  </Link>
                  {!isArchived && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0"
                        onClick={() => startRename(thread)}
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                        onClick={() => void archive(thread._id)}
                        disabled={isBusy}
                        title="Delete"
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                  {isArchived && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0"
                      onClick={() => void restore(thread._id)}
                      disabled={isBusy}
                      title="Restore"
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
