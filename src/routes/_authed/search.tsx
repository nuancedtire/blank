import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import { GuidelineCard } from "@/components/guidelines/guideline-card";
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

  // Debounced search: update searchQuery 300ms after user stops typing
  React.useEffect(() => {
    const trimmedQuery = query.trim();

    // If query is empty, clear search immediately
    if (!trimmedQuery) {
      setSearchQuery("");
      return;
    }

    // Debounce search for non-empty queries
    const timeoutId = setTimeout(() => {
      setSearchQuery(trimmedQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

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
    // Still support pressing Enter to search immediately
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
    <div className="space-y-5 sm:space-y-6 pb-6">
      {/* Search Bar Section - Mobile first */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Search Guidelines
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-3 font-light">
          Find trust guidelines, RCEM, NICE
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold">Results</h2>
            <button
              onClick={handleClearSearch}
              className="clay-button text-xs sm:text-sm px-3 py-1.5 font-bold"
            >
              Clear
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
              <h2 className="text-base sm:text-lg font-bold mb-2.5 flex items-center gap-1.5">
                <span className="text-lg sm:text-xl">📌</span>
                Pinned
              </h2>
              <div className="space-y-3">
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

          {pinnedGuidelines.length > 0 && <Separator className="my-5" />}

          {/* Quick Categories - Compact mobile grid */}
          <div>
            <h2 className="text-base sm:text-lg font-bold mb-2.5 flex items-center gap-1.5">
              <span className="text-lg sm:text-xl">🗂️</span>
              Browse
            </h2>
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
                    className="clay-card flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 group"
                  >
                    <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold truncate">{cat.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground font-light">
                        {count} guide{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          <Separator className="my-5" />

          {/* Recent / All Guidelines */}
          <div>
            <h2 className="text-base sm:text-lg font-bold mb-2.5 flex items-center gap-1.5">
              <span className="text-lg sm:text-xl">📚</span>
              All Guidelines
            </h2>
            <div className="space-y-3">
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
                <div className="clay-card p-6 text-center">
                  <p className="text-sm text-muted-foreground font-light">
                    Loading guidelines...
                  </p>
                </div>
              )}
              {allGuidelines?.length === 0 && (
                <div className="clay-card p-6 text-center">
                  <p className="text-sm text-muted-foreground font-light">
                    No guidelines yet. Ask admin to add.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
