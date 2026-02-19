import { v } from "convex/values";
import {
  mutation,
  action,
  query,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import rag from "./rag";
import { generateObject } from "ai";
import { cerebras } from "@ai-sdk/cerebras";
import { z } from "zod";
import type { Id } from "./_generated/dataModel";

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Save uploaded document metadata
export const saveDocument = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    source: v.union(v.literal("local"), v.literal("rcem"), v.literal("nice")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("uploadedDocuments", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      source: args.source,
      status: "pending",
      uploadedAt: Date.now(),
    });
    return id;
  },
});

// Index document: LLM-process → RAG index → create browsable guideline
export const indexDocument = action({
  args: {
    documentId: v.id("uploadedDocuments"),
    content: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    // Set status to indexing
    await ctx.runMutation(internal.documents.updateStatus, {
      documentId: args.documentId,
      status: "indexing",
    });

    try {
      // Get the document metadata
      const doc = await ctx.runQuery(internal.documents.getDocument, {
        documentId: args.documentId,
      });
      if (!doc) throw new Error("Document not found");

      // Step 0: SHA256 hash check — reject exact duplicates before any LLM cost
      const contentHash = await sha256Hex(args.content);
      const duplicate = await ctx.runQuery(
        internal.documents.checkContentHash,
        {
          contentHash,
        },
      );
      if (duplicate) {
        throw new Error(
          `This file has already been uploaded as "${duplicate.title}". If this is a new version, delete the old one first or use the replace flow.`,
        );
      }

      // Step 1: Run LLM to clean text, extract metadata, and validate content
      const llmResult = await ctx.runAction(
        internal.documents.processDocumentWithLLM,
        {
          rawText: args.content,
          fileName: doc.fileName,
        },
      );

      // If LLM says text is unusable, fail with a clear error
      if (!llmResult.hasUsableContent) {
        const reason =
          llmResult.errorReason ||
          "No usable text could be extracted from this document.";
        throw new Error(reason);
      }

      // Step 2: Content-based RAG similarity search — detects new versions
      const { likelyVersionOf, similar } = await ctx.runAction(
        internal.documents.findSimilarGuidelines,
        { content: llmResult.cleanedContent },
      );

      // Step 3: Create a guideline entry with LLM-enriched metadata
      const slug = llmResult.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const guidelineId = await ctx.runMutation(
        internal.documents.createGuidelineFromDocument,
        {
          title: llmResult.title,
          slug: slug + "-" + Date.now(),
          content: llmResult.cleanedContent,
          summary: llmResult.summary,
          source: doc.source,
          category: llmResult.category,
          keywords: llmResult.tags,
          storageId: doc.storageId,
          uploadedDocumentId: args.documentId,
          contentHash,
          likelyVersionOf: likelyVersionOf ?? undefined,
          potentialDuplicateOf: similar,
        },
      );

      // Step 4: Add to RAG index with the cleaned content
      await rag.add(ctx, {
        namespace: "guidelines",
        key: args.documentId,
        text: llmResult.cleanedContent,
        title: llmResult.title,
        metadata: {
          fileName: doc.fileName,
          source: doc.source,
          guidelineId: guidelineId,
          storageId: doc.storageId,
        },
        filterValues: [{ name: "source", value: doc.source }],
      });

      // Step 5: Update document status and link to guideline
      await ctx.runMutation(internal.documents.markIndexed, {
        documentId: args.documentId,
        guidelineId,
      });
    } catch (e) {
      console.error("Failed to index document:", e);
      await ctx.runMutation(internal.documents.updateStatusWithError, {
        documentId: args.documentId,
        errorMessage: e instanceof Error ? e.message : "Unknown indexing error",
      });
      throw e;
    }
  },
});

// Valid categories for classification
const VALID_CATEGORIES = [
  "Medical",
  "Trauma",
  "Resuscitation",
  "Paediatrics",
  "Policies",
  "Other",
] as const;

