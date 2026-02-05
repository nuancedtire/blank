import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current authenticated user
 * In a real app, this would use ctx.auth to get the user identity
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // In production, you would get the identity from auth:
    // const identity = await ctx.auth.getUserIdentity();
    // if (!identity) return null;
    //
    // Then look up the user by their email or tokenIdentifier:
    // const user = await ctx.db
    //   .query("users")
    //   .withIndex("by_email", (q) => q.eq("email", identity.email))
    //   .first();
    // return user;

    // Placeholder: return null until auth is configured
    return null;
  },
});

/**
 * Update user preferences
 */
export const updatePreferences = mutation({
  args: {
    userId: v.id("users"),
    preferences: v.object({
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
      fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
      notificationsEnabled: v.optional(v.boolean()),
      offlineMode: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Merge existing preferences with new preferences
    const updatedPreferences = {
      ...user.preferences,
      ...args.preferences,
    };

    await ctx.db.patch(args.userId, {
      preferences: updatedPreferences,
      lastActive: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Toggle a pinned guideline for a user
 */
export const togglePinnedGuideline = mutation({
  args: {
    userId: v.id("users"),
    guidelineId: v.id("guidelines"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify the guideline exists
    const guideline = await ctx.db.get(args.guidelineId);
    if (!guideline) {
      throw new Error("Guideline not found");
    }

    const pinnedGuidelines = user.pinnedGuidelines || [];
    const isCurrentlyPinned = pinnedGuidelines.includes(args.guidelineId);

    let updatedPinnedGuidelines: typeof pinnedGuidelines;

    if (isCurrentlyPinned) {
      // Remove from pinned
      updatedPinnedGuidelines = pinnedGuidelines.filter(
        (id) => id !== args.guidelineId
      );
    } else {
      // Add to pinned
      updatedPinnedGuidelines = [...pinnedGuidelines, args.guidelineId];
    }

    await ctx.db.patch(args.userId, {
      pinnedGuidelines: updatedPinnedGuidelines,
      lastActive: Date.now(),
    });

    return {
      success: true,
      isPinned: !isCurrentlyPinned,
    };
  },
});

/**
 * Get user by ID (helper query)
 */
export const getById = query({
  args: {
    id: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get user's pinned guidelines with full details
 */
export const getPinnedGuidelines = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return [];
    }

    const pinnedGuidelines = await Promise.all(
      (user.pinnedGuidelines || []).map((id) => ctx.db.get(id))
    );

    // Filter out any null values (deleted guidelines)
    return pinnedGuidelines.filter((g) => g !== null);
  },
});
