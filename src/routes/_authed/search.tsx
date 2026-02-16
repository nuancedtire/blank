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
import { RadiantPromptInput } from "@/components/ui/radiant-input";
import { SearchResults } from "@/components/search/search-results";
import { AgentChat } from "@/components/search/agent-chat";
import { GuidelineCard } from "@/components/guidelines/guideline-card";
import { GuidelineCardSkeleton } from "@/components/guidelines/guideline-card-skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Clock,
  Activity,
  Stethoscope,
  Shield,
  Brain,
  FileText,
} from "lucide-react";
export const Route = createFileRoute("/_authed/search")({
  component: SearchPage,
});

const CATEGORIES = [
  {
    name: "Resuscitation",
    icon: Activity,
    color: "from-primary to-secondary",
  },
  { name: "Trauma", icon: Shield, color: "from-destructive to-destructive/70" },
  { name: "Medical", icon: Stethoscope, color: "from-accent to-accent/70" },
  { name: "Paediatrics", icon: Brain, color: "from-warning to-warning/70" },
  { name: "Policies", icon: FileText, color: "from-primary to-primary/70" },
];

function SearchPage() {
  const [query, setQuery] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [agentQuery, setAgentQuery] = React.useState<string | null>(null);
  const queryClient = useQueryClient();

  // Debounced search
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

  // Fetch guidelines
  const { data: allGuidelines } = useQuery(
    convexQuery(api.guidelines.listPublishedSummaries, {}),
  );

  // Search
  const { data: searchResults, isLoading: isSearching } = useQuery({
    ...convexQuery(api.guidelines.search, {
      query: searchQuery,
    }),
    enabled: !!searchQuery,
    placeholderData: keepPreviousData,
  });

  // Get user
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

  const pinnedIds = (currentUser as any)?.pinnedGuidelines ?? [];

  const pinnedGuidelines = React.useMemo(() => {
    if (!allGuidelines || pinnedIds.length === 0) return [];
    return allGuidelines.filter((g: any) => pinnedIds.includes(g._id));
  }, [allGuidelines, pinnedIds]);

  const showSearchResults = !!searchQuery && !agentQuery;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Search Section */}
      <div className="text-center space-y-6 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          What do you need to know?
        </h1>

        {/* Radiant Search Input */}
        <div className="max-w-3xl mx-auto">
          <RadiantPromptInput
            placeholder="Ask about any protocol, symptom, or treatment..."
            value={query}
            onChange={(val) => {
              setQuery(val);
              if (agentQuery) setAgentQuery(null);
            }}
            onSubmit={handleSubmit}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Press{" "}
          <kbd className="px-2 py-1 rounded bg-card border border-border text-xs font-mono">
            Enter
          </kbd>{" "}
          to ask AI or type to search
        </p>
      </div>

      {/* Agent Chat */}
      {agentQuery && (
        <div className="animate-scale-in">
          <AgentChat initialQuery={agentQuery} onClose={handleCloseAgent} />
        </div>
      )}

      {/* Live Search Results */}
      {showSearchResults && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Search Results
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20"
              >
                live
              </Badge>
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSearch}
              className="border-border text-muted-foreground hover:bg-background"
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

      {/* Default View */}
      {!showSearchResults && !agentQuery && (
        <>
          {/* Quick Categories */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CATEGORIES.map((cat) => {
                const count =
                  allGuidelines?.filter((g: any) => g.category === cat.name)
                    .length ?? 0;
                return (
                  <Link
                    key={cat.name}
                    to="/browse/$category"
                    params={{ category: cat.name }}
                    className="group"
                  >
                    <Card className="p-4 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-200 cursor-pointer h-full">
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}
                      >
                        <cat.icon className="w-5 h-5 text-white dark:text-black" />
                      </div>
                      <p className="font-semibold text-foreground text-sm">
                        {cat.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {count} guidelines
                      </p>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Pinned Guidelines */}
          {pinnedGuidelines.length > 0 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Pinned Guidelines
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
              <Separator className="bg-border" />
            </>
          )}

          {/* Recently Updated */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recently Updated
            </h2>
            <div className="space-y-3">
              {allGuidelines?.slice(0, 5).map((g: any) => (
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
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No guidelines yet. Check back soon.
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
