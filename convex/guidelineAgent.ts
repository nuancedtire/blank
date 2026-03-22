import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { cerebras } from "@ai-sdk/cerebras";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import rag from "./rag";
import Exa from "exa-js";

const MAX_KEYWORD_RESULTS = 5;
const MAX_EXCERPT_CHARS = 900;

const ED_GUIDELINES_SYSTEM_PROMPT = `You are an expert ED Guidelines Assistant for an Emergency Department.

## YOUR ROLE
You help clinicians quickly apply uploaded local guideline content to specific clinical scenarios.

## RESPONSE STYLE
- Lead with the immediate action for the presented scenario.
- Include only essential caveats and red flags for that scenario.
- Keep answers concise and practical.

## SOURCE CITATIONS
Always cite sources at the end. This is mandatory.
For local uploaded guidelines, use EXACTLY this line format (all fields required, including Slug):
📄 **[Document Title]** — Source: local — File: filename.pdf — Slug: the-slug-value
The Slug value comes from the "slug" field returned by ragSearch or searchGuidelines tools — always include it.
For external web guidance, use this exact line format — ONLY for URLs explicitly returned by the searchExternalWeb tool:
🔗 **[Guidance Title]** — Source: RCEM/NICE — [URL]
CRITICAL: Never invent, guess, or recall external URLs from training knowledge. If searchExternalWeb returned no results, was not called, or returned found:false, omit the external sources section entirely. Do not cite any URL that did not appear in the tool's response.

Close with: "This is a summary — always refer to the full guideline for complete clinical guidance."

## SEARCH STRATEGY
1. Call ragSearch first to semantically retrieve uploaded local guidelines.
2. If the "web" scope is explicitly set OR local results are clearly insufficient, call ragSearch AND searchExternalWeb in parallel (simultaneously) — do not wait for one before calling the other.
3. Use searchGuidelines only if ragSearch returns nothing useful.
4. Respect any "Search scope preference" text from the latest user message.
5. Do not answer from memory alone.`;

const searchGuidelinesTool = createTool({
  description:
    "Keyword search over uploaded local guidelines. Use as fallback after ragSearch. Returns compact metadata and bounded excerpts.",
  args: z.object({
    query: z.string().describe("Keyword query for local guideline search"),
    category: z
      .string()
      .optional()
      .describe("Optional category filter"),
  }),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const results = await ctx.runQuery(internal.guidelines.searchInternal, {
      query: args.query,
      category: args.category,
    });

    if (!results || results.length === 0) {
      return {
        found: false,
        message: "No guidelines found matching your query.",
      };
    }

    return {
      found: true,
      count: Math.min(results.length, MAX_KEYWORD_RESULTS),
      guidelines: results.slice(0, MAX_KEYWORD_RESULTS).map((g: any) => ({
        title: g.title,
        version: g.version,
        source: g.source,
        category: g.category,
        excerpt: g.content.slice(0, MAX_EXCERPT_CHARS),
        lastUpdated: new Date(g.lastUpdated).toLocaleDateString("en-GB"),
        slug: g.slug,
      })),
    };
  },
});

const ragSearchTool = createTool({
  description:
    "Semantic/vector search over uploaded local guidelines. Use this first for clinical questions.",
  args: z.object({
    query: z
      .string()
      .describe("Natural-language clinical query"),
  }),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const results = await rag.search(ctx, {
      namespace: "guidelines",
      query: args.query,
      limit: 6,
      filters: [],
    });

    if (!results || results.results.length === 0) {
      return {
        found: false,
        message: "No relevant document content found for this query.",
      };
    }

    const sources = await Promise.all(
      results.entries.map(async (entry) => {
        const metadata = entry.metadata as Record<string, string | undefined>;
        const guidelineId = metadata?.guidelineId ?? null;

        let slug = metadata?.slug ?? null;
        if (!slug && guidelineId) {
          try {
            const guideline = await ctx.runQuery(internal.guidelines.getByIdInternal, {
              id: guidelineId as any,
            });
            slug = guideline?.slug ?? null;
          } catch {
            slug = null;
          }
        }

        return {
          title: entry.title ?? "Untitled",
          source: metadata?.source ?? "local",
          fileName: metadata?.fileName ?? "unknown",
          guidelineId,
          slug,
          textChunk: entry.text,
        };
      }),
    );

    return {
      found: true,
      count: results.entries.length,
      sources,
      combinedText: results.text,
    };
  },
});

