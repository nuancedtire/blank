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

      // Step 2: Create a guideline entry with LLM-enriched metadata
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
        },
      );

      // Step 3: Add to RAG index with the cleaned content
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

      // Step 4: Update document status and link to guideline
      await ctx.runMutation(internal.documents.markIndexed, {
        documentId: args.documentId,
        guidelineId,
      });
    } catch (e) {
      console.error("Failed to index document:", e);
      await ctx.runMutation(internal.documents.updateStatusWithError, {
        documentId: args.documentId,
        errorMessage:
          e instanceof Error ? e.message : "Unknown indexing error",
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
      model: cerebras.chat("zai-glm-4.7"),
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
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});

// Delete document, its guideline entry, and RAG index
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
      updates.slug = args.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") + "-" + Date.now();
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
