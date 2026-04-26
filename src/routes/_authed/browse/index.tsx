import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { CardInteractive } from "@/components/ui/card";
import { FolderOpen, ChevronRight } from "lucide-react";
import { CategoryCardSkeleton } from "@/components/guidelines/guideline-card-skeleton";
import { GUIDELINE_CATEGORY_META } from "@/lib/guideline-categories";

export const Route = createFileRoute("/_authed/browse/")({
  component: BrowsePage,
});

function BrowsePage() {
  const { data: categories } = useQuery(
    convexQuery(api.guidelines.getCategories, {})
  );

  return (
    <div className="space-y-5 sm:space-y-6 pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Browse Guidelines
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-light">
          Navigate by category to find the guideline you need
        </p>
      </div>

      {categories?.map((cat: { name: string; count: number }) => {
        const meta = GUIDELINE_CATEGORY_META[cat.name as keyof typeof GUIDELINE_CATEGORY_META];
        return (
          <Link
            key={cat.name}
            to="/browse/$category"
            params={{ category: cat.name }}
            className="group block"
          >
            <CardInteractive className="flex-row items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 text-2xl sm:text-3xl transition-transform group-hover:scale-110">
                {meta?.icon ? <meta.icon className="h-6 w-6 text-primary" /> : "📄"}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-sm sm:text-base">{cat.name}</h2>
                {meta?.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-light">
                    {meta.description}
                  </p>
                )}
                <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-0.5 font-light">
                  {cat.count} guide{cat.count !== 1 ? "s" : ""}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-1" />
            </CardInteractive>
          </Link>
        );
      })}

      {!categories && <CategoryCardSkeleton />}

      {categories?.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No guidelines uploaded yet</p>
        </div>
      )}
    </div>
  );
}
