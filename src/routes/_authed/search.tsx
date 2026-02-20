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
import type { SearchScopeOption } from "@/components/ui/radiant-input";
import { AgentChat } from "@/components/search/agent-chat";
import { GuidelineCard } from "@/components/guidelines/guideline-card";
import { GuidelineCardSkeleton } from "@/components/guidelines/guideline-card-skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Clock,
  Activity,
  Stethoscope,
  Shield,
  Brain,
  FileText,
  Globe,
  Database,
  ExternalLink,
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
  const [searchScope, setSearchScope] = React.useState<SearchScopeOption>("all");
  const [searchMode, setSearchMode] = React.useState<"local" | "web">("local");
  const [webResults, setWebResults] = React.useState<
    Array<{ title: string; url: string; snippet: string; source: "NICE" | "RCEM" }>
  >([]);
  const [isWebSearching, setIsWebSearching] = React.useState(false);
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
    enabled: !!searchQuery && searchMode === "local",
    placeholderData: keepPreviousData,
  });

  React.useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || searchMode !== "web") {
      setWebResults([]);
      setIsWebSearching(false);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      setIsWebSearching(true);
      try {
        const scopedQuery = `${trimmedQuery} site:nice.org.uk OR site:rcem.ac.uk`;
        const response = await fetch(
          `https://pdfize.exe.xyz/search?format=json&q=${encodeURIComponent(scopedQuery)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          setWebResults([]);
          return;
        }
        const data = (await response.json()) as {
          results?: Array<{ title?: string; url?: string; content?: string }>;
        };
        const items = (data.results ?? [])
          .filter((item) => {
            const url = item.url ?? "";
            return url.includes("nice.org.uk") || url.includes("rcem.ac.uk");
          })
          .slice(0, 8)
          .map((item) => {
            const url = item.url ?? "";
            const source = url.includes("nice.org.uk") ? "NICE" : "RCEM";
            return {
              title: item.title ?? "Untitled",
              url,
              snippet: item.content ?? "",
              source: source as "NICE" | "RCEM",
            };
          });
        setWebResults(items);
      } catch {
        if (!controller.signal.aborted) {
          setWebResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsWebSearching(false);
        }
      }
    };
    void run();
    return () => controller.abort();
  }, [searchMode, searchQuery]);

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

  const pinnedIds = (currentUser as any)?.pinnedGuidelines ?? [];

  const pinnedGuidelines = React.useMemo(() => {
    if (!allGuidelines || pinnedIds.length === 0) return [];
    return allGuidelines.filter((g: any) => pinnedIds.includes(g._id));
  }, [allGuidelines, pinnedIds]);

  const showSearchResults = !!searchQuery && !agentQuery;
  const localResults = (searchResults ?? []) as Array<{
    _id: string;
    title: string;
    slug: string;
    category: string;
    source: "local" | "rcem" | "nice";
  }>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero Search Section */}
      <div className="text-center space-y-6 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          What do you need to know?
        </h1>

        {/* Radiant Search Input */}
        <div className="max-w-3xl mx-auto relative">
          <div className="mb-3 inline-flex items-center rounded-lg border border-border bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={searchMode === "local" ? "default" : "ghost"}
              className="rounded-md h-8 px-4 text-xs"
              onClick={() => {
                setSearchMode("local");
                setSearchScope("local");
              }}
            >
              <Database className="w-3.5 h-3.5 mr-1.5" />
              Local
            </Button>
            <Button
              type="button"
              size="sm"
              variant={searchMode === "web" ? "default" : "ghost"}
              className="rounded-md h-8 px-4 text-xs"
              onClick={() => {
                setSearchMode("web");
                setSearchScope("external_all");
              }}
            >
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Web
            </Button>
          </div>

          <RadiantPromptInput
            placeholder="Ask about any protocol, symptom, or treatment..."
            value={query}
            onChange={(val) => {
              setQuery(val);
              if (agentQuery) setAgentQuery(null);
            }}
            searchScope={searchScope}
            onSearchScopeChange={setSearchScope}
            onSubmit={handleSubmit}
          />

          {showSearchResults && (
            <Card className="absolute left-0 right-0 top-full mt-2 z-30 border-border/70 shadow-lg">
              <div className="max-h-[360px] overflow-y-auto p-2">
                {searchMode === "local" && (
                  <>
                    {isSearching && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        Searching local guidelines...
                      </p>
                    )}
                    {!isSearching && localResults.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        No local results for &ldquo;{searchQuery}&rdquo;.
                      </p>
                    )}
                    {!isSearching &&
                      localResults.map((result) => (
                        <Link
                          key={result._id}
                          to="/guideline/$slug"
                          params={{ slug: result.slug }}
                          className="block rounded-md px-3 py-2 hover:bg-muted/60 text-left"
                        >
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {result.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {result.category} · {result.source.toUpperCase()}
                          </p>
                        </Link>
                      ))}
                  </>
                )}

                {searchMode === "web" && (
                  <>
                    {isWebSearching && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        Searching NICE/RCEM on web...
                      </p>
                    )}
                    {!isWebSearching && webResults.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        No web results for &ldquo;{searchQuery}&rdquo;.
                      </p>
                    )}
                    {!isWebSearching &&
                      webResults.map((result) => (
                        <a
                          key={result.url}
                          href={result.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-md px-3 py-2 hover:bg-muted/60 text-left"
                        >
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {result.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <span>{result.source}</span>
                            <ExternalLink className="w-3 h-3" />
                          </p>
                        </a>
                      ))}
                  </>
                )}
              </div>
            </Card>
          )}
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
          <AgentChat
            initialQuery={agentQuery}
            initialSearchScope={searchScope}
            onClose={handleCloseAgent}
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
