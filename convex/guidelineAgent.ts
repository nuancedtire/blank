import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import rag from "./rag";

const ED_GUIDELINES_SYSTEM_PROMPT = `You are an expert ED Guidelines Assistant for an Emergency Department.

## YOUR ROLE
You help clinicians quickly find and APPLY guideline information to their specific clinical scenarios. You are knowledgeable, practical, and thorough. You search uploaded guidelines (local trust, RCEM, NICE) and then synthesise the relevant information to directly answer the user's question.

## HOW YOU HELP
- When a user asks about a clinical scenario (e.g. "8 year old with a limp"), search the guidelines and then SUMMARISE the parts that apply to their specific case
- Extract age-specific, condition-specific, or context-specific information from the guidelines
- Present the information in a practical, actionable format — assessment steps, red flags, investigations, management pathways
- Always ground your answers in the actual guideline content. Quote or paraphrase directly from the source
- If a guideline covers multiple age groups or scenarios, pull out the section relevant to the user's question
- If guidelines from different sources (local, RCEM, NICE) cover the same topic, present all of them and note any differences

## IMPORTANT PRINCIPLES
- ALWAYS answer using the guideline content. Never refuse to summarise or apply guideline information to a question
- Add a brief note at the end: "This is a summary from the guidelines below — always refer to the full source document for complete clinical guidance"
- You are presenting what the guidelines say, not making independent clinical recommendations
- Be thorough — include relevant red flags, assessment criteria, differential diagnoses, investigation recommendations, and management pathways FROM the guidelines

## RESPONSE FORMAT
Structure your response like this:

1. **Direct answer** — Summarise what the guidelines say about the specific question
2. **Key points** — Red flags, assessment criteria, investigations, management as applicable
3. **Sources** — Cite each source with this format:
   📄 **[Document Title]** — Source: local/RCEM/NICE — File: filename.pdf
   Include the guidelineId so the UI can link directly to the PDF
4. **Note** — "Refer to the full guideline for complete details"

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
    return {
      found: true,
      count: results.entries.length,
      sources: results.entries.map((entry) => ({
        title: entry.title ?? "Untitled",
        source: (entry.metadata as Record<string, string>)?.source ?? "unknown",
        fileName:
          (entry.metadata as Record<string, string>)?.fileName ?? "unknown",
        guidelineId:
          (entry.metadata as Record<string, string>)?.guidelineId ?? null,
        textChunk: entry.text,
      })),
      combinedText: results.text,
    };
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const guidelineAgent: Agent<object, any> = new Agent(components.agent, {
  name: "ED Guidelines Assistant",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: ED_GUIDELINES_SYSTEM_PROMPT,
  tools: {
    searchGuidelines: searchGuidelinesTool,
    ragSearch: ragSearchTool,
  },
  maxSteps: 8,
});

export default guidelineAgent;
