import { v } from "convex/values";
import { action } from "./_generated/server";
import Exa from "exa-js";

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

    // Web search path (Exa neural search) for scoped external queries.
    // Using Convex action avoids browser CORS issues from the UI.
    if (isWebScopedQuery) {
      try {
        const apiKey = process.env.EXA_API_KEY;
        if (!apiKey) {
          return {
            results: [],
            source: "web" as const,
            error: "EXA_API_KEY is not configured",
            total: 0,
            page,
            pageSize,
          };
        }

        const hasNice = query.includes("site:nice.org.uk");
        const hasRcem = query.includes("site:rcem.ac.uk");
        const isPdf = query.toLowerCase().includes("filetype:pdf");

        const domains =
          hasNice && hasRcem
            ? ["nice.org.uk", "rcem.ac.uk"]
            : hasNice
              ? ["nice.org.uk"]
              : ["rcem.ac.uk"];

        // Strip site: and filetype: directives — Exa uses includeDomains instead
        const baseQuery = query
          .replace(/\(\s*site:nice\.org\.uk\s+OR\s+site:rcem\.ac\.uk\s*\)/gi, "")
          .replace(/site:nice\.org\.uk/gi, "")
          .replace(/site:rcem\.ac\.uk/gi, "")
          .replace(/filetype:pdf/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        const exa = new Exa(apiKey);
        // Fetch enough results to cover the requested page, with extra headroom for
        // URL-based filtering (PDF mode). Cap at 50 to stay within Exa limits.
        const fetchCount = Math.min(pageSize * page * (isPdf ? 3 : 2), 50);
        const exaResult = await exa.search(baseQuery, {
          includeDomains: domains,
          numResults: fetchCount,
          type: "auto",
        });

        const seen = new Set<string>();
        let filtered = (exaResult.results ?? []).filter((item) => {
          const url = item.url ?? "";
          if (!url || seen.has(url)) return false;
          seen.add(url);
          // For PDF mode, only keep URLs that contain "pdf" in the path
          if (isPdf && !url.toLowerCase().includes("pdf")) return false;
          return (
            url.includes("nice.org.uk") || url.includes("rcem.ac.uk")
          );
        });

        const total = filtered.length;
        const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

        return {
          results: paged.map((item) => {
            const url = item.url ?? "";
            return {
              title: item.title ?? "Untitled",
              url,
              snippet: "",
              source: url.includes("nice.org.uk") ? "NICE" : "RCEM",
            };
          }),
          source: "web" as const,
          total,
          page,
          pageSize,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
          results: [],
          source: "web" as const,
          error: `Web search failed: ${message}`,
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
