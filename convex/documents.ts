import { v } from "convex/values";
import { mutation, action, query, internalMutation, internalQuery } from "./_generated/server";
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

// Index document content into RAG
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
      // Add to RAG index
      await rag.add(ctx, {
        namespace: "guidelines",
        key: args.documentId,
        text: args.content,
        title: args.title,
      });

      // Update document status
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "indexed",
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

// Update document status (internal)
export const updateStatus = internalMutation({
  args: {
    documentId: v.id("uploadedDocuments"),
    status: v.union(
      v.literal("pending"),
      v.literal("indexing"),
      v.literal("indexed"),
      v.literal("error")
    ),
  },
  handler: async (ctx, { documentId, status }) => {
    await ctx.db.patch(documentId, { status });
  },
});

// Update document status with error message (internal)
export const updateStatusWithError = internalMutation({
  args: {
    documentId: v.id("uploadedDocuments"),
    errorMessage: v.string(),
  },
  handler: async (ctx, { documentId, errorMessage }) => {
    await ctx.db.patch(documentId, { status: "error" as const, errorMessage });
  },
});

// List uploaded documents
export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("uploadedDocuments").order("desc").collect();
  },
});

// Delete document and its RAG index
export const deleteDocument = action({
  args: { documentId: v.id("uploadedDocuments") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.runQuery(internal.documents.getDocument, {
      documentId,
    });
    if (!doc) throw new Error("Document not found");

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
