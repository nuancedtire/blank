import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users - extended with role and preferences
  // Better Auth manages its own auth tables via the component
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    pinnedGuidelines: v.optional(v.array(v.id("guidelines"))),
    preferences: v.optional(
      v.object({
        darkMode: v.optional(v.boolean()),
        notificationPreferences: v.optional(
          v.object({
            emailNotifications: v.boolean(),
            pushNotifications: v.boolean(),
            newGuidelineAlerts: v.boolean(),
            systemAnnouncements: v.boolean(),
          })
        ),
      })
    ),
    lastActive: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Guidelines and documents
  guidelines: defineTable({
    title: v.string(),
    slug: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    content: v.string(), // Extracted text / markdown content
    summary: v.optional(v.string()), // Short summary for cards
    version: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    source: v.union(
      v.literal("local"),
      v.literal("rcem"),
      v.literal("nice")
    ),
    // Original file in storage (if uploaded as PDF/DOCX)
    fileKey: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    // Link back to uploaded document
    uploadedDocumentId: v.optional(v.id("uploadedDocuments")),
    // Metadata
    createdBy: v.optional(v.id("users")),
    lastUpdatedBy: v.optional(v.id("users")),
    lastUpdated: v.number(),
    // Search metadata
    keywords: v.optional(v.array(v.string())),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_source", ["source"])
    .index("by_category_status", ["category", "status"])
    .searchIndex("search_guidelines", {
      searchField: "content",
      filterFields: ["category", "status", "source"],
    }),

  // Guideline version history
  guidelineVersions: defineTable({
    guidelineId: v.id("guidelines"),
    version: v.string(),
    content: v.string(),
    changedBy: v.optional(v.id("users")),
    changeNote: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_guideline", ["guidelineId"]),

  // Chat threads for search conversations
  chatThreads: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    lastMessageAt: v.number(),
    messageCount: v.number(),
  }).index("by_user", ["userId"]),

  // Chat messages
  chatMessages: defineTable({
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    citedGuidelines: v.optional(v.array(v.id("guidelines"))),
    wasRefusal: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

  // Audit log for compliance
  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    resourceType: v.union(
      v.literal("guideline"),
      v.literal("user"),
      v.literal("search"),
      v.literal("auth"),
      v.literal("notification")
    ),
    resourceId: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  // Notifications system
  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("success"),
      v.literal("alert")
    ),
    isBroadcast: v.boolean(),
    targetUserIds: v.optional(v.array(v.id("users"))),
    readBy: v.array(v.id("users")),
    dismissedBy: v.array(v.id("users")),
    link: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_isBroadcast", ["isBroadcast"])
    .index("by_createdAt", ["createdAt"]),
});
