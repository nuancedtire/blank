import { v } from "convex/values";
import { action } from "./_generated/server";

// AI-powered search action that uses the guideline agent
// This runs as a Convex action (can call external APIs)
export const aiSearch = action({
  args: {
    query: v.string(),
    threadId: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = args.query.trim();
    const page = Math.max(1, Math.floor(args.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Math.floor(args.pageSize ?? 12)));
    const isWebScopedQuery =
      query.includes("site:nice.org.uk") ||
      query.includes("site:rcem.ac.uk");

    // Web search path (SearXNG) for scoped external queries.
    // Using Convex action avoids browser CORS issues from the UI.
    if (isWebScopedQuery) {
      try {
        const hasNice = query.includes("site:nice.org.uk");
        const hasRcem = query.includes("site:rcem.ac.uk");
        const shouldSplitBySource = hasNice && hasRcem;

        const fetchSearx = async (q: string) => {
          const response = await fetch(
            `https://pdfize.exe.xyz/search?format=json&pageno=${page}&q=${encodeURIComponent(q)}`,
            {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(10000),
            },
          );
          if (!response.ok) {
            throw new Error("Web search request failed");
          }
          return (await response.json()) as {
            number_of_results?: number;
            results?: Array<{
              title?: string;
              url?: string;
              content?: string;
            }>;
          };
        };

        const stripSiteFilter = (q: string) =>
          q
            .replace(/\(\s*site:nice\.org\.uk\s+OR\s+site:rcem\.ac\.uk\s*\)/gi, "")
            .replace(/site:nice\.org\.uk/gi, "")
            .replace(/site:rcem\.ac\.uk/gi, "")
            .replace(/\s+/g, " ")
            .trim();

        const dataList = shouldSplitBySource
          ? await Promise.all([
              fetchSearx(`${stripSiteFilter(query)} site:nice.org.uk`),
              fetchSearx(`${stripSiteFilter(query)} site:rcem.ac.uk`),
            ])
          : [await fetchSearx(query)];

        const normalizedPerSource = dataList.map((data) => {
          const allResults = (data.results ?? []).filter((item) => {
            const url = item.url ?? "";
            return url.includes("nice.org.uk") || url.includes("rcem.ac.uk");
          });
          return {
            total:
              typeof data.number_of_results === "number" && data.number_of_results > 0
                ? data.number_of_results
                : allResults.length,
            items: allResults,
          };
        });

        let merged: Array<{ title?: string; url?: string; content?: string }> = [];
        if (shouldSplitBySource) {
          const [nice, rcem] = normalizedPerSource;
          const maxLen = Math.max(nice.items.length, rcem.items.length);
          for (let i = 0; i < maxLen; i++) {
            if (nice.items[i]) merged.push(nice.items[i]);
            if (rcem.items[i]) merged.push(rcem.items[i]);
          }
        } else {
          merged = normalizedPerSource[0].items;
        }

        const seen = new Set<string>();
        merged = merged.filter((item) => {
          const url = item.url ?? "";
          if (!url || seen.has(url)) return false;
          seen.add(url);
          return true;
        });

        const results = merged
          .slice(0, pageSize)
          .map((item) => {
            const url = item.url ?? "";
            return {
              title: item.title ?? "Untitled",
              url,
              snippet: item.content ?? "",
              source: url.includes("nice.org.uk") ? "NICE" : "RCEM",
            };
          });

        return {
          results,
          source: "web" as const,
          total: normalizedPerSource.reduce((acc, x) => acc + x.total, 0),
          page,
          pageSize,
        };
      } catch {
        return {
          results: [],
          source: "web" as const,
          error: "Web search unavailable",
          total: 0,
          page,
          pageSize,
        };
      }
    }

    // For now, we use the built-in Convex full-text search
    // The agent component will be activated when the OpenAI API key is configured
    // This provides a graceful fallback

    const results = await ctx.runQuery(
      "guidelines:search" as any,
      {
        query,
      }
    );

    return {
      results: results ?? [],
      source: "fulltext" as const,
      total: Array.isArray(results) ? results.length : 0,
      page,
      pageSize,
    };
  },
});
