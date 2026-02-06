import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { FolderOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authed/browse/")({
  component: BrowsePage,
});

const CATEGORY_META: Record<string, { icon: string; description: string }> = {
  Resuscitation: {
    icon: "🫀",
    description: "Cardiac arrest, anaphylaxis, and emergency protocols",
  },
  Trauma: {
    icon: "🦴",
    description: "Major trauma, head injury, and assessment pathways",
  },
  Medical: {
    icon: "🩺",
    description: "Sepsis, chest pain, stroke, and acute medical pathways",
  },
  Paediatrics: {
    icon: "👶",
    description: "Febrile child, paediatric wheeze, and neonatal guidelines",
  },
  Policies: {
    icon: "📋",
    description: "CT protocols, admission criteria, and department policies",
  },
};

function BrowsePage() {
  const { data: categories } = useQuery(
    convexQuery(api.guidelines.getCategories, {})
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1">Browse Guidelines</h1>
        <p className="text-sm text-muted-foreground">
          Navigate by category to find the guideline you need
        </p>
      </div>

      <div className="space-y-2">
        {categories?.map((cat: { name: string; count: number }) => {
          const meta = CATEGORY_META[cat.name];
          return (
            <Link
              key={cat.name}
              to="/browse/$category"
              params={{ category: cat.name }}
              className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-2xl">
                {meta?.icon ?? "📄"}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm">{cat.name}</h2>
                {meta?.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {meta.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {cat.count} guideline{cat.count !== 1 ? "s" : ""}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          );
        })}

        {!categories && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        )}

        {categories?.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No guidelines uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
