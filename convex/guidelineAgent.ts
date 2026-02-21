import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { cerebras } from "@ai-sdk/cerebras";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import rag from "./rag";

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
Always cite sources at the end.
For local uploaded guidelines, use this exact line format:
📄 **[Document Title]** — Source: local — File: filename.pdf — Slug: the-slug-value
For external web guidance, use this exact line format:
🔗 **[Guidance Title]** — Source: RCEM/NICE — [URL]

Close with: "This is a summary — always refer to the full guideline for complete clinical guidance."

## SEARCH STRATEGY
1. Use ragSearch first for semantic retrieval from uploaded local guidelines.
2. Use searchGuidelines only if ragSearch is insufficient.
3. Use searchExternalWeb only when local guidance is insufficient or the user explicitly requests web guidance.
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
    "Search external guidance via SearXNG constrained to NICE and/or RCEM websites. Use only when local guidance is insufficient or explicitly requested.",
  args: z.object({
    query: z
      .string()
      .describe("Clinical query to search, e.g. 'head injury CT criteria adults'"),
    site: z
      .enum(["nice", "rcem", "both"])
      .optional()
      .describe("Restrict search to NICE, RCEM, or both sites."),
  }),
  handler: async (_ctx, args): Promise<Record<string, unknown>> => {
    const searxBaseUrl = "https://pdfize.exe.xyz";

    const fetchSearx = async (q: string) => {
      const apiUrl = `${searxBaseUrl}/search?format=json&q=${encodeURIComponent(q)}`;
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        throw new Error("SearXNG request failed");
      }
      return (await response.json()) as {
        results?: Array<{
          title?: string;
          url?: string;
          content?: string;
          engine?: string;
        }>;
      };
    };

    try {
      const isNiceOnly = args.site === "nice";
      const isRcemOnly = args.site === "rcem";
      const isBoth = !isNiceOnly && !isRcemOnly;

      const dataList = isBoth
        ? await Promise.all([
            fetchSearx(`${args.query} site:nice.org.uk filetype:pdf`),
            fetchSearx(`${args.query} site:rcem.ac.uk filetype:pdf`),
          ])
        : isNiceOnly
          ? [await fetchSearx(`${args.query} site:nice.org.uk filetype:pdf`)]
          : [await fetchSearx(`${args.query} site:rcem.ac.uk filetype:pdf`)];

      const perSource = dataList.map((data) =>
        (data.results ?? []).filter((item) => {
          const url = item.url ?? "";
          return url.includes("nice.org.uk") || url.includes("rcem.ac.uk");
        }),
      );

      let merged: Array<{
        title?: string;
        url?: string;
        content?: string;
        engine?: string;
      }> = [];
      if (isBoth) {
        const [nice, rcem] = perSource;
        const maxLen = Math.max(nice.length, rcem.length);
        for (let i = 0; i < maxLen; i++) {
          if (nice[i]) merged.push(nice[i]);
          if (rcem[i]) merged.push(rcem[i]);
        }
      } else {
        merged = perSource[0] ?? [];
      }

      const seen = new Set<string>();
      const filteredResults = merged
        .filter((item) => {
          const url = item.url ?? "";
          if (!url || seen.has(url)) return false;
          seen.add(url);
          return true;
        })
        .slice(0, 8)
        .map((item) => {
          const url = item.url ?? "";
          return {
            title: item.title ?? "Untitled",
            url,
            snippet: item.content ?? "",
            source: url.includes("nice.org.uk")
              ? "NICE"
              : url.includes("rcem.ac.uk")
                ? "RCEM"
                : "External",
            engine: item.engine ?? "unknown",
          };
        });

      if (filteredResults.length === 0) {
        return {
          found: false,
          source: "SearXNG",
          siteFilter: isBoth
            ? "(site:nice.org.uk OR site:rcem.ac.uk) filetype:pdf"
            : isNiceOnly
              ? "site:nice.org.uk filetype:pdf"
              : "site:rcem.ac.uk filetype:pdf",
          message: "No external NICE/RCEM results found.",
          searchUrl: `${searxBaseUrl}/search?q=${encodeURIComponent(args.query)}`,
        };
      }

      return {
        found: true,
        source: "SearXNG",
        siteFilter: isBoth
          ? "(site:nice.org.uk OR site:rcem.ac.uk) filetype:pdf"
          : isNiceOnly
            ? "site:nice.org.uk filetype:pdf"
            : "site:rcem.ac.uk filetype:pdf",
        count: filteredResults.length,
        results: filteredResults,
      };
    } catch {
      return {
        found: false,
        source: "SearXNG",
        siteFilter:
          args.site === "nice"
            ? "site:nice.org.uk filetype:pdf"
            : args.site === "rcem"
              ? "site:rcem.ac.uk filetype:pdf"
              : "(site:nice.org.uk OR site:rcem.ac.uk) filetype:pdf",
        message: "Could not reach SearXNG endpoint.",
        searchUrl: `${searxBaseUrl}/search?q=${encodeURIComponent(args.query)}`,
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
    // Enable practical cross-thread recall for this authenticated user.
    searchOtherThreads: true,
    searchOptions: {
      textSearch: true,
      vectorSearch: true,
      limit: 8,
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
