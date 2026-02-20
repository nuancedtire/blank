import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { GuidelineCard } from "@/components/guidelines/guideline-card";
import { GuidelineCardSkeleton } from "@/components/guidelines/guideline-card-skeleton";
import { ArrowLeft, FileText } from "lucide-react";

export const Route = createFileRoute("/_authed/browse/$category")({
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();

  const { data: guidelines } = useQuery(
    convexQuery(api.guidelines.getByCategory, { category })
  );

  return (
    <div className="space-y-5 sm:space-y-6 pb-6">
      <div className="flex items-center gap-3">
        <Link to="/browse" className="group">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl shadow-[var(--clay-shadow-sm)] hover:shadow-[var(--clay-shadow-md)] hover:bg-gradient-to-br hover:from-muted/50 hover:to-muted/30 transition-all">
            <ArrowLeft className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </div>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            {category}
          </h1>
        </div>
      </div>

      <div className="space-y-3">
        {guidelines?.map((g: any) => (
          <GuidelineCard
            key={g._id}
            slug={g.slug}
            title={g.title}
            category={g.category}
            source={g.source}
            summary={g.summary}
            version={g.version}
            lastUpdated={g.lastUpdated}
            thumbnailStorageId={g.thumbnailStorageId}
          />
        ))}

        {!guidelines && <GuidelineCardSkeleton count={3} />}

        {guidelines?.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No guidelines in this category yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
