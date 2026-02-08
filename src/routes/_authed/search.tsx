import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import { AgentChat } from "@/components/search/agent-chat";
import { GuidelineCard } from "@/components/guidelines/guideline-card";
import { GuidelineCardSkeleton } from "@/components/guidelines/guideline-card-skeleton";
import { Card, CardInteractive } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

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
  const [agentQuery, setAgentQuery] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  // Debounced search: update searchQuery 300ms after user stops typing
  React.useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchQuery("");
      return;
    }

    const timeoutId = setTimeout(() => {
      setSearchQuery(trimmedQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Fetch published guideline summaries
  const { data: allGuidelines } = useQuery(
    convexQuery(api.guidelines.listPublishedSummaries, {}),
  );

  // Search when query changes
  const { data: searchResults, isLoading: isSearching } = useQuery({
    ...convexQuery(api.guidelines.search, {
      query: searchQuery,
    }),
    enabled: !!searchQuery,
    placeholderData: keepPreviousData,
  });

  // Get current user for pinned guidelines
  const { data: currentUser } = useQuery(convexQuery(api.users.me, {}));

  const togglePin = useConvexMutation(api.users.togglePin);
  const pinMutation = useMutation({
    mutationFn: (guidelineId: string) =>
      togglePin({ guidelineId: guidelineId as any }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.users.me, {}).queryKey,
      });
    },
  });

  // When user presses Enter, activate the agent
  const handleSubmit = (q: string) => {
    if (q.trim()) {
      setAgentQuery(q.trim());
    }
  };

  const handleCloseAgent = () => {
    setAgentQuery(null);
  };

  const handleClearSearch = () => {
    setQuery("");
    setSearchQuery("");
    setAgentQuery(null);
  };

  const pinnedIds =
    currentUser && currentUser._id
      ? (currentUser as any).pinnedGuidelines ?? []
      : [];

  const pinnedGuidelines = React.useMemo(() => {
    if (!allGuidelines || pinnedIds.length === 0) return [];
    return allGuidelines.filter((g: any) => pinnedIds.includes(g._id));
  }, [allGuidelines, pinnedIds]);

  const showSearchResults = !!searchQuery && !agentQuery;

  return (
    <div className="space-y-5 sm:space-y-6 pb-6">
      {/* Search Bar Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1.5 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
          Search Guidelines
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mb-3 font-light">
          Type to search · Press{" "}
          <kbd className="px-1.5 py-0.5 text-xs rounded-md bg-muted border font-mono">
            Enter
          </kbd>{" "}
          to ask the AI agent
        </p>
        <SearchBar
          value={query}
          onChange={(v) => {
            setQuery(v);
            // If agent is active and user types, close agent to show live results
            if (agentQuery) setAgentQuery(null);
          }}
          onSubmit={handleSubmit}
          isLoading={isSearching}
          autoFocus
          submitLabel={
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Ask Agent
            </span>
          }
        />
      </div>

      {/* Agent Chat (appears when user presses Enter) */}
      {agentQuery && (
        <AgentChat initialQuery={agentQuery} onClose={handleCloseAgent} />
      )}

      {/* Live Search Results (visible as user types, hidden when agent is active) */}
      {showSearchResults && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              Results
              <Badge
                variant="secondary"
                className="text-[10px] font-normal"
              >
                live search
              </Badge>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSearch}
              className="text-xs sm:text-sm font-bold"
            >
              Clear
            </Button>
          </div>
          <SearchResults
            results={(searchResults ?? []) as any}
            query={searchQuery}
            isLoading={isSearching}
            onPin={(id) => pinMutation.mutate(id)}
            pinnedIds={pinnedIds.map(String)}
          />
        </div>
      )}

      {/* Default view: pinned, categories, all guidelines */}
      {!showSearchResults && !agentQuery && (
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
                    isPinned
                    onTogglePin={() => pinMutation.mutate(g._id)}
                  />
                ))}
              </div>
            </div>
          )}

          {pinnedGuidelines.length > 0 && <Separator className="my-5" />}

          {/* Quick Categories */}
          <div>
            <h2 className="text-base sm:text-lg font-bold mb-2.5 flex items-center gap-1.5">
              <span className="text-lg sm:text-xl">🗂️</span>
              Browse
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const count =
                  allGuidelines?.filter(
                    (g: any) => g.category === cat.name,
                  ).length ?? 0;
                return (
                  <Link
                    key={cat.name}
                    to="/browse/$category"
                    params={{ category: cat.name }}
                  >
                    <CardInteractive className="flex-row items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 group">
                      <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform">
                        {cat.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate">
                          {cat.name}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground font-light">
                          {count} guide{count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </CardInteractive>
                  </Link>
                );
              })}
            </div>
          </div>

          <Separator className="my-5" />

          {/* All Guidelines */}
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
                  isPinned={pinnedIds.includes(g._id)}
                  onTogglePin={() => pinMutation.mutate(g._id)}
                />
              ))}
              {!allGuidelines && <GuidelineCardSkeleton count={4} />}
              {allGuidelines?.length === 0 && (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground font-light">
                    No guidelines yet. Ask admin to add.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