// Schema for the LLM's structured output
const DocumentMetadataSchema = z.object({
  hasUsableContent: z
    .boolean()
    .describe(
      "Whether the extracted text contains meaningful clinical/policy content. False if the text is garbled, empty, unreadable OCR noise, or clearly not a medical guideline.",
    ),
  errorReason: z
    .string()
    .describe(
      "If hasUsableContent is false, explain why (e.g. 'Text appears to be OCR noise with no readable content', 'Document is not a medical guideline'). Empty string if content is usable.",
    ),
  title: z
    .string()
    .describe(
      "A clean, concise title for this guideline/document. Derive from the content — not the filename.",
    ),
  summary: z
    .string()
    .describe(
      "A 1-2 sentence clinical summary of what this guideline covers, suitable for display in search results.",
    ),
  category: z
    .enum(VALID_CATEGORIES)
    .describe(
      "The most appropriate category: Medical (general medical conditions), Trauma (injuries, fractures, wounds), Resuscitation (cardiac arrest, anaphylaxis, critical care), Paediatrics (children & neonates), Policies (protocols, SOPs, administrative), Other (if none fit).",
    ),
  tags: z
    .array(z.string())
    .describe(
      "5-15 relevant clinical keywords/tags for search. Include conditions, procedures, medications, and synonyms clinicians might search for.",
    ),
  cleanedContent: z
    .string()
    .describe(
      "The document text cleaned up into well-structured Markdown. Fix OCR artefacts, normalize formatting, add proper headings, fix broken tables. Preserve all clinical content faithfully — do NOT add or invent information.",
    ),
});

// LLM-powered document processing: clean text, extract metadata, classify
export const processDocumentWithLLM = internalAction({
  args: {
    rawText: v.string(),
    fileName: v.string(),
  },
  handler: async (_ctx, args) => {
    const { rawText, fileName } = args;

    const result = await generateObject({
      model: cerebras.chat("gpt-oss-120b"),
      schema: DocumentMetadataSchema,
      system: `You are a medical document processor for an Emergency Department guidelines system.

You receive raw text extracted from uploaded PDFs (often via OCR). Your job:
1. Determine if the text is usable — reject garbled OCR, empty text, or non-medical content
2. Clean the text into well-structured Markdown, fixing OCR artefacts and formatting issues
3. Extract a proper title, clinical summary, category, and search tags

IMPORTANT:
- NEVER invent clinical information. Only clean and restructure what's already there.
- Fix common OCR issues: broken words, stray characters, misread numbers in dosages
- Preserve tables, dosage information, and clinical criteria exactly
- Classify into the most appropriate category based on content`,
      prompt: `Process this uploaded document.

Filename: ${fileName}
Category: (please infer from content)

--- RAW EXTRACTED TEXT ---
${rawText.slice(0, 50000)}
--- END ---`,
    });

    return result.object;
  },
});

// Create a guideline entry from an uploaded document
export const createGuidelineFromDocument = internalMutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    summary: v.string(),
    source: v.union(v.literal("local"), v.literal("rcem"), v.literal("nice")),
    category: v.string(),
    keywords: v.array(v.string()),
    storageId: v.id("_storage"),
    uploadedDocumentId: v.id("uploadedDocuments"),
    contentHash: v.string(),
    likelyVersionOf: v.optional(v.id("guidelines")),
    potentialDuplicateOf: v.array(v.id("guidelines")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("guidelines", {
      title: args.title,
      slug: args.slug,
      category: args.category,
      content: args.content,
      summary: args.summary,
      keywords: args.keywords,
      version: "1.0",
      status: "draft",
      source: args.source,
      storageId: args.storageId,
      uploadedDocumentId: args.uploadedDocumentId,
      contentHash: args.contentHash,
      likelyVersionOf: args.likelyVersionOf,
      potentialDuplicateOf:
        args.potentialDuplicateOf.length > 0
          ? args.potentialDuplicateOf
          : undefined,
      lastUpdated: Date.now(),
    });
  },
});

