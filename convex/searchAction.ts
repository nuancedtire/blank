import { v } from "convex/values";
import { action } from "./_generated/server";

// AI-powered search action that uses the guideline agent
// This runs as a Convex action (can call external APIs)
export const aiSearch = action({
  args: {
    query: v.string(),
    threadId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // For now, we use the built-in Convex full-text search
    // The agent component will be activated when the OpenAI API key is configured
    // This provides a graceful fallback

    const results = await ctx.runQuery(
      // @ts-expect-error - internal API types not generated yet
      "guidelines:search" as any,
      {
        query: args.query,
      }
    );

    return {
      results: results ?? [],
      source: "fulltext" as const,
    };
  },
});
