import { v } from "convex/values";
import { query, mutation, internalQuery, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { findUserProfile } from "./userProfile";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) throw new Error("Not authenticated");
  const profile = await findUserProfile(ctx, authUser);
  if (!profile) throw new Error("User profile not found");
  if (profile.isBanned) throw new Error("Account is banned");
  if (profile.role !== "admin") throw new Error("Admin access required");
  return profile;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get feature flags. Returns defaults (both disabled) if no settings exist yet.
 * No auth required — nav needs this for all users.
 */
export const getFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "features"))
      .first();

    const defaultDomains = [
      { domain: "nice.org.uk", label: "NICE", enabled: true },
      { domain: "rcem.ac.uk", label: "RCEM", enabled: true },
    ];

    return {
      interpreterEnabled: settings?.interpreterEnabled ?? false,
      mentalHealthEnabled: settings?.mentalHealthEnabled ?? false,
      searchDomains: settings?.searchDomains ?? defaultDomains,
    };
  },
});

/**
 * Get only search domains — lightweight query for backend actions.
 * No auth required so actions can call it.
 */
export const getSearchDomains = query({
  args: {},
  handler: async (ctx) => {
    return await resolveSearchDomains(ctx);
  },
});

/** Internal version for use from actions/agents via ctx.runQuery */
export const getSearchDomainsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await resolveSearchDomains(ctx);
  },
});

async function resolveSearchDomains(ctx: QueryCtx) {
  const settings = await ctx.db
    .query("siteSettings")
    .withIndex("by_key", (q) => q.eq("key", "features"))
    .first();

  const defaultDomains = [
    { domain: "nice.org.uk", label: "NICE", enabled: true },
    { domain: "rcem.ac.uk", label: "RCEM", enabled: true },
  ];

  return (settings?.searchDomains ?? defaultDomains).filter(
    (d) => d.enabled,
  );
}

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

export const updateFeatureFlags = mutation({
  args: {
    interpreterEnabled: v.boolean(),
    mentalHealthEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "features"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        interpreterEnabled: args.interpreterEnabled,
        mentalHealthEnabled: args.mentalHealthEnabled,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("siteSettings", {
        key: "features",
        interpreterEnabled: args.interpreterEnabled,
        mentalHealthEnabled: args.mentalHealthEnabled,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    }

    await ctx.db.insert("auditLogs", {
      userId: admin._id,
      action: "site_settings.features_updated",
      resourceType: "mh_session",
      resourceId: existing?._id ?? ("new" as never),
      details: `Interpreter: ${args.interpreterEnabled ? "enabled" : "disabled"}, Mental Health: ${args.mentalHealthEnabled ? "enabled" : "disabled"}`,
      timestamp: Date.now(),
    });

    return { ok: true };
  },
});

export const updateSearchDomains = mutation({
  args: {
    searchDomains: v.array(
      v.object({
        domain: v.string(),
        label: v.string(),
        enabled: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db
      .query("siteSettings")
      .withIndex("by_key", (q) => q.eq("key", "features"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        searchDomains: args.searchDomains,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("siteSettings", {
        key: "features",
        interpreterEnabled: false,
        mentalHealthEnabled: false,
        searchDomains: args.searchDomains,
        updatedAt: Date.now(),
        updatedBy: admin._id,
      });
    }

    const domainSummary = args.searchDomains
      .map((d) => `${d.label} (${d.domain}): ${d.enabled ? "on" : "off"}`)
      .join(", ");

    await ctx.db.insert("auditLogs", {
      userId: admin._id,
      action: "site_settings.search_domains_updated",
      resourceType: "mh_session",
      resourceId: existing?._id ?? ("new" as never),
      details: `Search domains updated: ${domainSummary}`,
      timestamp: Date.now(),
    });

    return { ok: true };
  },
});