// Update document status (internal)
export const updateStatus = internalMutation({
  args: {
    documentId: v.id("uploadedDocuments"),
    status: v.union(
      v.literal("pending"),
      v.literal("indexing"),
      v.literal("indexed"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, { documentId, status }) => {
    await ctx.db.patch(documentId, { status });
  },
});

// Mark as indexed and link to guideline
export const markIndexed = internalMutation({
  args: {
    documentId: v.id("uploadedDocuments"),
    guidelineId: v.id("guidelines"),
  },
  handler: async (ctx, { documentId, guidelineId }) => {
    await ctx.db.patch(documentId, {
      status: "indexed" as const,
      guidelineId,
    });
  },
});

// Update document status with error message (internal)
export const updateStatusWithError = internalMutation({
  args: {
    documentId: v.id("uploadedDocuments"),
    errorMessage: v.string(),
  },
  handler: async (ctx, { documentId, errorMessage }) => {
    await ctx.db.patch(documentId, {
      status: "error" as const,
      errorMessage,
    });
  },
});

// List uploaded documents
export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("uploadedDocuments").order("desc").collect();
  },
});

// Get file URL for viewing/downloading
export const getFileUrl = query({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { storageId }) => {
    if (!storageId) return null;
    return await ctx.storage.getUrl(storageId);
  },
});

// Delete document, its guideline entry, RAG embeddings, and stored file
export const deleteDocument = action({
  args: { documentId: v.id("uploadedDocuments") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.runQuery(internal.documents.getDocument, {
      documentId,
    });
    if (!doc) throw new Error("Document not found");

    // Delete linked guideline if exists
    if (doc.guidelineId) {
      await ctx.runMutation(internal.documents.deleteGuideline, {
        guidelineId: doc.guidelineId,
      });
    }

    // Delete RAG vector embeddings (key matches the documentId used in rag.add)
    const namespace = await rag.getNamespace(ctx, {
      namespace: "guidelines",
    });
    if (namespace) {
      await rag.deleteByKey(ctx, {
        namespaceId: namespace.namespaceId,
        key: documentId,
      });
    }

    // Delete file from storage
    await ctx.storage.delete(doc.storageId);

    // Delete document record
    await ctx.runMutation(internal.documents.removeDocument, { documentId });
  },
});

export const getDocument = internalQuery({
  args: { documentId: v.id("uploadedDocuments") },
  handler: async (ctx, { documentId }) => {
    return await ctx.db.get(documentId);
  },
});

// Check if a content hash already exists among non-archived guidelines
export const checkContentHash = internalQuery({
  args: { contentHash: v.string() },
  returns: v.any(),
  handler: async (ctx, { contentHash }) => {
    // Use index for lookup, then check status in JS (no filter needed)
    const guideline = await ctx.db
      .query("guidelines")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", contentHash))
      .first();
    if (!guideline || guideline.status === "archived") return null;
    return guideline;
  },
});

// Score thresholds for version detection
const LIKELY_VERSION_THRESHOLD = 0.88; // High confidence: same document, new version
const SIMILAR_DOC_THRESHOLD = 0.72; // Medium confidence: related content

