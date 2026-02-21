import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { GuidelineContent } from "@/components/guidelines/guideline-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Star,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Download,
  Eye,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/guideline/$slug")({
  component: GuidelineDetailPage,
});

function GuidelineDetailPage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = React.useState<"pdf" | "text">("pdf");

  const { data: guideline, isLoading } = useQuery(
    convexQuery(api.guidelines.getBySlug, { slug }),
  );

  const { data: currentUser } = useQuery(convexQuery(api.users.me, {}));

  // Get file URL if this guideline has an associated PDF
  const storageId = (guideline as any)?.storageId;
  const { data: fileUrl } = useQuery(
    convexQuery(api.documents.getFileUrl, {
      storageId: storageId ?? undefined,
    }),
  );

  const hasPdf = !!storageId && !!fileUrl;

  const togglePin = useConvexMutation(api.users.togglePin);
  const pinMutation = useMutation({
    mutationFn: () => togglePin({ guidelineId: (guideline as any)?._id }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.users.me, {}).queryKey,
      });
    },
  });

  const submitFeedback = useConvexMutation(api.auditLog.submitFeedback);
  const feedbackMutation = useMutation({
    mutationFn: (wasHelpful: boolean) =>
      submitFeedback({
        query: slug,
        guidelineId: (guideline as any)?._id,
        wasHelpful,
      }),
  });

  const pinnedIds =
    currentUser && currentUser._id
      ? ((currentUser as any).pinnedGuidelines ?? []).map(String)
      : [];
  const isPinned = guideline
    ? pinnedIds.includes(String((guideline as any)._id))
    : false;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3 animate-pulse" />
        <p className="text-muted-foreground">Loading guideline...</p>
      </div>
    );
  }

  if (!guideline) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground mb-2">Guideline not found</p>
        <Link to="/search">
          <Button variant="outline" size="sm">
            Back to search
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with back button and actions */}
      <div className="flex items-center justify-between">
        <Link to="/search">
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {hasPdf && (
            <>
              {/* Toggle between PDF and text view */}
              <div className="flex items-center rounded-lg border bg-muted p-0.5">
                <button
                  onClick={() => setViewMode("pdf")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "pdf"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Eye className="h-3 w-3" />
                  PDF
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === "text"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <FileCode className="h-3 w-3" />
                  Text
                </button>
              </div>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </a>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1"
            onClick={() => pinMutation.mutate()}
          >
            <Star
              className={
                isPinned ? "h-4 w-4 fill-yellow-400 text-yellow-400" : "h-4 w-4"
              }
            />
            {isPinned ? "Pinned" : "Pin"}
          </Button>
        </div>
      </div>

      {/* Guideline metadata header */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            guideline.source === "local"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {guideline.source === "local" ? "LOCAL" : "LEGACY"}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {guideline.category}
        </Badge>
        <span className="text-xs text-muted-foreground">
          v{guideline.version} · Updated{" "}
          {new Date(guideline.lastUpdated).toLocaleDateString("en-GB")}
        </span>
      </div>

      {/* Content: PDF viewer or extracted text */}
      {hasPdf && viewMode === "pdf" ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="bg-muted/50 px-4 py-2 border-b">
            <h1 className="text-lg font-bold">{guideline.title}</h1>
          </div>
          <iframe
            src={fileUrl}
            className="w-full border-0"
            style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}
            title={guideline.title}
          />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <GuidelineContent
            title={guideline.title}
            content={guideline.content}
            version={guideline.version}
            source={guideline.source}
            category={guideline.category}
            lastUpdated={guideline.lastUpdated}
          />
        </div>
      )}

      {/* Feedback */}
      <div className="flex items-center justify-center gap-3 py-4">
        <span className="text-sm text-muted-foreground">
          Was this guideline helpful?
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={() => feedbackMutation.mutate(true)}
          disabled={feedbackMutation.isSuccess}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          Yes
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1"
          onClick={() => feedbackMutation.mutate(false)}
          disabled={feedbackMutation.isSuccess}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          No
        </Button>
        {feedbackMutation.isSuccess && (
          <span className="text-xs text-muted-foreground">
            Thanks for your feedback
          </span>
        )}
      </div>
    </div>
  );
}
