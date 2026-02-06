import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { GuidelineContent } from "@/components/guidelines/guideline-content";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, FileText } from "lucide-react";

export const Route = createFileRoute("/_authed/guideline/$slug")({
  component: GuidelineDetailPage,
});

function GuidelineDetailPage() {
  const { slug } = Route.useParams();

  const { data: guideline, isLoading } = useQuery(
    convexQuery(api.guidelines.getBySlug, { slug })
  );

  const { data: currentUser } = useQuery(
    convexQuery(api.users.me, {})
  );

  const togglePin = useConvexMutation(api.users.togglePin);
  const pinMutation = useMutation({
    mutationFn: () =>
      togglePin({ guidelineId: (guideline as any)?._id }),
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
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1"
          onClick={() => pinMutation.mutate()}
        >
          <Star
            className={
              isPinned
                ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                : "h-4 w-4"
            }
          />
          {isPinned ? "Pinned" : "Pin"}
        </Button>
      </div>

      {/* Guideline Content */}
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