// Use RAG to find semantically similar published guidelines.
// Searches by content (not title/summary) for accurate version detection.
// Returns two tiers based on similarity score.
export const findSimilarGuidelines = internalAction({
  args: { content: v.string() },
  returns: v.object({
    likelyVersionOf: v.union(v.id("guidelines"), v.null()),
    similar: v.array(v.id("guidelines")),
  }),
  handler: async (ctx, args) => {
    try {
      // Use the first 3000 chars of cleaned content as the search query.
      // Content-to-content comparison is far more reliable for version detection
      // than comparing LLM-generated summaries.
      const searchQuery = args.content.slice(0, 3000);

      const results = await rag.search(ctx, {
        namespace: "guidelines",
        query: searchQuery,
        limit: 5,
        filters: [],
      });
      if (!results || results.entries.length === 0) {
        return { likelyVersionOf: null, similar: [] };
      }

      let likelyVersionOf: Id<"guidelines"> | null = null;
      const similar: Id<"guidelines">[] = [];

      for (let i = 0; i < results.entries.length; i++) {
        const entry = results.entries[i];
        // results.results[i] is the raw vector search result — _score is Convex's field name
        const raw = (results.results as any[])[i];
        const score: number = raw?._score ?? raw?.score ?? 0;

        const metadata = entry.metadata as Record<string, string>;
        const guidelineId = metadata?.guidelineId as
          | Id<"guidelines">
          | undefined;
        if (!guidelineId) continue;

        try {
          const guideline = await ctx.runQuery(
            internal.guidelines.getByIdInternal,
            { id: guidelineId as any },
          );
          if (!guideline || guideline.status !== "published") continue;

          if (score >= LIKELY_VERSION_THRESHOLD && !likelyVersionOf) {
            // Best match above high threshold — almost certainly same document
            likelyVersionOf = guidelineId;
          } else if (
            score >= SIMILAR_DOC_THRESHOLD &&
            guidelineId !== likelyVersionOf
          ) {
            if (!similar.includes(guidelineId)) similar.push(guidelineId);
          }
        } catch {
          // Skip unresolvable entries
        }
      }

      return { likelyVersionOf, similar };
    } catch {
      return { likelyVersionOf: null, similar: [] };
    }
  },
});

// Internal action: remove RAG embeddings for a guideline (called via scheduler)
export const removeFromRAG = internalAction({
  args: { guidelineId: v.id("guidelines") },
  handler: async (ctx, { guidelineId }) => {
    const guideline = await ctx.runQuery(
      internal.documents.getGuidelineForRAG,
      {
        guidelineId,
      },
    );
    if (!guideline?.uploadedDocumentId) return;

    const namespace = await rag.getNamespace(ctx, { namespace: "guidelines" });
    if (!namespace) return;

    await rag.deleteByKey(ctx, {
      namespaceId: namespace.namespaceId,
      key: guideline.uploadedDocumentId,
    });
  },
});

// Internal query: get guideline fields needed for RAG operations
export const getGuidelineForRAG = internalQuery({
  args: { guidelineId: v.id("guidelines") },
  handler: async (ctx, { guidelineId }) => {
    return await ctx.db.get(guidelineId);
  },
});

// Archive a guideline: soft-delete with async RAG cleanup
export const archiveGuideline = mutation({
  args: { guidelineId: v.id("guidelines") },
  returns: v.null(),
  handler: async (ctx, { guidelineId }) => {
    const guideline = await ctx.db.get(guidelineId);
    if (!guideline) throw new Error("Guideline not found");

    await ctx.db.patch(guidelineId, {
      status: "archived",
      archivedAt: Date.now(),
    });

    // Async RAG cleanup — doesn't block the mutation
    await ctx.scheduler.runAfter(0, internal.documents.removeFromRAG, {
      guidelineId,
    });

    await ctx.db.insert("auditLogs", {
      action: "guideline.archived",
      resourceType: "guideline",
      resourceId: guidelineId,
      details: `Archived: ${guideline.title}`,
      timestamp: Date.now(),
    });
    return null;
  },
});

// Restore an archived guideline back to published
export const restoreGuideline = action({
  args: { guidelineId: v.id("guidelines") },
  returns: v.null(),
  handler: async (ctx, { guidelineId }) => {
    const guideline = await ctx.runQuery(
      internal.documents.getGuidelineForRAG,
      {
        guidelineId,
      },
    );
    if (!guideline) throw new Error("Guideline not found");

    await ctx.runMutation(internal.documents.setGuidelineStatus, {
      guidelineId,
      status: "published",
    });

    // Re-add to RAG if the document is still available
    if (guideline.uploadedDocumentId) {
      try {
        await rag.add(ctx, {
          namespace: "guidelines",
          key: guideline.uploadedDocumentId,
          text: guideline.content,
          title: guideline.title,
          metadata: {
            source: guideline.source,
            guidelineId: guidelineId,
            storageId: guideline.storageId ?? "",
          },
          filterValues: [{ name: "source", value: guideline.source }],
        });
      } catch (e) {
        console.error("RAG re-index failed on restore:", e);
        // Guideline is still restored even if RAG fails
      }
    }

    await ctx.runMutation(internal.documents.insertAuditLog, {
      action: "guideline.restored",
      resourceId: guidelineId,
      details: `Restored: ${guideline.title}`,
    });
    return null;
  },
});

