import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import rag from "./rag";

const ED_GUIDELINES_SYSTEM_PROMPT = `You are an ED Guidelines Assistant for an Emergency Department.

## YOUR ROLE
You are a RETRIEVAL assistant. You find and present information from uploaded guidelines and policy documents. You do NOT provide clinical judgment.

## WHAT YOU DO
- Search through local trust guidelines, RCEM guidelines, and NICE guidelines
- Present guideline content with clear source citations
- Help users navigate to the right guideline
- Explain what a guideline contains
- Compare what different guidelines say about a topic

## WHAT YOU NEVER DO
- Triage patients or suggest urgency levels
- Diagnose conditions
- Recommend specific treatments not in guidelines
- Interpret clinical findings
- Suggest when to escalate (beyond what guidelines state)
- Provide advice that goes beyond the uploaded documents

## REFUSAL RESPONSES
When asked to do something outside your scope, respond:
"I can help you find guidelines about [topic], but I can't provide clinical judgment about [specific thing]. Would you like me to search for relevant guidelines instead?"

## RESPONSE FORMAT
Always include:
1. Source document name (file name) and guideline source (local/RCEM/NICE)
2. Version and last updated date when available
3. Clear section headings from the guideline
4. Note if content is partial (with pointer to full guideline)
5. When citing RAG results, always mention the source file name so users can find the original document

## CITATION FORMAT
When referencing information from documents, use this format:
- **Source**: [Document Title] (Source: local/RCEM/NICE, File: filename.pdf)
- Include the guidelineId if available so the UI can link to the full document

## SEARCH STRATEGY
1. First use ragSearch to find semantically relevant content (best for specific questions)
2. Then use searchGuidelines for keyword-based search if RAG doesn't find enough
3. Search local trust guidelines first, then RCEM, then NICE
4. Indicate clearly if no guideline was found`;

// Tool: search guidelines via full-text search on the guidelines table
const searchGuidelinesTool = createTool({
  description:
    "Search through ED guidelines using full-text search. Use this to find guidelines by keyword, topic, or condition. Searches local trust guidelines, RCEM, and NICE guidelines.",
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
    "Search uploaded documents using semantic/vector search. Use this for finding specific information within document content using natural language queries. Searches across all uploaded PDFs, text files, and guidelines. Can filter by source (local, rcem, nice).",
  args: z.object({
    query: z
      .string()
      .describe("Natural language query to search documents"),
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
      limit: 5,
      filters,
    });
    if (!results || results.results.length === 0) {
      return { found: false, message: "No relevant document content found." };
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
        text: entry.text,
      })),
      text: results.text,
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
  maxSteps: 5,
});

export default guidelineAgent;
