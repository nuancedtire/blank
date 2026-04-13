import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users - extended with role and preferences
  // Better Auth manages its own auth tables via the component
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    isBanned: v.optional(v.boolean()),
    bannedAt: v.optional(v.number()),
    bannedReason: v.optional(v.string()),
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
          }),
        ),
      }),
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
      v.literal("archived"),
    ),
    source: v.literal("local"),
    // Original file in storage (if uploaded as PDF/DOCX)
    fileKey: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    // Link back to uploaded document
    uploadedDocumentId: v.optional(v.id("uploadedDocuments")),
    // Metadata
    createdBy: v.optional(v.id("users")),
    lastUpdatedBy: v.optional(v.id("users")),
    lastUpdated: v.number(),
    // Search metadata
    keywords: v.optional(v.array(v.string())),
    // Duplicate detection
    contentHash: v.optional(v.string()), // SHA256 of extracted text content
    likelyVersionOf: v.optional(v.id("guidelines")), // High-confidence (≥0.88) version match
    potentialDuplicateOf: v.optional(v.array(v.id("guidelines"))), // Medium-confidence (0.72–0.88) matches
    // Archive metadata
    archivedAt: v.optional(v.number()),
    archivedBy: v.optional(v.id("users")),
    replacedBy: v.optional(v.id("guidelines")), // Newer version that replaced this one
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"])
    .index("by_status", ["status"])
    .index("by_category_status", ["category", "status"])
    .index("by_status_lastUpdated", ["status", "lastUpdated"])
    .index("by_lastUpdated", ["lastUpdated"])
    .index("by_contentHash", ["contentHash"])
    .searchIndex("search_guidelines", {
      searchField: "content",
      filterFields: ["category", "status"],
    }),

  // Uploaded documents (PDFs, text files processed into guidelines)
  uploadedDocuments: defineTable({
    storageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    extractedTextStorageId: v.optional(v.id("_storage")),
    fileName: v.string(),
    fileType: v.string(),
    source: v.literal("local"),
    status: v.union(
      v.literal("pending"),
      v.literal("extracting"),
      v.literal("queued"),
      v.literal("indexing"),
      v.literal("indexed"),
      v.literal("error"),
    ),
    uploadedAt: v.number(),
    guidelineId: v.optional(v.id("guidelines")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_uploadedAt", ["uploadedAt"]),

  // Cached page-1 thumbnails for external web PDFs (shared across users)
  webPdfThumbnails: defineTable({
    url: v.string(),
    thumbnailStorageId: v.id("_storage"),
    sourceEtag: v.optional(v.string()),
    sourceLastModified: v.optional(v.string()),
    checkedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_url", ["url"]),

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

  // Curated long-term user memory for cross-thread recall
  userMemories: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("search_topic"),
      v.literal("source_preference"),
      v.literal("guideline_interest"),
      v.literal("response_style"),
    ),
    key: v.string(),
    summary: v.string(),
    frequency: v.number(),
    strength: v.number(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    redacted: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_kind_key", ["userId", "kind", "key"])
    .index("by_user_lastSeen", ["userId", "lastSeenAt"]),

  // Audit log for compliance
  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    action: v.string(),
    resourceType: v.union(
      v.literal("guideline"),
      v.literal("user"),
      v.literal("search"),
      v.literal("auth"),
      v.literal("notification"),
      v.literal("interpreter_session"),
      v.literal("mh_session"),
      v.literal("mh_alert"),
    ),
    resourceId: v.optional(v.string()),
    details: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_action", ["action"])
    .index("by_timestamp", ["timestamp"]),

  // Cached web search results (Exa API, 24h TTL)
  webSearchCache: defineTable({
    cacheKey: v.string(), // "{query}::{site}"
    results: v.any(),
    cachedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_cacheKey", ["cacheKey"])
    .index("by_expiresAt", ["expiresAt"]),

  // Voice AI interpreter sessions (clinician-facing, bedside interpretation)
  interpreterSessions: defineTable({
    userId: v.id("users"),
    patientLanguage: v.string(),
    patientLanguageName: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("abandoned"),
    ),
    scenarioTemplate: v.optional(v.string()),
    openAiSessionId: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    transcriptTurns: v.optional(
      v.array(
        v.object({
          speaker: v.union(v.literal("clinician"), v.literal("patient")),
          englishText: v.string(),
          timestamp: v.number(),
        }),
      ),
    ),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  // Mental health companion sessions (patient-facing, waiting room screening)
  mentalHealthSessions: defineTable({
    sessionToken: v.string(),
    bedsideId: v.optional(v.string()),
    assignedByUserId: v.id("users"),
    status: v.union(
      v.literal("created"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("escalated"),
      v.literal("abandoned"),
    ),
    consentGiven: v.boolean(),
    preferredLanguage: v.optional(v.string()),
    preferredLanguageName: v.optional(v.string()),
    createdAt: v.number(),
    activatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    lastActivityAt: v.optional(v.number()),
    expiresAt: v.number(),
    openAiSessionId: v.optional(v.string()),
    currentRiskLevel: v.union(
      v.literal("none"),
      v.literal("low"),
      v.literal("moderate"),
      v.literal("high"),
      v.literal("critical"),
    ),
    escalationTriggeredAt: v.optional(v.number()),
    escalationAcknowledgedAt: v.optional(v.number()),
    escalationAcknowledgedByUserId: v.optional(v.id("users")),
    handoverDocumentText: v.optional(v.string()),
    handoverGeneratedAt: v.optional(v.number()),
  })
    .index("by_sessionToken", ["sessionToken"])
    .index("by_assignedBy", ["assignedByUserId"])
    .index("by_status", ["status"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_expiresAt", ["expiresAt"]),

  // Mental health screening instruments (PHQ-9, C-SSRS) per session
  mentalHealthScreenings: defineTable({
    sessionId: v.id("mentalHealthSessions"),
    instrument: v.union(v.literal("PHQ-9"), v.literal("C-SSRS")),
    status: v.union(
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("abandoned"),
    ),
    phq9Responses: v.optional(
      v.array(
        v.object({
          itemIndex: v.number(),
          question: v.string(),
          responseText: v.string(),
          score: v.number(),
          scoredAt: v.number(),
        }),
      ),
    ),
    phq9TotalScore: v.optional(v.number()),
    phq9Severity: v.optional(
      v.union(
        v.literal("none"),
        v.literal("mild"),
        v.literal("moderate"),
        v.literal("moderately_severe"),
        v.literal("severe"),
      ),
    ),
    cssrsResponses: v.optional(
      v.array(
        v.object({
          questionKey: v.string(),
          questionText: v.string(),
          responseText: v.string(),
          endorsed: v.boolean(),
          answeredAt: v.number(),
        }),
      ),
    ),
    cssrsIdeationCategory: v.optional(
      v.union(
        v.literal("none"),
        v.literal("passive"),
        v.literal("active_no_plan"),
        v.literal("active_with_plan"),
        v.literal("active_with_intent"),
      ),
    ),
    cssrsBehaviorCategory: v.optional(
      v.union(
        v.literal("none"),
        v.literal("preparatory"),
        v.literal("aborted"),
        v.literal("interrupted"),
        v.literal("actual"),
      ),
    ),
    cssrsHighRisk: v.optional(v.boolean()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_instrument", ["sessionId", "instrument"]),

  // Mental health clinical alerts (real-time escalation to nursing staff)
  mentalHealthAlerts: defineTable({
    sessionId: v.id("mentalHealthSessions"),
    alertType: v.union(
      v.literal("escalation_triggered"),
      v.literal("session_idle"),
      v.literal("high_phq9"),
      v.literal("cssrs_high_risk"),
      v.literal("connection_lost"),
    ),
    riskLevel: v.union(
      v.literal("moderate"),
      v.literal("high"),
      v.literal("critical"),
    ),
    escalationNote: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("acknowledged"),
      v.literal("resolved"),
    ),
    createdAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    acknowledgedByUserId: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
    resolvedByUserId: v.optional(v.id("users")),
    resolutionNote: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"])
    .index("by_status_createdAt", ["status", "createdAt"]),

  // Notifications system
  notifications: defineTable({
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("success"),
      v.literal("alert"),
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

  // Site-wide settings (singleton per key)
  siteSettings: defineTable({
    key: v.string(),
    interpreterEnabled: v.boolean(),
    mentalHealthEnabled: v.boolean(),
    // Configurable search domains (e.g. nice.org.uk, rcem.ac.uk)
    searchDomains: v.optional(
      v.array(
        v.object({
          domain: v.string(),
          label: v.string(),
          enabled: v.boolean(),
        }),
      ),
    ),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  }).index("by_key", ["key"]),
});
