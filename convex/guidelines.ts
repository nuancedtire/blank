import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";
import { requireAdmin } from "./users";

// Look up a guideline slug by title — used as fallback when the AI omits the slug
export const getSlugByTitle = query({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
    const normalized = title.toLowerCase().trim();
    const match = guidelines.find((g) => g.title.toLowerCase().trim() === normalized);
    return match?.slug ?? null;
  },
});

// Get all published guidelines (full, including content)
export const listPublished = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("guidelines")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();
  },
});

// Get published guidelines without heavy content field (for lists/cards)
export const listPublishedSummaries = query({
  args: {},
  handler: async (ctx) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_status_lastUpdated", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();

    return guidelines.map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );
  },
});

// Get aggregate stats for the admin dashboard
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const guidelines = await ctx.db.query("guidelines").collect();
    const users = await ctx.db.query("users").collect();

    return {
      totalGuidelines: guidelines.length,
      published: guidelines.filter((g) => g.status === "published").length,
      drafts: guidelines.filter((g) => g.status === "draft").length,
      totalUsers: users.length,
    };
  },
});

// Efficiently fetch only the most recently updated published guidelines
export const listRecent = query({
  args: { limit: v.number() },
  handler: async (ctx, { limit }) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_status_lastUpdated", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit);

    return guidelines.map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );
  },
});

// Fetch summaries for a specific set of IDs (useful for pinned items)
export const getSummariesByIds = query({
  args: { ids: v.array(v.id("guidelines")) },
  handler: async (ctx, { ids }) => {
    const results = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return results
      .filter((g): g is NonNullable<typeof g> => !!g)
      .map(({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest);
  },
});

// Get all guidelines (admin view includes drafts)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("guidelines").collect();
  },
});

// Get all guidelines without heavy content field (admin list view)
export const listAllSummaries = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const guidelines = await ctx.db.query("guidelines").order("desc").collect();
    return guidelines.map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );
  },
});

// Get guidelines by category (without content for list views)
export const getByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_category_status", (q) =>
        q.eq("category", category).eq("status", "published")
      )
      .collect();

    return guidelines.map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );
  },
});

// Get a single guideline by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const matches = await ctx.db
      .query("guidelines")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .collect();

    if (matches.length === 0) return null;

    const published = matches
      .filter((g) => g.status === "published")
      .sort((a, b) => b.lastUpdated - a.lastUpdated);

    if (published.length > 0) return published[0];

    return null;
  },
});

// Get a single guideline by ID
export const getById = query({
  args: { id: v.id("guidelines") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Get all unique categories from published guidelines
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const guidelines = await ctx.db
      .query("guidelines")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    const categoryMap = new Map<string, number>();
    for (const g of guidelines) {
      categoryMap.set(g.category, (categoryMap.get(g.category) ?? 0) + 1);
    }

    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

// Full-text search on guideline content
export const search = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let searchQuery = ctx.db
      .query("guidelines")
      .withSearchIndex("search_guidelines", (q) => {
        let sq = q.search("content", args.query).eq("status", "published");
        if (args.category) {
          sq = sq.eq("category", args.category);
        }
        return sq;
      });

    const results = await searchQuery.take(10);

    // Strip heavy content field for search results
    return results.map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );
  },
});

// Paginated full-text search on guideline content with total count
export const searchPaginated = query({
  args: {
    query: v.string(),
    page: v.number(),
    pageSize: v.number(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = Math.max(1, Math.floor(args.page));
    const pageSize = Math.min(50, Math.max(1, Math.floor(args.pageSize)));
    const start = (page - 1) * pageSize;

    const allResults = await ctx.db
      .query("guidelines")
      .withSearchIndex("search_guidelines", (q) => {
        let sq = q.search("content", args.query).eq("status", "published");
        if (args.category) {
          sq = sq.eq("category", args.category);
        }
        return sq;
      })
      .collect();

    const total = allResults.length;
    const items = allResults.slice(start, start + pageSize).map(
      ({ content, fileKey, createdBy, lastUpdatedBy, ...rest }) => rest
    );

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
});

// Create a new guideline (admin only)
export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    content: v.string(),
    summary: v.optional(v.string()),
    version: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    fileKey: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("guidelines", {
      ...args,
      source: "local",
      lastUpdated: now,
    });

    // Create initial version record
    await ctx.db.insert("guidelineVersions", {
      guidelineId: id,
      version: args.version,
      content: args.content,
      changeNote: "Initial version",
      createdAt: now,
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      action: "guideline.created",
      resourceType: "guideline",
      resourceId: id,
      details: `Created guideline: ${args.title}`,
      timestamp: now,
    });

    return id;
  },
});

// Update guideline
export const update = mutation({
  args: {
    id: v.id("guidelines"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    content: v.optional(v.string()),
    summary: v.optional(v.string()),
    version: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
    fileKey: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Guideline not found");

    const now = Date.now();

    // If content changed, create version record
    if (updates.content && updates.content !== existing.content) {
      await ctx.db.insert("guidelineVersions", {
        guidelineId: id,
        version: updates.version ?? existing.version,
        content: updates.content,
        changeNote: `Updated from v${existing.version}`,
        createdAt: now,
      });
    }

    // Remove undefined values
    const cleanUpdates: Record<string, unknown> = { lastUpdated: now };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, cleanUpdates);

    await ctx.db.insert("auditLogs", {
      action: "guideline.updated",
      resourceType: "guideline",
      resourceId: id,
      details: `Updated guideline: ${updates.title ?? existing.title}`,
      timestamp: now,
    });
  },
});

// Delete guideline (admin only)
export const remove = mutation({
  args: { id: v.id("guidelines") },
  handler: async (ctx, { id }) => {
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Guideline not found");

    // Delete version history
    const versions = await ctx.db
      .query("guidelineVersions")
      .withIndex("by_guideline", (q) => q.eq("guidelineId", id))
      .collect();
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    await ctx.db.delete(id);

    await ctx.db.insert("auditLogs", {
      action: "guideline.deleted",
      resourceType: "guideline",
      resourceId: id,
      details: `Deleted guideline: ${existing.title}`,
      timestamp: Date.now(),
    });
  },
});

// Get version history for a guideline
export const getVersions = query({
  args: { guidelineId: v.id("guidelines") },
  handler: async (ctx, { guidelineId }) => {
    return await ctx.db
      .query("guidelineVersions")
      .withIndex("by_guideline", (q) => q.eq("guidelineId", guidelineId))
      .collect();
  },
});

// Get multiple guidelines by their IDs (for duplicate review UI)
export const getByIds = query({
  args: { ids: v.array(v.id("guidelines")) },
  handler: async (ctx, { ids }) => {
    const results = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return results.filter(Boolean);
  },
});

// Internal get by ID (for agent tool slug lookup)
export const getByIdInternal = internalQuery({
  args: { id: v.id("guidelines") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Internal search that returns full content (for agent tool use)
export const searchInternal = internalQuery({
  args: {
    query: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const searchQuery = ctx.db
      .query("guidelines")
      .withSearchIndex("search_guidelines", (q) => {
        let sq = q.search("content", args.query).eq("status", "published");
        if (args.category) {
          sq = sq.eq("category", args.category);
        }
        return sq;
      });
    return await searchQuery.take(10);
  },
});
