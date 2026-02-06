import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import { GuidelineCard } from "@/components/guidelines/guideline-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authed/search")({
  component: SearchPage,
});

const CATEGORIES = [
  { name: "Resuscitation", icon: "🫀" },
  { name: "Trauma", icon: "🦴" },
  { name: "Medical", icon: "🩺" },
  { name: "Paediatrics", icon: "👶" },
  { name: "Policies", icon: "📋" },
];

function SearchPage() {
  const [query, setQuery] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch all published guidelines for browsing
  const { data: allGuidelines } = useQuery(
    convexQuery(api.guidelines.listPublished, {})
  );

  // Search when query is submitted
  const { data: searchResults, isLoading: isSearching } = useQuery({
    ...convexQuery(api.guidelines.search, {
      query: searchQuery,
    }),
    enabled: !!searchQuery,
  });

  // Get current user for pinned guidelines
  const { data: currentUser } = useQuery(
    convexQuery(api.users.me, {})
  );

  const togglePin = useConvexMutation(api.users.togglePin);
  const pinMutation = useMutation({
    mutationFn: (guidelineId: string) =>
      togglePin({ guidelineId: guidelineId as any }),
  });

  const handleSearch = (q: string) => {
    setSearchQuery(q);
  };

  const handleClearSearch = () => {
    setQuery("");
    setSearchQuery("");
  };

  const pinnedIds =
    currentUser && currentUser._id
      ? (currentUser as any).pinnedGuidelines ?? []
      : [];

  // Get pinned guidelines
  const pinnedGuidelines = React.useMemo(() => {
    if (!allGuidelines || pinnedIds.length === 0) return [];
    return allGuidelines.filter((g: any) => pinnedIds.includes(g._id));
  }, [allGuidelines, pinnedIds]);

  const showSearchResults = !!searchQuery;

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div>
        <h1 className="text-xl font-bold mb-1">Search Guidelines</h1>
        <p className="text-sm text-muted-foreground mb-3">
          Find local trust guidelines, RCEM protocols, and NICE guidance
        </p>
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
          isLoading={isSearching}
          autoFocus
        />
      </div>

      {showSearchResults ? (
        /* Search Results */
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium">Results</h2>
            <button
              onClick={handleClearSearch}
              className="text-xs text-primary hover:underline"
            >
              Clear search
            </button>
          </div>
          <SearchResults
            results={(searchResults ?? []) as any}
            query={searchQuery}
            isLoading={isSearching}
            onPin={(id) => pinMutation.mutate(id)}
            pinnedIds={pinnedIds.map(String)}
          />
        </div>
      ) : (
        <>
          {/* Pinned Guidelines */}
          {pinnedGuidelines.length > 0 && (
            <div>
              <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                Pinned
              </h2>
              <div className="space-y-1.5">
                {pinnedGuidelines.map((g: any) => (
                  <GuidelineCard
                    key={g._id}
                    slug={g.slug}
                    title={g.title}
                    category={g.category}
                    source={g.source}
                    version={g.version}
                    lastUpdated={g.lastUpdated}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Quick Categories */}
          <div>
            <h2 className="text-sm font-medium mb-2">Browse by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const count =
                  allGuidelines?.filter(
                    (g: any) => g.category === cat.name
                  ).length ?? 0;
                return (
                  <a
                    key={cat.name}
                    href={`/browse/${encodeURIComponent(cat.name)}`}
                    className="flex items-center gap-2 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {count} guideline{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Recent / All Guidelines */}
          <div>
            <h2 className="text-sm font-medium mb-2">All Guidelines</h2>
            <div className="space-y-1.5">
              {allGuidelines?.map((g: any) => (
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
              {!allGuidelines && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Loading guidelines...
                </p>
              )}
              {allGuidelines?.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No guidelines have been uploaded yet. Ask an admin to add
                  guidelines.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
