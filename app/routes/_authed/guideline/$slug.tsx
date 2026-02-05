import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { motion } from "framer-motion";
import { api } from "../../../../convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/guideline/$slug")({
  component: GuidelineDetailPage,
});

function GuidelineDetailPage() {
  const { slug } = useParams({ from: "/_authed/guideline/$slug" });
  const queryClient = useQueryClient();

  const { data: guideline } = useSuspenseQuery(
    convexQuery(api.guidelines.getBySlug, { slug })
  );

  const { data: currentUser } = useSuspenseQuery(
    convexQuery(api.users.getCurrentUser, {})
  );

  const togglePinMutation = useConvexMutation(api.users.togglePinnedGuideline);

  const isPinned =
    currentUser?.pinnedGuidelines?.includes(guideline?._id) ?? false;

  const handleTogglePin = async () => {
    if (!currentUser || !guideline) return;

    try {
      await togglePinMutation.mutateAsync({
        userId: currentUser._id,
        guidelineId: guideline._id,
      });
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  if (!guideline) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Guideline not found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            The guideline you're looking for doesn't exist or has been removed.
          </p>
          <div className="mt-6">
            <Link to="/browse">
              <Button variant="outline">Back to Browse</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Back Navigation */}
      <motion.div
        className="mb-4"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          to="/browse/$category"
          params={{ category: guideline.category }}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to {guideline.category}
        </Link>
      </motion.div>

      {/* Header with Pin Button */}
      <motion.div
        className="flex items-start justify-between mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{guideline.title}</h1>
          {guideline.subcategory && (
            <p className="mt-1 text-sm text-gray-600">{guideline.subcategory}</p>
          )}
        </div>
        {currentUser && (
          <Button
            variant={isPinned ? "default" : "outline"}
            size="sm"
            onClick={handleTogglePin}
            className="ml-4 flex-shrink-0"
          >
            <svg
              className={`w-4 h-4 mr-1 ${isPinned ? "fill-current" : ""}`}
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            {isPinned ? "Pinned" : "Pin"}
          </Button>
        )}
      </motion.div>

      {/* Metadata Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Guideline Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Version
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {guideline.version}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(guideline.lastUpdated).toLocaleDateString()}
                </dd>
              </div>
              {guideline.source && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Source
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {guideline.source}
                  </dd>
                </div>
              )}
              {guideline.approvedAt && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Approved
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(guideline.approvedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    guideline.status === "approved"
                      ? "bg-green-100 text-green-800"
                      : guideline.status === "pending_review"
                      ? "bg-yellow-100 text-yellow-800"
                      : guideline.status === "draft"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {guideline.status.replace("_", " ")}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    guideline.offlinePriority === "high"
                      ? "bg-blue-100 text-blue-800"
                      : guideline.offlinePriority === "medium"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {guideline.offlinePriority} priority
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Guideline Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div
                className="whitespace-pre-wrap text-gray-700"
                dangerouslySetInnerHTML={{ __html: guideline.content }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Keywords */}
      {guideline.keywords && guideline.keywords.length > 0 && (
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <h3 className="text-sm font-medium text-gray-500 mb-2">Keywords</h3>
          <div className="flex flex-wrap gap-2">
            {guideline.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* File Attachment */}
      {guideline.fileUrl && (
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardContent className="py-4">
              <a
                href={guideline.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Attached File
              </a>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
