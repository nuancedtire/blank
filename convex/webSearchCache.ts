import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const getCache = internalQuery({
  args: { cacheKey: v.string() },
  handler: async (ctx, { cacheKey }) => {
    const entry = await ctx.db
      .query("webSearchCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", cacheKey))
      .unique();
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.results as unknown;
  },
});

export const setCache = internalMutation({
  args: { cacheKey: v.string(), results: v.any() },
  handler: async (ctx, { cacheKey, results }) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("webSearchCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", cacheKey))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        results,
        cachedAt: now,
        expiresAt: now + CACHE_TTL_MS,
      });
    } else {
      await ctx.db.insert("webSearchCache", {
        cacheKey,
        results,
        cachedAt: now,
        expiresAt: now + CACHE_TTL_MS,
      });
    }
  },
});

// Prune expired entries — call occasionally from a scheduled action
export const pruneExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("webSearchCache")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(100);
    await Promise.all(expired.map((e) => ctx.db.delete(e._id)));
    return { deleted: expired.length };
  },
});
