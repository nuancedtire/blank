import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { motion } from "framer-motion";
import { api } from "../../../../convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const Route = createFileRoute("/_authed/browse/$category")({
  component: CategoryGuidelinesPage,
});

const categoryDisplayNames: Record<string, string> = {
  resuscitation: "Resuscitation",
  trauma: "Trauma",
  medical: "Medical",
  paediatrics: "Paediatrics",
  policies: "Policies",
  "national-guidelines": "National Guidelines",
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
    },
  },
};

function CategoryGuidelinesPage() {
  const { category } = useParams({ from: "/_authed/browse/$category" });

  const { data: guidelines } = useSuspenseQuery(
    convexQuery(api.guidelines.getByCategory, { category })
  );

  const displayName = categoryDisplayNames[category] || category;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      {/* Back Navigation */}
      <div className="mb-4">
        <Link
          to="/browse"
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
          Back to Categories
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {guidelines.length} guideline{guidelines.length !== 1 ? "s" : ""}{" "}
          available
        </p>
      </div>

      {/* Guidelines List */}
      {guidelines.length === 0 ? (
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No guidelines found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no guidelines in this category yet.
          </p>
        </div>
      ) : (
        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {guidelines.map((guideline) => (
            <motion.div key={guideline._id} variants={itemVariants}>
              <Link
                to="/guideline/$slug"
                params={{ slug: guideline.slug }}
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">
                          {guideline.title}
                        </CardTitle>
                        {guideline.subcategory && (
                          <CardDescription className="mt-1">
                            {guideline.subcategory}
                          </CardDescription>
                        )}
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Version {guideline.version}</span>
                      {guideline.source && (
                        <>
                          <span>|</span>
                          <span>{guideline.source}</span>
                        </>
                      )}
                      <span>|</span>
                      <span>
                        Updated{" "}
                        {new Date(guideline.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
