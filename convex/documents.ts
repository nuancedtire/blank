import { v } from "convex/values";
import {
  mutation,
  action,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import rag from "./rag";

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
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("uploadedDocuments", {
      storageId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      source: args.source,
      category: args.category,
      status: "pending",
      uploadedAt: Date.now(),
    });
    return id;
  },
});

// Index document: RAG index + create browsable guideline entry
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

      // Create a guideline entry so it appears in browse/search
      const slug = args.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const guidelineId = await ctx.runMutation(
        internal.documents.createGuidelineFromDocument,
        {
          title: args.title,
          slug: slug + "-" + Date.now(),
          content: args.content,
          source: doc.source,
          category: doc.category ?? inferCategory(args.title),
          storageId: doc.storageId,
          uploadedDocumentId: args.documentId,
        },
      );

      // Add to RAG index with metadata for citations
      await rag.add(ctx, {
        namespace: "guidelines",
        key: args.documentId,
        text: args.content,
        title: args.title,
        metadata: {
          fileName: doc.fileName,
          source: doc.source,
          guidelineId: guidelineId,
          storageId: doc.storageId,
        },
        filterValues: [{ name: "source", value: doc.source }],
      });

      // Update document status and link to guideline
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

// Infer category from title keywords
function inferCategory(title: string): string {
  const lower = title.toLowerCase();
  if (
    lower.includes("trauma") ||
    lower.includes("fracture") ||
    lower.includes("injury")
  )
    return "Trauma";
  if (
    lower.includes("paed") ||
    lower.includes("child") ||
    lower.includes("neonat")
  )
    return "Paediatrics";
  if (
    lower.includes("resus") ||
    lower.includes("cardiac arrest") ||
    lower.includes("anaphylaxis")
  )
    return "Resuscitation";
  if (
    lower.includes("policy") ||
    lower.includes("protocol") ||
    lower.includes("pathway")
  )
    return "Policies";
  return "Medical";
}

// Create a guideline entry from an uploaded document
export const createGuidelineFromDocument = internalMutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    source: v.union(v.literal("local"), v.literal("rcem"), v.literal("nice")),
    category: v.string(),
    storageId: v.id("_storage"),
    uploadedDocumentId: v.id("uploadedDocuments"),
  },
  handler: async (ctx, args) => {
    // Generate a brief summary from the first ~300 chars
    const summary =
      args.content.slice(0, 300).replace(/\n+/g, " ").trim() + "...";

    return await ctx.db.insert("guidelines", {
      title: args.title,
      slug: args.slug,
      category: args.category,
      content: args.content,
      summary,
      version: "1.0",
      status: "published",
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
