import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all approved guidelines
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .collect();
    return guidelines;
  },
});

/**
 * Get a single guideline by ID
 */
export const getById = query({
  args: {
    id: v.id("guidelines"),
  },
  handler: async (ctx, args) => {
    const guideline = await ctx.db.get(args.id);
    return guideline;
  },
});

/**
 * Get a guideline by its slug
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const guideline = await ctx.db
      .query("guidelines")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    return guideline;
  },
});

/**
 * Get all guidelines in a specific category
 */
export const getByCategory = query({
  args: {
    category: v.string(),
    includeNonApproved: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeNonApproved) {
      const guidelines = await ctx.db
        .query("guidelines")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .collect();
      return guidelines;
    }

    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_category_status", (q) =>
        q.eq("category", args.category).eq("status", "approved")
      )
      .collect();
    return guidelines;
  },
});

/**
 * Full-text search across guidelines
 */
export const search = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Search in content
    let contentSearch = ctx.db
      .query("guidelines")
      .withSearchIndex("search_content", (q) => {
        let search = q.search("content", args.query);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        return search.eq("status", "approved");
      });

    const contentResults = await contentSearch.take(limit);

    // Search in title
    let titleSearch = ctx.db
      .query("guidelines")
      .withSearchIndex("search_title", (q) => {
        let search = q.search("title", args.query);
        if (args.category) {
          search = search.eq("category", args.category);
        }
        return search.eq("status", "approved");
      });

    const titleResults = await titleSearch.take(limit);

    // Combine and deduplicate results, prioritizing title matches
    const seenIds = new Set<string>();
    const combinedResults = [];

    for (const result of titleResults) {
      if (!seenIds.has(result._id)) {
        seenIds.add(result._id);
        combinedResults.push(result);
      }
    }

    for (const result of contentResults) {
      if (!seenIds.has(result._id)) {
        seenIds.add(result._id);
        combinedResults.push(result);
      }
    }

    return combinedResults.slice(0, limit);
  },
});
