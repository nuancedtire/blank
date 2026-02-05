import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all assets
 */
export const list = query({
  args: {
    includeStale: v.optional(v.boolean()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.location) {
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_currentLocation", (q) =>
          q.eq("currentLocation", args.location!)
        )
        .collect();

      if (!args.includeStale) {
        return assets.filter((asset) => !asset.isStale);
      }
      return assets;
    }

    if (!args.includeStale) {
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_isStale", (q) => q.eq("isStale", false))
        .collect();
      return assets;
    }

    const assets = await ctx.db.query("assets").collect();
    return assets;
  },
});

/**
 * Get a single asset by ID
 */
export const getById = query({
  args: {
    id: v.id("assets"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Update asset location
 */
export const updateLocation = mutation({
  args: {
    assetId: v.id("assets"),
    currentLocation: v.string(),
    locationDetails: v.optional(v.string()),
    updatedBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    // Verify the user exists
    const user = await ctx.db.get(args.updatedBy);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.assetId, {
      currentLocation: args.currentLocation,
      locationDetails: args.locationDetails,
      lastUpdatedBy: args.updatedBy,
      lastUpdated: Date.now(),
      isStale: false, // Reset stale flag when location is updated
    });

    return { success: true };
  },
});

/**
 * Mark an asset as stale (location needs verification)
 */
export const markAsStale = mutation({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    await ctx.db.patch(args.assetId, {
      isStale: true,
    });

    return { success: true };
  },
});

/**
 * Get all stale assets that need location verification
 */
export const getStaleAssets = query({
  args: {},
  handler: async (ctx) => {
    const staleAssets = await ctx.db
      .query("assets")
      .withIndex("by_isStale", (q) => q.eq("isStale", true))
      .collect();
    return staleAssets;
  },
});

/**
 * Search assets by name
 */
export const searchByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Simple prefix search using the name index
    // For more advanced search, consider adding a search index
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_name")
      .collect();

    const searchTerm = args.name.toLowerCase();
    return assets.filter((asset) =>
      asset.name.toLowerCase().includes(searchTerm)
    );
  },
});
