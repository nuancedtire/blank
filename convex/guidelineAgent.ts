import { Agent, createTool } from "@convex-dev/agent";
import { components, internal } from "./_generated/api";
import { z } from "zod";

// System prompt for the ED Guidelines retrieval agent
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
1. Source guideline name and version
2. Last updated date
3. Clear section headings from the guideline
4. Note if content is partial (with pointer to full guideline)

## SEARCH PRIORITY
1. Local trust guidelines (most relevant)
2. RCEM guidelines (if no local match)
3. NICE guidelines (if no RCEM match)
4. Indicate clearly if no guideline was found`;

// Define the search tool for the agent
const searchGuidelinesTool = createTool({
  description:
    "Search through ED guidelines using full-text search. Returns matching guidelines with their content.",
  args: z.object({
    query: z.string().describe("The search query for finding guidelines"),
    source: z
      .enum(["local", "rcem", "nice"])
      .optional()
      .describe("Optional: filter by guideline source"),
    category: z
      .string()
      .optional()
      .describe("Optional: filter by category like Medical, Trauma, etc."),
  }),
  handler: async (ctx, args) => {
    // Use Convex full-text search on guidelines table
    const results = await ctx.runQuery(internal.guidelines.search, {
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
      guidelines: results.map(
        (g: {
          title: string;
          version: string;
          source: string;
          category: string;
          content: string;
          lastUpdated: number;
          slug: string;
        }) => ({
          title: g.title,
          version: g.version,
          source: g.source,
          category: g.category,
          content: g.content,
          lastUpdated: new Date(g.lastUpdated).toLocaleDateString("en-GB"),
          slug: g.slug,
        })
      ),
    };
  },
});

// Create the guideline agent
export const guidelineAgent = new Agent(components.agent, {
  chat: {
    model: "gpt-4o-mini",
    systemPrompt: ED_GUIDELINES_SYSTEM_PROMPT,
  },
  tools: {
    searchGuidelines: searchGuidelinesTool,
  },
});

export default guidelineAgent;
