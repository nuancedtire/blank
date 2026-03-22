import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAction } from "convex/react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
  keepPreviousData,
} from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { RadiantPromptInput } from "@/components/ui/radiant-input";
import type { SearchScopeOption } from "@/components/ui/radiant-input";
import { generatePdfThumbnailBlobFromUrl } from "@/lib/pdf-thumbnail";
import { AgentChat } from "@/components/search/agent-chat";
import { GuidelineCard } from "@/components/guidelines/guideline-card";
import { GuidelineCardSkeleton } from "@/components/guidelines/guideline-card-skeleton";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Clock,
  Activity,
  Stethoscope,
  Shield,
  Brain,
  FileText,
  ExternalLink,
} from "lucide-react";
export const Route = createFileRoute("/_authed/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    threadId: typeof search.threadId === "string" ? search.threadId : undefined,
  }),
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
  const navigate = Route.useNavigate();
  const { threadId: routeThreadId } = Route.useSearch();
  const [query, setQuery] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [agentPanelOpen, setAgentPanelOpen] = React.useState<boolean>(
    !!routeThreadId,
  );
  const [agentQuery, setAgentQuery] = React.useState("");
  const [agentRequestId, setAgentRequestId] = React.useState(0);
  const [agentThreadId, setAgentThreadId] = React.useState<string | null>(
    routeThreadId ?? null,
  );
  const [searchMode, setSearchMode] = React.useState<"local" | "web">("local");
  const [webResultMode, setWebResultMode] = React.useState<"pdf" | "full">("pdf");
  const [localPage, setLocalPage] = React.useState(1);
  const [webPage, setWebPage] = React.useState(1);
  const [webResults, setWebResults] = React.useState<
    Array<{ title: string; url: string; snippet: string; source: "NICE" | "RCEM" }>
  >([]);
  const [webTotal, setWebTotal] = React.useState(0);
  const [isWebSearching, setIsWebSearching] = React.useState(false);
  const webSearchRequestIdRef = React.useRef(0);
  const queryClient = useQueryClient();
  const aiSearch = useAction(api.searchAction.aiSearch);
  const localPageSize = 15;
  const webPageSize = webResultMode === "pdf" ? 15 : 8;
  const searchScope: SearchScopeOption =
    searchMode === "local"
      ? "local"
      : "web";

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

  // Fetch summaries for category counts and recently updated section
  const { data: allCategories } = useQuery(
    convexQuery(api.guidelines.getCategories, {}),
  );

  const { data: recentGuidelines } = useQuery(
    convexQuery(api.guidelines.listRecent, { limit: 5 }),
  );

  // Search (local paginated)
  const { data: localSearchData, isLoading: isSearching } = useQuery({
    ...convexQuery(api.guidelines.searchPaginated, {
      query: searchQuery,
      page: localPage,
      pageSize: localPageSize,
    }),
    enabled: !!searchQuery && searchMode === "local",
    placeholderData: keepPreviousData,
  });

  React.useEffect(() => {
    setLocalPage(1);
    setWebPage(1);
  }, [searchQuery, searchMode]);

  React.useEffect(() => {
    setWebPage(1);
  }, [webResultMode]);

  React.useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || searchMode !== "web") {
      setWebResults([]);
      setIsWebSearching(false);
      return;
    }

    const requestId = ++webSearchRequestIdRef.current;
    const run = async () => {
      setIsWebSearching(true);
      try {
        const siteFilter =
          webResultMode === "pdf"
            ? "(site:nice.org.uk OR site:rcem.ac.uk) filetype:pdf"
            : "(site:nice.org.uk OR site:rcem.ac.uk)";
        const scopedQuery = `${trimmedQuery} ${siteFilter}`;
        const response = await aiSearch({
          query: scopedQuery,
          page: webPage,
          pageSize: webPageSize,
        });
        if (webSearchRequestIdRef.current !== requestId) return;

        const typedResponse = response as {
          results?: unknown[];
          total?: number;
        };
        const items: Array<{
          title: string;
          url: string;
          snippet: string;
          source: "NICE" | "RCEM";
        }> = (typedResponse.results ?? [])
          .map((item) => item as {
            title?: string;
            url?: string;
            snippet?: string;
            source?: string;
          })
          .filter((item) => !!item.url)
          .map((item) => ({
            title: item.title ?? "Untitled",
            url: item.url ?? "",
            snippet: item.snippet ?? "",
            source: item.source === "NICE" ? "NICE" : "RCEM",
          }));
        setWebResults(items);
        setWebTotal(
          typeof typedResponse.total === "number"
            ? typedResponse.total
            : items.length,
        );
      } catch {
        if (webSearchRequestIdRef.current === requestId) {
          setWebResults([]);
          setWebTotal(0);
        }
      } finally {
        if (webSearchRequestIdRef.current === requestId) {
          setIsWebSearching(false);
        }
      }
    };
    void run();
  }, [searchMode, searchQuery, webResultMode, webPage, webPageSize, aiSearch]);

  // Get user
  const { data: currentUser } = useQuery(convexQuery(api.users.me, {}));

  const togglePin = useConvexMutation(api.users.togglePin);
  const recordSearchMemory = useConvexMutation(api.agentActions.recordSearchMemory);
  const generateUploadUrl = useConvexMutation(api.documents.generateUploadUrl);
  const setGuidelineThumbnail = useConvexMutation(
    (api.documents as any).setGuidelineThumbnail,
  );
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
      void recordSearchMemory({
        kind: "search_topic",
        key: `agent:${q.trim().toLowerCase()}`,
        summary: `User asked assistant about: ${q.trim()}`,
        weight: 0.24,
      }).catch(() => {});
      setAgentPanelOpen(true);
      setAgentQuery(q.trim());
      setAgentRequestId((prev) => prev + 1);
    }
  };

  const handleCloseAgent = () => {
    setAgentPanelOpen(false);
    setAgentQuery("");
    setAgentThreadId(null);
    void navigate({
      search: (prev: { threadId?: string }) => ({ ...prev, threadId: undefined }),
      replace: true,
    });
  };

  React.useEffect(() => {
    if (!routeThreadId) return;
    setAgentPanelOpen(true);
    setAgentThreadId(routeThreadId);
    setAgentQuery("");
  }, [routeThreadId]);

  React.useEffect(() => {
    if (!agentPanelOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [agentPanelOpen]);

  const pinnedIds = (currentUser as any)?.pinnedGuidelines ?? [];

  const { data: pinnedGuidelines } = useQuery({
    ...convexQuery(api.guidelines.getSummariesByIds, { ids: pinnedIds }),
    enabled: pinnedIds.length > 0,
  });

  const showSearchResults = !!searchQuery && !agentPanelOpen;
  const localResults = ((localSearchData as any)?.items ?? []) as Array<{
    _id: string;
    title: string;
    slug: string;
    category: string;
    source: "local";
    summary?: string;
    version: string;
    lastUpdated: number;
    storageId?: Id<"_storage">;
    thumbnailStorageId?: Id<"_storage">;
  }>;
  const localTotal = (localSearchData as any)?.total ?? 0;
  const localTotalPages = Math.max(
    1,
    (localSearchData as any)?.totalPages ?? Math.ceil(localTotal / localPageSize || 1),
  );
  const webTotalPages = Math.max(1, Math.ceil((webTotal || 0) / webPageSize));
  const webThumbnailCacheUrls = React.useMemo(
    () => Array.from(new Set(webResults.map((result) => result.url))),
    [webResults],
  );
  const { data: webThumbnailCacheData } = useQuery({
    ...convexQuery((api.documents as any).listWebPdfThumbnails, {
      urls: webThumbnailCacheUrls,
    }),
    enabled:
      searchMode === "web" &&
      webResultMode === "pdf" &&
      webThumbnailCacheUrls.length > 0,
  });
  const upsertWebPdfThumbnail = useConvexMutation(
    (api.documents as any).upsertWebPdfThumbnail,
  );
  const webThumbnailCacheByUrl = React.useMemo(() => {
    const map = new Map<
      string,
      {
        thumbnailUrl: string | null;
        sourceEtag: string | null;
        sourceLastModified: string | null;
        checkedAt: number;
      }
    >();
    const items = (webThumbnailCacheData ?? []) as Array<{
      url: string;
      thumbnailUrl: string | null;
      sourceEtag: string | null;
      sourceLastModified: string | null;
      checkedAt: number;
    }>;
    for (const item of items) {
      map.set(item.url, {
        thumbnailUrl: item.thumbnailUrl ?? null,
        sourceEtag: item.sourceEtag ?? null,
        sourceLastModified: item.sourceLastModified ?? null,
        checkedAt: item.checkedAt,
      });
    }
    return map;
  }, [webThumbnailCacheData]);
  const persistWebPdfThumbnail = React.useCallback(
    async (args: {
      url: string;
      blob: Blob;
      sourceEtag: string | null;
      sourceLastModified: string | null;
    }) => {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: args.blob,
      });
      if (!uploadResponse.ok) throw new Error("Thumbnail upload failed");
      const uploadJson = (await uploadResponse.json()) as { storageId?: string };
      if (!uploadJson.storageId) throw new Error("Missing thumbnail storageId");
      await upsertWebPdfThumbnail({
        url: args.url,
        thumbnailStorageId: uploadJson.storageId as any,
        sourceEtag: args.sourceEtag ?? undefined,
        sourceLastModified: args.sourceLastModified ?? undefined,
      });
    },
    [generateUploadUrl, upsertWebPdfThumbnail],
  );

  React.useEffect(() => {
    if (localPage > localTotalPages) {
      setLocalPage(localTotalPages);
    }
  }, [localPage, localTotalPages]);

  React.useEffect(() => {
    if (webPage > webTotalPages) {
      setWebPage(webTotalPages);
    }
  }, [webPage, webTotalPages]);

  const localThumbnailQueries = useQueries({
    queries: localResults.map((result) => ({
      ...convexQuery(api.documents.getFileUrl, {
        storageId: result.thumbnailStorageId ?? undefined,
      }),
      enabled:
        searchMode === "local" &&
        !!searchQuery &&
        !!result.thumbnailStorageId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const localThumbnailUrlById = React.useMemo(() => {
    const map = new Map<string, string | null>();
    localResults.forEach((result, index) => {
      const query = localThumbnailQueries[index];
      map.set(result._id, (query?.data as string | null | undefined) ?? null);
    });
    return map;
  }, [localResults, localThumbnailQueries]);

  const localFileUrlQueries = useQueries({
    queries: localResults.map((result) => ({
      ...convexQuery(api.documents.getFileUrl, {
        storageId: result.storageId ?? undefined,
      }),
      enabled:
        searchMode === "local" &&
        !!searchQuery &&
        !result.thumbnailStorageId &&
        !!result.storageId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const localFileUrlById = React.useMemo(() => {
    const map = new Map<string, string | null>();
    localResults.forEach((result, index) => {
      const query = localFileUrlQueries[index];
      map.set(result._id, (query?.data as string | null | undefined) ?? null);
    });
    return map;
  }, [localResults, localFileUrlQueries]);

  const thumbnailSyncInFlightRef = React.useRef<Set<string>>(new Set());
  const thumbnailSyncFailedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (searchMode !== "local") return;

    for (const result of localResults) {
      const guidelineId = result._id;
      const hasStoredThumbnail = !!result.thumbnailStorageId;
      const hasFailed = thumbnailSyncFailedRef.current.has(guidelineId);
      const isInFlight = thumbnailSyncInFlightRef.current.has(guidelineId);
      const fileUrl = localFileUrlById.get(guidelineId) ?? null;

      if (hasStoredThumbnail || hasFailed || isInFlight || !fileUrl) {
        continue;
      }

      thumbnailSyncInFlightRef.current.add(guidelineId);

      void (async () => {
        try {
          const thumbnailBlob = await generatePdfThumbnailBlobFromUrl(fileUrl);
          if (!thumbnailBlob) throw new Error("Thumbnail rendering returned null");

          const uploadUrl = await generateUploadUrl({});
          const uploadResult = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: thumbnailBlob,
          });
          if (!uploadResult.ok) {
            throw new Error("Thumbnail upload failed");
          }
          const uploadJson = (await uploadResult.json()) as {
            storageId?: Id<"_storage">;
          };
          const thumbnailStorageId = uploadJson.storageId;
          if (!thumbnailStorageId) {
            throw new Error("Missing thumbnail storageId");
          }

          await setGuidelineThumbnail({
            guidelineId: guidelineId as any,
            thumbnailStorageId: thumbnailStorageId as any,
          });

          queryClient.invalidateQueries({
            queryKey: convexQuery(api.guidelines.searchPaginated, {
              query: searchQuery,
              page: localPage,
              pageSize: localPageSize,
            }).queryKey,
          });
          queryClient.invalidateQueries({
            queryKey: convexQuery(api.guidelines.listRecent, { limit: 5 }).queryKey,
          });
        } catch {
          thumbnailSyncFailedRef.current.add(guidelineId);
        } finally {
          thumbnailSyncInFlightRef.current.delete(guidelineId);
        }
      })();
    }
  }, [
    searchMode,
    searchQuery,
    localPage,
    localResults,
    localFileUrlById,
    generateUploadUrl,
    setGuidelineThumbnail,
    queryClient,
  ]);

  React.useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const timeoutId = setTimeout(() => {
      void recordSearchMemory({
        kind: "search_topic",
        key: `${searchMode}:${trimmed.toLowerCase()}`,
        summary: `User searched ${searchMode} sources for: ${trimmed}`,
        weight: 0.16,
      }).catch(() => {});

      void recordSearchMemory({
        kind: "source_preference",
        key: searchMode === "web" ? "prefers_web_nice_rcem" : "prefers_local_documents",
        summary:
          searchMode === "web"
            ? "User often explores NICE/RCEM web guidance."
            : "User often prioritizes local uploaded guidance.",
        weight: 0.08,
      }).catch(() => {});
    }, 450);
    return () => clearTimeout(timeoutId);
  }, [recordSearchMemory, searchMode, searchQuery]);

  const recordLocalOpen = React.useCallback(
    (args: { slug: string; title: string }) => {
      void recordSearchMemory({
        kind: "guideline_interest",
        key: `local:${args.slug}`,
        summary: `User opened local guideline: ${args.title}`,
        weight: 0.22,
      }).catch(() => {});
    },
    [recordSearchMemory],
  );

  const recordWebOpen = React.useCallback(
    (args: { url: string; title: string; source: "NICE" | "RCEM" }) => {
      let host = "external";
      try {
        host = new URL(args.url).hostname;
      } catch {
        host = "external";
      }
      void recordSearchMemory({
        kind: "guideline_interest",
        key: `web:${host}`,
        summary: `User opened ${args.source} web guidance: ${args.title}`,
        weight: 0.2,
      }).catch(() => {});
    },
    [recordSearchMemory],
  );

  return (
    <div
      className={cn(
        "max-w-[1480px] mx-auto",
        agentPanelOpen
          ? "space-y-0 h-[calc(100dvh-10.5rem)] md:h-[calc(100dvh-9rem)] overflow-hidden"
          : "space-y-8",
      )}
    >
      {!agentPanelOpen && (
        <div className="text-center space-y-6 py-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            What do you need to know?
          </h1>

          <div className="max-w-4xl mx-auto">
            <RadiantPromptInput
              placeholder="Ask about any protocol, symptom, or treatment..."
              value={query}
              onChange={(val) => {
                setQuery(val);
                if (agentPanelOpen) {
                  setAgentPanelOpen(false);
                  setAgentThreadId(null);
                  setAgentQuery("");
                  void navigate({
                    search: (prev: { threadId?: string }) => ({
                      ...prev,
                      threadId: undefined,
                    }),
                    replace: true,
                  });
                }
              }}
              mode={searchMode}
              onModeChange={setSearchMode}
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
      )}

      {/* Agent Chat */}
      {agentPanelOpen && (
        <div className="animate-scale-in h-full min-h-0">
          <AgentChat
            initialQuery={agentQuery}
            initialRequestId={agentRequestId}
            initialThreadId={agentThreadId}
            initialSearchScope={searchScope}
            className="h-full"
            onClose={handleCloseAgent}
          />
        </div>
      )}

      {/* Search Results */}
      {showSearchResults && (
        <div className="animate-fade-in">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Search Results
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {searchMode === "local"
                  ? `${localTotal} total`
                  : `${webTotal} total`}
              </span>
              {searchMode === "web" && (
                <div className="inline-flex items-center rounded-lg bg-muted/70 p-1">
                  <button
                    type="button"
                    onClick={() => setWebResultMode("pdf")}
                    className={`h-7 px-3 text-xs rounded-md transition-colors ${
                      webResultMode === "pdf"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    PDF only
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebResultMode("full")}
                    className={`h-7 px-3 text-xs rounded-md transition-colors ${
                      webResultMode === "full"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Full results
                  </button>
                </div>
              )}
            </div>
          </div>

          {searchMode === "local" && (
            <div className="space-y-4">
              {isSearching && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <SearchPdfTileSkeleton key={idx} />
                  ))}
                </div>
              )}
              {!isSearching && localResults.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No local results for &ldquo;{searchQuery}&rdquo;.
                  </p>
                </Card>
              )}
              {!isSearching && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {localResults.map((result) => (
                    <LocalSearchTile
                      key={result._id}
                      slug={result.slug}
                      title={result.title}
                      thumbnailUrl={localThumbnailUrlById.get(result._id) ?? null}
                      onOpen={recordLocalOpen}
                    />
                  ))}
                </div>
              )}
              {!isSearching && localTotal > 0 && (
                <SearchPagination
                  page={localPage}
                  totalPages={localTotalPages}
                  totalResults={localTotal}
                  pageSize={localPageSize}
                  onPageChange={setLocalPage}
                />
              )}
            </div>
          )}

          {searchMode === "web" && (
            <div className="space-y-3">
              {isWebSearching && webResultMode === "pdf" && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <SearchPdfTileSkeleton key={idx} />
                  ))}
                </div>
              )}
              {isWebSearching && webResultMode === "full" &&
                [1, 2, 3].map((i) => (
                  <Card key={i} className="p-4 animate-pulse">
                    <div className="h-5 w-2/3 bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded mt-2" />
                    <div className="h-4 w-1/2 bg-muted rounded mt-2" />
                  </Card>
                ))}
              {!isWebSearching && webResults.length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No web results for &ldquo;{searchQuery}&rdquo;.
                  </p>
                </Card>
              )}
              {!isWebSearching && webResultMode === "pdf" && (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {webResults.map((result) => {
                    const cached = webThumbnailCacheByUrl.get(result.url);
                    return (
                      <WebPdfTile
                        key={result.url}
                        title={result.title}
                        url={result.url}
                        source={result.source}
                        cachedThumbnailUrl={cached?.thumbnailUrl ?? null}
                        cachedSourceEtag={cached?.sourceEtag ?? null}
                        cachedSourceLastModified={cached?.sourceLastModified ?? null}
                        cachedCheckedAt={cached?.checkedAt ?? null}
                        onPersistThumbnail={persistWebPdfThumbnail}
                        onOpen={recordWebOpen}
                      />
                    );
                  })}
                </div>
              )}
              {!isWebSearching && webResultMode === "full" &&
                webResults.map((result) => (
                  <WebSearchResultCard
                    key={result.url}
                    title={result.title}
                    url={result.url}
                    source={result.source}
                    snippet={result.snippet}
                    onOpen={recordWebOpen}
                  />
                ))}
              {!isWebSearching && webTotal > 0 && (
                <SearchPagination
                  page={webPage}
                  totalPages={webTotalPages}
                  totalResults={webTotal}
                  pageSize={webPageSize}
                  onPageChange={setWebPage}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Default View */}
      {!agentPanelOpen && !showSearchResults && (
        <>
          {/* Quick Categories */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {CATEGORIES.map((cat) => {
                const categoryData = allCategories?.find((c) => c.name === cat.name);
                const count = categoryData?.count ?? 0;
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
          {pinnedGuidelines && pinnedGuidelines.length > 0 && (
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
                      thumbnailStorageId={g.thumbnailStorageId}
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
              {recentGuidelines?.map((g: any) => (
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
                  isPinned={pinnedIds.includes(g._id)}
                  onTogglePin={() => pinMutation.mutate(g._id)}
                />
              ))}
              {!recentGuidelines && <GuidelineCardSkeleton count={4} />}
              {recentGuidelines?.length === 0 && (
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

function LocalSearchTile({
  slug,
  title,
  thumbnailUrl,
  onOpen,
}: {
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  onOpen: (args: { slug: string; title: string }) => void;
}) {
  return (
    <Link
      to="/guideline/$slug"
      params={{ slug }}
      onClick={() => onOpen({ slug, title })}
      className="group block rounded-[22px] overflow-hidden bg-card ring-1 ring-black/8 dark:ring-white/10 hover:shadow-xl transition-all duration-300"
    >
      <div className="relative aspect-[210/297] w-full overflow-hidden bg-gradient-to-b from-muted/60 to-muted/20">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${title} cover`}
            className="h-full w-full object-cover group-hover:scale-[1.035] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-b from-muted/50 to-muted/20">
            <FileText className="h-10 w-10 text-muted-foreground/60" />
          </div>
        )}
        <div className="absolute top-2.5 right-2.5 rounded-full bg-black/35 text-[10px] tracking-wide text-white px-2.5 py-1 backdrop-blur-sm">
          LOCAL
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 via-black/45 to-transparent">
          <p className="text-white text-sm font-semibold leading-snug line-clamp-3 drop-shadow-sm">
            {title}
          </p>
        </div>
      </div>
    </Link>
  );
}

function WebResultCover({
  url,
  source,
}: {
  url: string;
  source: "NICE" | "RCEM";
}) {
  const iconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=64`;
  return (
    <div className="h-16 w-12 rounded-md border border-border/80 bg-muted/20 shrink-0 flex flex-col items-center justify-center gap-1">
      <img
        src={iconUrl}
        alt={`${source} site icon`}
        className="h-5 w-5 rounded-sm"
        loading="lazy"
      />
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
        {source}
      </span>
    </div>
  );
}

function WebSearchResultCard({
  title,
  url,
  source,
  snippet,
  onOpen,
}: {
  title: string;
  url: string;
  source: "NICE" | "RCEM";
  snippet: string;
  onOpen: (args: { url: string; title: string; source: "NICE" | "RCEM" }) => void;
}) {
  return (
    <Card className="p-0 group">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        onClick={() => onOpen({ url, title, source })}
        className="flex items-start gap-4 p-4"
      >
        <WebResultCover url={url} source={source} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">
            {title}
          </p>
          {snippet && (
            <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2 font-light">
              {snippet}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <span>{source}</span>
            <ExternalLink className="w-3 h-3" />
          </p>
        </div>
      </a>
    </Card>
  );
}

function WebPdfTile({
  title,
  url,
  source,
  cachedThumbnailUrl,
  cachedSourceEtag,
  cachedSourceLastModified,
  cachedCheckedAt,
  onPersistThumbnail,
  onOpen,
}: {
  title: string;
  url: string;
  source: "NICE" | "RCEM";
  cachedThumbnailUrl: string | null;
  cachedSourceEtag: string | null;
  cachedSourceLastModified: string | null;
  cachedCheckedAt: number | null;
  onPersistThumbnail: (args: {
    url: string;
    blob: Blob;
    sourceEtag: string | null;
    sourceLastModified: string | null;
  }) => Promise<void>;
  onOpen: (args: { url: string; title: string; source: "NICE" | "RCEM" }) => void;
}) {
  const iconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=64`;
  const proxiedPdfUrl = React.useMemo(
    () => `/api/pdf-proxy?url=${encodeURIComponent(url)}`,
    [url],
  );
  const [thumbnailUrl, setThumbnailUrl] = React.useState<string | null>(
    cachedThumbnailUrl,
  );
  const [isLoadingThumbnail, setIsLoadingThumbnail] = React.useState(
    !cachedThumbnailUrl,
  );
  const objectUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (cachedThumbnailUrl) {
      setThumbnailUrl(cachedThumbnailUrl);
      setIsLoadingThumbnail(false);
    }
  }, [cachedThumbnailUrl]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const now = Date.now();
      const staleAfterMs = 6 * 60 * 60 * 1000;
      const hasCachedThumbnail = !!cachedThumbnailUrl;
      const isFreshEnough =
        !!cachedCheckedAt && now - cachedCheckedAt < staleAfterMs;
      const hasValidators = !!(cachedSourceEtag || cachedSourceLastModified);
      const shouldCheckSource = !hasCachedThumbnail || !isFreshEnough || !hasValidators;
      let sourceEtag: string | null = null;
      let sourceLastModified: string | null = null;
      let shouldRegenerate = !hasCachedThumbnail;

      if (!hasCachedThumbnail) {
        setIsLoadingThumbnail(true);
      }

      try {
        if (shouldCheckSource) {
          const headResponse = await fetch(proxiedPdfUrl, { method: "HEAD" });
          if (headResponse.ok) {
            sourceEtag = headResponse.headers.get("etag");
            sourceLastModified = headResponse.headers.get("last-modified");

            const etagChanged =
              !!cachedSourceEtag && !!sourceEtag && cachedSourceEtag !== sourceEtag;
            const lastModifiedChanged =
              !!cachedSourceLastModified &&
              !!sourceLastModified &&
              cachedSourceLastModified !== sourceLastModified;

            if (etagChanged || lastModifiedChanged) {
              shouldRegenerate = true;
            }
          }
        }

        if (!shouldRegenerate) return;

        const blob = await generatePdfThumbnailBlobFromUrl(proxiedPdfUrl);
        if (!blob || cancelled) {
          if (!cancelled) setThumbnailUrl(null);
          return;
        }
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        if (!cancelled) {
          setThumbnailUrl(objectUrl);
          void onPersistThumbnail({
            url,
            blob,
            sourceEtag,
            sourceLastModified,
          }).catch(() => {});
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch {
        if (!cancelled) {
          setThumbnailUrl(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingThumbnail(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [
    proxiedPdfUrl,
    cachedThumbnailUrl,
    cachedSourceEtag,
    cachedSourceLastModified,
    cachedCheckedAt,
    onPersistThumbnail,
    url,
  ]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={() => onOpen({ url, title, source })}
      className="group block rounded-[22px] overflow-hidden bg-card ring-1 ring-black/8 dark:ring-white/10 hover:shadow-xl transition-all duration-300"
    >
      <div className="relative aspect-[210/297] w-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
        <div className="absolute top-3 right-3 rounded-md bg-black/35 px-2 py-1 backdrop-blur-sm text-[10px] text-white font-semibold">
          {source}
        </div>
        {isLoadingThumbnail ? (
          <div className="h-full w-full animate-pulse bg-gradient-to-br from-muted/40 to-muted/20" />
        ) : thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${title} cover`}
            className="h-full w-full object-cover group-hover:scale-[1.035] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <img
              src={iconUrl}
              alt={`${source} icon`}
              className="h-12 w-12 rounded-xl shadow-md ring-2 ring-white/40"
              loading="lazy"
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 via-black/45 to-transparent">
          <p className="text-white text-sm font-semibold leading-snug line-clamp-3 drop-shadow-sm">
            {title}
          </p>
        </div>
      </div>
    </a>
  );
}

function SearchPdfTileSkeleton() {
  return (
    <div className="rounded-[22px] overflow-hidden bg-card ring-1 ring-black/8 dark:ring-white/10 animate-pulse">
      <div className="aspect-[210/297] w-full bg-gradient-to-br from-muted/45 to-muted/20" />
    </div>
  );
}

function SearchPagination({
  page,
  totalPages,
  totalResults,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = totalResults === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalResults, page * pageSize);

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {start}-{end} of {totalResults}
      </p>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="h-8 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
        >
          Previous
        </button>
        <span className="text-sm text-muted-foreground px-1">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="h-8 px-3 rounded-md border border-border bg-card text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
