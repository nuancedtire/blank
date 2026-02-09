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
      v.literal("auth")
    ),
    resourceId: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  // Uploaded documents for RAG indexing
  uploadedDocuments: defineTable({
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    source: v.union(
      v.literal("local"),
      v.literal("rcem"),
      v.literal("nice")
    ),
    category: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("indexing"),
      v.literal("indexed"),
      v.literal("error")
    ),
    errorMessage: v.optional(v.string()),
    // Link to auto-created guideline entry
    guidelineId: v.optional(v.id("guidelines")),
    uploadedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_uploadedAt", ["uploadedAt"])
    .index("by_guidelineId", ["guidelineId"]),

  // Search feedback for improving results
  searchFeedback: defineTable({
    query: v.string(),
    guidelineId: v.optional(v.id("guidelines")),
    wasHelpful: v.boolean(),
    userId: v.optional(v.id("users")),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
});
