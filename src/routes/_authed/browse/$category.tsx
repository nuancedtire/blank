import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { GuidelineCard } from "@/components/guidelines/guideline-card";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/browse/$category")({
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useParams();

  const { data: guidelines } = useQuery(
    convexQuery(api.guidelines.getByCategory, { category })
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/browse">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{category}</h1>
          <p className="text-sm text-muted-foreground">
            {guidelines?.length ?? 0} guideline
            {(guidelines?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
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
          />
        ))}

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