// Replace an old guideline with a new version: archive old, publish new with old slug
export const replaceGuideline = mutation({
  args: {
    oldGuidelineId: v.id("guidelines"),
    newGuidelineId: v.id("guidelines"),
  },
  returns: v.null(),
  handler: async (ctx, { oldGuidelineId, newGuidelineId }) => {
    const oldGuideline = await ctx.db.get(oldGuidelineId);
    const newGuideline = await ctx.db.get(newGuidelineId);
    if (!oldGuideline || !newGuideline) throw new Error("Guideline not found");

    // Archive the old one, linking to replacement
    await ctx.db.patch(oldGuidelineId, {
      status: "archived",
      archivedAt: Date.now(),
      replacedBy: newGuidelineId,
    });
    await ctx.scheduler.runAfter(0, internal.documents.removeFromRAG, {
      guidelineId: oldGuidelineId,
    });

    // Publish the new one, inheriting the old slug for URL continuity
    await ctx.db.patch(newGuidelineId, {
      status: "published",
      slug: oldGuideline.slug,
      likelyVersionOf: undefined,
      potentialDuplicateOf: undefined,
      lastUpdated: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: "guideline.updated",
      resourceType: "guideline",
      resourceId: newGuidelineId,
      details: `Replaced "${oldGuideline.title}" with new version`,
      timestamp: Date.now(),
    });
    return null;
  },
});

// Internal helpers for actions that need to write
export const setGuidelineStatus = internalMutation({
  args: {
    guidelineId: v.id("guidelines"),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
  },
  handler: async (ctx, { guidelineId, status }) => {
    await ctx.db.patch(guidelineId, { status, lastUpdated: Date.now() });
  },
});

export const insertAuditLog = internalMutation({
  args: {
    action: v.string(),
    resourceId: v.id("guidelines"),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      action: args.action,
      resourceType: "guideline",
      resourceId: args.resourceId,
      details: args.details,
      timestamp: Date.now(),
    });
  },
});

// List archived guidelines (admin view)
export const listArchived = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db
      .query("guidelines")
      .withIndex("by_status", (q) => q.eq("status", "archived"))
      .order("desc")
      .collect();
  },
});

export const removeDocument = internalMutation({
  args: { documentId: v.id("uploadedDocuments") },
  handler: async (ctx, { documentId }) => {
    await ctx.db.delete(documentId);
  },
});

export const deleteGuideline = internalMutation({
  args: { guidelineId: v.id("guidelines") },
  handler: async (ctx, { guidelineId }) => {
    await ctx.db.delete(guidelineId);
  },
});

// Approve and publish a draft guideline (with optional metadata overrides)
export const publishGuideline = mutation({
  args: {
    guidelineId: v.id("guidelines"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    category: v.optional(v.string()),
    keywords: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.guidelineId);
    if (!existing) throw new Error("Guideline not found");

    const updates: Record<string, unknown> = {
      status: "published",
      lastUpdated: Date.now(),
    };
    if (args.title !== undefined) updates.title = args.title;
    if (args.summary !== undefined) updates.summary = args.summary;
    if (args.category !== undefined) updates.category = args.category;
    if (args.keywords !== undefined) updates.keywords = args.keywords;

    // Update slug if title changed
    if (args.title !== undefined) {
      updates.slug =
        args.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Date.now();
    }

    await ctx.db.patch(args.guidelineId, updates);
  },
});

// Get the guideline linked to a document (for review UI)
export const getLinkedGuideline = query({
  args: { guidelineId: v.id("guidelines") },
  handler: async (ctx, { guidelineId }) => {
    return await ctx.db.get(guidelineId);
  },
});