const searchExternalWebTool = createTool({
  description:
    "Search external clinical guidance via Exa neural search constrained to NICE and/or RCEM websites. Use only when local guidance is insufficient or explicitly requested. Can be called in parallel with ragSearch.",
  args: z.object({
    query: z
      .string()
      .describe("Clinical query to search, e.g. 'head injury CT criteria adults'"),
    site: z
      .enum(["nice", "rcem", "both"])
      .optional()
      .describe("Restrict search to NICE, RCEM, or both sites."),
  }),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const siteKey = args.site ?? "both";
    const cacheKey = `${args.query}::${siteKey}`;

    // Check cache first (types generated by `npx convex dev`)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error – webSearchCache types pending Convex codegen
    const cached = await ctx.runQuery(internal.webSearchCache.getCache, { cacheKey });
    if (cached) {
      return cached as Record<string, unknown>;
    }

    const isNiceOnly = siteKey === "nice";
    const isRcemOnly = siteKey === "rcem";

    const domains = isNiceOnly
      ? ["nice.org.uk"]
      : isRcemOnly
        ? ["rcem.ac.uk"]
        : ["nice.org.uk", "rcem.ac.uk"];

    try {
      const apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          found: false,
          source: "Exa",
          message: "EXA_API_KEY is not configured.",
        };
      }

      const exa = new Exa(apiKey);
      // Use search() — searchAndContents() is deprecated in exa-js v2.8+
      const exaResult = await exa.search(args.query, {
        includeDomains: domains,
        numResults: 8,
        type: "neural",
        contents: {
          highlights: { numSentences: 2, maxCharacters: 400 },
        },
      });

      const seen = new Set<string>();
      const filteredResults = (exaResult.results ?? [])
        .filter((item) => {
          const url = item.url ?? "";
          if (!url || seen.has(url)) return false;
          seen.add(url);
          return true;
        })
        .slice(0, 8)
        .map((item) => {
          const url = item.url ?? "";
          const exaItem = item as any;
          const highlight =
            Array.isArray(exaItem.highlights) && exaItem.highlights.length > 0
              ? exaItem.highlights[0]
              : exaItem.text?.slice(0, 300) ?? "";
          return {
            title: item.title ?? "Untitled",
            url,
            snippet: highlight,
            source: url.includes("nice.org.uk")
              ? "NICE"
              : url.includes("rcem.ac.uk")
                ? "RCEM"
                : "External",
          };
        });

      if (filteredResults.length === 0) {
        const result = {
          found: false,
          source: "Exa",
          siteFilter: domains.join(", "),
          message: "No external NICE/RCEM results found.",
        };
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error – webSearchCache types pending Convex codegen
        await ctx.runMutation(internal.webSearchCache.setCache, { cacheKey, results: result });
        return result;
      }

      const result = {
        found: true,
        source: "Exa",
        siteFilter: domains.join(", "),
        count: filteredResults.length,
        results: filteredResults,
      };

      // Cache the results
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error – webSearchCache types pending Convex codegen
      await ctx.runMutation(internal.webSearchCache.setCache, { cacheKey, results: result });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        found: false,
        source: "Exa",
        siteFilter: domains.join(", "),
        message: `Exa search failed: ${message}`,
      };
    }
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const guidelineAgent: Agent<object, any> = new Agent(components.agent, {
  name: "ED Guidelines Assistant",
  languageModel: cerebras.chat("gpt-oss-120b"),
  textEmbeddingModel: process.env.OPENAI_API_KEY
    ? openai.embedding("text-embedding-3-small")
    : undefined,
  contextOptions: {
    // Cross-thread recall: limit to 4 to keep context loading fast
    searchOtherThreads: true,
    searchOptions: {
      textSearch: true,
      vectorSearch: true,
      limit: 4,
    },
  },
  instructions: ED_GUIDELINES_SYSTEM_PROMPT,
  tools: {
    searchGuidelines: searchGuidelinesTool,
    ragSearch: ragSearchTool,
    searchExternalWeb: searchExternalWebTool,
  },
  maxSteps: 4,
});

export default guidelineAgent;
