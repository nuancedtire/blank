import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { cerebras } from "@ai-sdk/cerebras";
import { z } from "zod";
import rag from "./rag";

const ED_GUIDELINES_SYSTEM_PROMPT = `You are an expert ED Guidelines Assistant for an Emergency Department.

## YOUR ROLE
You help clinicians quickly find and APPLY guideline information to their specific clinical scenarios. You are knowledgeable, practical, and concise. You search uploaded guidelines (local trust, RCEM, NICE) and then synthesise ONLY the relevant information to directly answer the user's question.

## CRITICAL: ANSWER THE SPECIFIC SCENARIO
- Clinicians ask about a SPECIFIC patient or situation. Your job is to narrow down, not expand out.
- If someone asks "VT with BP < 100", they need the unstable VT pathway — do NOT explain stable VT, pulseless VT, or VT classification systems.
- If someone asks "8 year old with a limp", pull out the 6-12 age group guidance — do NOT walk through all age groups.
- Extract ONLY the slice of the guideline that matches the clinical details given (age, vitals, presentation, context). Discard the rest.
- If the scenario maps to a specific branch of a decision tree or algorithm, follow that branch and present its steps. Do not present the whole tree.

## HOW TO RESPOND
- **Lead with the action.** Start with what the clinician should DO — the immediate management step, the pathway to follow, the drug/dose/route. No preamble.
- **Add essential context underneath.** Red flags to watch for, key assessment criteria, or important caveats — but only those relevant to the specific scenario.
- **Cite your sources at the end.** Use this EXACT format (one line per source):
  📄 **[Document Title]** — Source: local/RCEM/NICE — File: filename.pdf — Slug: the-slug-value
  The slug comes from the tool results. Always include it so the UI can link to the guideline page.
- **Close with a one-line note:** "This is a summary — always refer to the full guideline for complete clinical guidance."

Use markdown naturally — headers, bold, nested bullet lists — whatever fits the answer. Do not force a rigid numbered template. Short answers are fine. A 3-line answer that nails the specific scenario is better than a 30-line answer that covers everything.

## IMPORTANT PRINCIPLES
- ALWAYS answer using the guideline content. Never refuse to summarise or apply guideline information.
- You are presenting what the guidelines say, not making independent clinical recommendations.
- If guidelines from different sources cover the same scenario, present all of them and note any differences.
- If the user's question is ambiguous, answer the most likely interpretation and briefly mention what else you could cover if they clarify.

## SEARCH STRATEGY
1. First use ragSearch to find semantically relevant content (best for specific questions)
2. Then use searchGuidelines for keyword-based search if RAG doesn't find enough
3. Search local trust guidelines first, then RCEM, then NICE
4. If the first search doesn't cover the question well, try additional searches with different terms
5. Always search — never answer from memory alone`;

// Tool: search guidelines via full-text search on the guidelines table
const searchGuidelinesTool = createTool({
  description:
    "Search guidelines by keyword/title. Use this as a SECOND search if ragSearch didn't find enough, or to find guidelines by exact name. Returns full guideline content.",
  args: z.object({
    query: z.string().describe("The search query for finding guidelines"),
    source: z
      .enum(["local", "rcem", "nice"])
      .optional()
      .describe(
        "Optional: filter by guideline source. Search local first, then RCEM, then NICE."
      ),
    category: z
      .string()
      .optional()
      .describe(
        "Optional: filter by category like Medical, Trauma, Resuscitation, Paediatrics, Policies"
      ),
  }),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const results = await ctx.runQuery(internal.guidelines.searchInternal, {
      query: args.query,
      source: args.source,
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
      count: results.length,
      guidelines: results.map((g: any) => ({
        title: g.title,
        version: g.version,
        source: g.source,
        category: g.category,
        content: g.content,
        lastUpdated: new Date(g.lastUpdated).toLocaleDateString("en-GB"),
        slug: g.slug,
      })),
    };
  },
});

// Tool: RAG search over uploaded documents
const ragSearchTool = createTool({
  description:
    "Search uploaded documents using semantic/vector search. Best for finding specific clinical information within guidelines. Returns relevant text chunks with source details. Use this FIRST for any clinical question.",
  args: z.object({
    query: z
      .string()
      .describe("Natural language query — be specific, e.g. 'paediatric limp assessment red flags' rather than just 'limp'"),
    source: z
      .enum(["local", "rcem", "nice"])
      .optional()
      .describe(
        "Optional: filter by source. Search local first, then RCEM, then NICE.",
      ),
  }),
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const filters = args.source
      ? [{ name: "source" as const, value: args.source }]
      : [];
    const results = await rag.search(ctx, {
      namespace: "guidelines",
      query: args.query,
      limit: 8,
      filters,
    });
    if (!results || results.results.length === 0) {
      return { found: false, message: "No relevant document content found for this query." };
    }
    // Look up slugs for each source's guidelineId
    const sources = await Promise.all(
      results.entries.map(async (entry) => {
        const metadata = entry.metadata as Record<string, string>;
        const guidelineId = metadata?.guidelineId ?? null;
        let slug: string | null = null;
        if (guidelineId) {
          try {
            const guideline = await ctx.runQuery(
              internal.guidelines.getByIdInternal,
              { id: guidelineId as any },
            );
            slug = guideline?.slug ?? null;
          } catch {
            // guideline may have been deleted
          }
        }
        return {
          title: entry.title ?? "Untitled",
          source: metadata?.source ?? "unknown",
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const guidelineAgent: Agent<object, any> = new Agent(components.agent, {
  name: "ED Guidelines Assistant",
  languageModel: cerebras.chat("zai-glm-4.7"),
  instructions: ED_GUIDELINES_SYSTEM_PROMPT,
  tools: {
    searchGuidelines: searchGuidelinesTool,
    ragSearch: ragSearchTool,
  },
  maxSteps: 8,
});

export default guidelineAgent;
