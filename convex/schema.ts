import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    pinnedGuidelines: v.array(v.id("guidelines")),
    preferences: v.object({
      theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("system"))),
      fontSize: v.optional(v.union(v.literal("small"), v.literal("medium"), v.literal("large"))),
      notificationsEnabled: v.optional(v.boolean()),
      offlineMode: v.optional(v.boolean()),
    }),
    lastActive: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_lastActive", ["lastActive"]),

  guidelines: defineTable({
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    content: v.string(),
    version: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_review"),
      v.literal("approved"),
      v.literal("archived")
    ),
    source: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    fileUrl: v.optional(v.string()),
    createdBy: v.id("users"),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    lastUpdated: v.number(),
    offlinePriority: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    keywords: v.array(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_category_status", ["category", "status"])
    .index("by_offlinePriority", ["offlinePriority"])
    .index("by_lastUpdated", ["lastUpdated"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["category", "status"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["category", "status"],
    }),

  guidelineVersions: defineTable({
    guidelineId: v.id("guidelines"),
    version: v.number(),
    content: v.string(),
    changedBy: v.id("users"),
    changeNote: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_guidelineId", ["guidelineId"])
    .index("by_guidelineId_version", ["guidelineId", "version"])
    .index("by_changedBy", ["changedBy"])
    .index("by_createdAt", ["createdAt"]),

  assets: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    currentLocation: v.string(),
    locationDetails: v.optional(v.string()),
    photoId: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    lastUpdatedBy: v.id("users"),
    lastUpdated: v.number(),
    isStale: v.boolean(),
  })
    .index("by_name", ["name"])
    .index("by_currentLocation", ["currentLocation"])
    .index("by_isStale", ["isStale"])
    .index("by_lastUpdated", ["lastUpdated"]),

  chatThreads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastMessageAt: v.number(),
    messageCount: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_lastMessageAt", ["userId", "lastMessageAt"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    citedGuidelines: v.optional(v.array(v.id("guidelines"))),
    wasRefusal: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_threadId_createdAt", ["threadId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  auditLogs: defineTable({
    userId: v.id("users"),
    action: v.string(),
    resourceType: v.union(
      v.literal("guideline"),
      v.literal("asset"),
      v.literal("user"),
      v.literal("chatThread"),
      v.literal("chatMessage")
    ),
    resourceId: v.string(),
    details: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_resourceType", ["resourceType"])
    .index("by_resourceType_resourceId", ["resourceType", "resourceId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  searchFeedback: defineTable({
    query: v.string(),
    resultGuidelineId: v.optional(v.id("guidelines")),
    wasHelpful: v.boolean(),
    userId: v.optional(v.id("users")),
    timestamp: v.number(),
  })
    .index("by_query", ["query"])
    .index("by_resultGuidelineId", ["resultGuidelineId"])
    .index("by_wasHelpful", ["wasHelpful"])
    .index("by_userId", ["userId"])
    .index("by_timestamp", ["timestamp"]),
});
