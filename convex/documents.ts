import { ConvexError, v } from "convex/values";
import {
  mutation,
  action,
  query,
  internalMutation,
  internalQuery,
  internalAction,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import rag from "./rag";
import { generateObject, RetryError } from "ai";
import { cerebras } from "@ai-sdk/cerebras";
import { z } from "zod";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { findUserProfile } from "./userProfile";
import {
  GUIDELINE_CATEGORIES,
  GUIDELINE_CATEGORY_PROMPT,
} from "./guidelineCategories";

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeExternalPdfUrl(input: string): string {
  try {
    const url = new URL(input.trim());
    url.hash = "";
    return url.toString();
  } catch {
    return input.trim();
  }
}

const documentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("extracting"),
  v.literal("queued"),
  v.literal("indexing"),
  v.literal("indexed"),
  v.literal("error"),
);

const INDEX_RETRY_DELAYS_MS = [15_000, 45_000, 120_000];
const MAX_INDEX_RETRIES = INDEX_RETRY_DELAYS_MS.length;

type DocumentsGuardCtx = QueryCtx | MutationCtx;

function accessError(message: string) {
  return new ConvexError({
    code: "UNAUTHORIZED",
    message,
  });
}

async function requireCurrentUser(
  ctx: DocumentsGuardCtx,
): Promise<Doc<"users">> {
  const authUser = await authComponent.safeGetAuthUser(ctx);
  if (!authUser) {
    throw accessError("Not authenticated");
  }

  const profile = await findUserProfile(ctx, authUser);
  if (!profile) {
    throw accessError("User profile not found");
  }
  if (profile.isBanned) {
    throw accessError("Account is banned");
  }

  return profile;
}

async function requireAdmin(ctx: DocumentsGuardCtx): Promise<Doc<"users">> {
  const profile = await requireCurrentUser(ctx);
  if (profile.role !== "admin") {
    throw accessError("Admin access required");
  }
  return profile;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function isTransientIndexingError(error: unknown): boolean {
  if (RetryError.isInstance(error)) {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("high traffic") ||
    message.includes("rate limit") ||
    message.includes("overloaded") ||
    message.includes("timeout") ||
    message.includes("temporarily unavailable") ||
    message.includes("try again soon")
  );
}

// Generate upload URL for file storage
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateDocumentUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Save uploaded document metadata
export const saveDocument = mutation({
  args: {
    storageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    fileName: v.string(),
    fileType: v.string(),
  },
  returns: v.id("uploadedDocuments"),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const id = await ctx.db.insert("uploadedDocuments", {
      storageId: args.storageId,
      thumbnailStorageId: args.thumbnailStorageId,
      fileName: args.fileName,
      fileType: args.fileType,
      source: "local",
      status: "pending",
      uploadedAt: Date.now(),
    });
    return id;
  },
});

export const markDocumentExtracting = mutation({
  args: {
    documentId: v.id("uploadedDocuments"),
  },
  returns: v.null(),
  handler: async (ctx, { documentId }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(documentId, {
      status: "extracting",
    });
    return null;
  },
});

export const markExtractionFailed = mutation({
  args: {
    documentId: v.id("uploadedDocuments"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, errorMessage }) => {
    await requireAdmin(ctx);
    await ctx.db.patch(documentId, {
      status: "error",
      errorMessage,
    });
    return null;
  },
});

export const queueDocumentIndexing = mutation({
  args: {
    documentId: v.id("uploadedDocuments"),
    extractedTextStorageId: v.id("_storage"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const doc = await ctx.db.get(args.documentId);
    if (!doc) {
      throw new ConvexError({
        code: "DOCUMENT_NOT_FOUND",
        message: "Document not found",
      });
    }

    await ctx.db.patch(args.documentId, {
      status: "queued",
      extractedTextStorageId: args.extractedTextStorageId,
      errorMessage: undefined,
    });

    await ctx.scheduler.runAfter(0, internal.documents.indexQueuedDocument, {
      documentId: args.documentId,
      title: args.title,
      attempt: 0,
    });
    return null;
  },
});

// Index document: LLM-process → RAG index → create browsable guideline
export const indexQueuedDocument = internalAction({
  args: {
    documentId: v.id("uploadedDocuments"),
    title: v.string(),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.documents.updateStatus, {
      documentId: args.documentId,
      status: "indexing",
    });

    let createdGuidelineId: Id<"guidelines"> | null = null;
    let extractedTextStorageId: Id<"_storage"> | undefined;
    let shouldDeleteExtractedText = true;
    const attempt = args.attempt ?? 0;

    try {
      const doc = await ctx.runQuery(internal.documents.getDocument, {
        documentId: args.documentId,
      });
      if (!doc) throw new Error("Document not found");
      if (!doc.extractedTextStorageId) {
        throw new Error("Extracted text artifact not found");
      }
      extractedTextStorageId = doc.extractedTextStorageId;

      const extractedTextBlob = await ctx.storage.get(doc.extractedTextStorageId);
      if (!extractedTextBlob) {
        throw new Error("Extracted text artifact could not be read");
      }
      const content = await extractedTextBlob.text();
      if (content.trim().length < 50) {
        throw new Error("The uploaded file did not contain enough text to index.");
      }

      const contentHash = await sha256Hex(content);
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
          rawText: content,
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
      const effectiveTitle = llmResult.title.trim() || args.title;
      const slug = effectiveTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const slugWithTimestamp = `${slug}-${Date.now()}`;

      const guidelineId = await ctx.runMutation(
        internal.documents.createGuidelineFromDocument,
        {
          title: effectiveTitle,
          slug: slugWithTimestamp,
          content: llmResult.cleanedContent,
          summary: llmResult.summary,
          category: llmResult.category,
          keywords: llmResult.tags,
          storageId: doc.storageId,
          thumbnailStorageId: doc.thumbnailStorageId,
          uploadedDocumentId: args.documentId,
          contentHash,
          likelyVersionOf: likelyVersionOf ?? undefined,
          potentialDuplicateOf: similar,
        },
      );
      createdGuidelineId = guidelineId;

      // Step 4: Add to RAG index with the cleaned content
      await rag.add(ctx, {
        namespace: "guidelines",
        key: args.documentId,
        text: llmResult.cleanedContent,
        title: effectiveTitle,
        metadata: {
          fileName: doc.fileName,
          source: "local",
          guidelineId: guidelineId,
          slug: slugWithTimestamp,
          storageId: doc.storageId,
        },
      });

      // Step 5: Update document status and link to guideline
      await ctx.runMutation(internal.documents.markIndexed, {
        documentId: args.documentId,
        guidelineId,
      });
    } catch (e) {
      console.error("Failed to index document:", e);

      // Best-effort rollback: avoid leaving orphaned guideline/RAG entries on partial failure.
      if (createdGuidelineId) {
        try {
          await ctx.runMutation(internal.documents.deleteGuidelineCascade, {
            guidelineId: createdGuidelineId,
          });
        } catch (cleanupError) {
          console.error("Guideline rollback failed:", cleanupError);
        }

        try {
          const namespace = await rag.getNamespace(ctx, { namespace: "guidelines" });
          if (namespace) {
            await rag.deleteByKey(ctx, {
              namespaceId: namespace.namespaceId,
              key: args.documentId,
            });
          }
        } catch (cleanupError) {
          console.error("RAG rollback failed:", cleanupError);
        }
      }

      if (isTransientIndexingError(e) && attempt < MAX_INDEX_RETRIES) {
        const retryDelay = INDEX_RETRY_DELAYS_MS[attempt];
        const retryNumber = attempt + 1;
        const message = `AI provider was busy. Retry ${retryNumber} of ${MAX_INDEX_RETRIES} scheduled in ${Math.round(retryDelay / 1000)}s.`;

        await ctx.runMutation(internal.documents.markRetryQueued, {
          documentId: args.documentId,
          errorMessage: message,
        });
        await ctx.scheduler.runAfter(retryDelay, internal.documents.indexQueuedDocument, {
          documentId: args.documentId,
          title: args.title,
          attempt: retryNumber,
        });

        shouldDeleteExtractedText = false;
        return;
      }

      await ctx.runMutation(internal.documents.updateStatusWithError, {
        documentId: args.documentId,
        errorMessage: getErrorMessage(e) || "Unknown indexing error",
      });
      throw e;
    } finally {
      if (extractedTextStorageId && shouldDeleteExtractedText) {
        try {
          await ctx.storage.delete(extractedTextStorageId);
        } catch (cleanupError) {
          console.error("Extracted text cleanup failed:", cleanupError);
        }

        try {
          await ctx.runMutation(
            internal.documents.clearExtractedTextStorageReference,
            {
              documentId: args.documentId,
            },
          );
        } catch (cleanupError) {
          console.error("Extracted text reference cleanup failed:", cleanupError);
        }
      }
    }
  },
});

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
    .enum(GUIDELINE_CATEGORIES)
    .describe(
      `The most appropriate category for this ED guideline. Choose exactly one from: ${GUIDELINE_CATEGORY_PROMPT}`,
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
- Classify into the single best-fit category from this ED taxonomy: ${GUIDELINE_CATEGORY_PROMPT}`,
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
    category: v.string(),
    keywords: v.array(v.string()),
    storageId: v.id("_storage"),
    thumbnailStorageId: v.optional(v.id("_storage")),
    uploadedDocumentId: v.id("uploadedDocuments"),
    contentHash: v.string(),
    likelyVersionOf: v.optional(v.id("guidelines")),
    potentialDuplicateOf: v.array(v.id("guidelines")),
  },
  handler: async (ctx, args) => {
    const existingForHash = await ctx.db
      .query("guidelines")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", args.contentHash))
      .collect();
    const activeDuplicate = existingForHash.find((g) => g.status !== "archived");
    if (activeDuplicate) {
      throw new ConvexError({
        code: "DUPLICATE_CONTENT_HASH",
        message: `This file has already been uploaded as "${activeDuplicate.title}". If this is a new version, delete the old one first or use the replace flow.`,
      });
    }

    return await ctx.db.insert("guidelines", {
      title: args.title,
      slug: args.slug,
      category: args.category,
      content: args.content,
      summary: args.summary,
      keywords: args.keywords,
      version: "1.0",
      status: "draft",
      source: "local",
      storageId: args.storageId,
      thumbnailStorageId: args.thumbnailStorageId,
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
    status: documentStatusValidator,
  },
  handler: async (ctx, { documentId, status }) => {
    await ctx.db.patch(documentId, {
      status,
      ...(status === "queued"
        ? {}
        : {
            errorMessage: undefined,
          }),
    });
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
      errorMessage: undefined,
    });
  },
});

export const markRetryQueued = internalMutation({
  args: {
    documentId: v.id("uploadedDocuments"),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { documentId, errorMessage }) => {
    await ctx.db.patch(documentId, {
      status: "queued",
      errorMessage,
    });
    return null;
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
    await requireAdmin(ctx);
    return await ctx.db.query("uploadedDocuments").order("desc").collect();
  },
});

// Get file URL for viewing/downloading
export const getFileUrl = query({
  args: { storageId: v.optional(v.id("_storage")) },
  handler: async (ctx, { storageId }) => {
    await requireCurrentUser(ctx);
    if (!storageId) return null;
    return await ctx.storage.getUrl(storageId);
  },
});

export const setGuidelineThumbnail = mutation({
  args: {
    guidelineId: v.id("guidelines"),
    thumbnailStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, { guidelineId, thumbnailStorageId }) => {
    await requireCurrentUser(ctx);
    const guideline = await ctx.db.get(guidelineId);
    if (!guideline) return null;

    await ctx.db.patch(guidelineId, {
      thumbnailStorageId,
      lastUpdated: Date.now(),
    });

    if (guideline.uploadedDocumentId) {
      await ctx.db.patch(guideline.uploadedDocumentId, {
        thumbnailStorageId,
      });
    }
    return null;
  },
});

export const listWebPdfThumbnails = query({
  args: {
    urls: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      url: v.string(),
      thumbnailUrl: v.union(v.string(), v.null()),
      sourceEtag: v.union(v.string(), v.null()),
      sourceLastModified: v.union(v.string(), v.null()),
      checkedAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, { urls }) => {
    await requireCurrentUser(ctx);
    if (urls.length > 60) {
      throw new ConvexError({
        code: "TOO_MANY_URLS",
        message: "Maximum 60 URLs per thumbnail cache lookup.",
      });
    }

    const normalized = Array.from(
      new Set(
        urls
          .map((url) => normalizeExternalPdfUrl(url))
          .filter((url) => url.length > 0),
      ),
    );

    const rows = await Promise.all(
      normalized.map((url) =>
        ctx.db
          .query("webPdfThumbnails")
          .withIndex("by_url", (q) => q.eq("url", url))
          .first(),
      ),
    );

    const hydrated = await Promise.all(
      rows
        .filter((row): row is NonNullable<typeof row> => !!row)
        .map(async (row) => ({
          url: row.url,
          thumbnailUrl: await ctx.storage.getUrl(row.thumbnailStorageId),
          sourceEtag: row.sourceEtag ?? null,
          sourceLastModified: row.sourceLastModified ?? null,
          checkedAt: row.checkedAt,
          updatedAt: row.updatedAt,
        })),
    );

    return hydrated;
  },
});

export const upsertWebPdfThumbnail = mutation({
  args: {
    url: v.string(),
    thumbnailStorageId: v.id("_storage"),
    sourceEtag: v.optional(v.string()),
    sourceLastModified: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireCurrentUser(ctx);
    const url = normalizeExternalPdfUrl(args.url);
    const now = Date.now();

    const existing = await ctx.db
      .query("webPdfThumbnails")
      .withIndex("by_url", (q) => q.eq("url", url))
      .first();

    if (existing) {
      if (
        existing.thumbnailStorageId &&
        existing.thumbnailStorageId !== args.thumbnailStorageId
      ) {
        await ctx.storage.delete(existing.thumbnailStorageId);
      }

      await ctx.db.patch(existing._id, {
        thumbnailStorageId: args.thumbnailStorageId,
        sourceEtag: args.sourceEtag,
        sourceLastModified: args.sourceLastModified,
        checkedAt: now,
        updatedAt: now,
      });
      return null;
    }

    await ctx.db.insert("webPdfThumbnails", {
      url,
      thumbnailStorageId: args.thumbnailStorageId,
      sourceEtag: args.sourceEtag,
      sourceLastModified: args.sourceLastModified,
      checkedAt: now,
      updatedAt: now,
    });

    return null;
  },
});

// Delete document, its guideline entry, RAG embeddings, and stored file
export const deleteDocument = action({
  args: { documentId: v.id("uploadedDocuments") },
  handler: async (ctx, { documentId }) => {
    await ctx.runQuery(internal.documents.assertAdminAccess, {});
    const doc = await ctx.runQuery(internal.documents.getDocument, {
      documentId,
    });
    if (!doc) throw new Error("Document not found");

    // Delete linked guideline if exists
    if (doc.guidelineId) {
      await ctx.runMutation(internal.documents.deleteGuidelineCascade, {
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
    if (doc.thumbnailStorageId) {
      await ctx.storage.delete(doc.thumbnailStorageId);
    }
    if (doc.extractedTextStorageId) {
      await ctx.storage.delete(doc.extractedTextStorageId);
    }

    // Delete document record
    await ctx.runMutation(internal.documents.removeDocument, { documentId });
  },
});

export const purgeNonLocalContent = action({
  args: {},
  returns: v.object({
    deletedDocuments: v.number(),
    deletedDocumentFiles: v.number(),
    deletedDocumentThumbnails: v.number(),
    deletedGuidelines: v.number(),
    deletedGuidelineVersions: v.number(),
    deletedRagEntries: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx) => {
    await ctx.runQuery(internal.documents.assertAdminAccess, {});
    const report = {
      deletedDocuments: 0,
      deletedDocumentFiles: 0,
      deletedDocumentThumbnails: 0,
      deletedGuidelines: 0,
      deletedGuidelineVersions: 0,
      deletedRagEntries: 0,
      errors: [] as string[],
    };

    const namespace = await rag.getNamespace(ctx, { namespace: "guidelines" });
    const deletedDocumentIds = new Set<string>();

    const allDocuments = (await ctx.runQuery(
      internal.documents.listAllDocumentsForMigration,
      {},
    )) as any[];
    const nonLocalDocuments = allDocuments.filter((doc) => doc.source !== "local");

    for (const doc of nonLocalDocuments) {
      const documentId = String(doc._id);
      try {
        if (namespace) {
          await rag.deleteByKey(ctx, {
            namespaceId: namespace.namespaceId,
            key: doc._id,
          });
          report.deletedRagEntries += 1;
        }
      } catch (error) {
        report.errors.push(
          `Failed RAG cleanup for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      try {
        await ctx.storage.delete(doc.storageId);
        report.deletedDocumentFiles += 1;
      } catch (error) {
        report.errors.push(
          `Failed storage file delete for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      if (doc.thumbnailStorageId) {
        try {
          await ctx.storage.delete(doc.thumbnailStorageId);
          report.deletedDocumentThumbnails += 1;
        } catch (error) {
          report.errors.push(
            `Failed thumbnail delete for document ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      try {
        await ctx.runMutation(internal.documents.removeDocument, {
          documentId: doc._id,
        });
        deletedDocumentIds.add(documentId);
        report.deletedDocuments += 1;
      } catch (error) {
        report.errors.push(
          `Failed document row delete ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const allGuidelines = (await ctx.runQuery(
      internal.documents.listAllGuidelinesForMigration,
      {},
    )) as any[];
    const nonLocalGuidelines = allGuidelines.filter((g) => g.source !== "local");

    for (const guideline of nonLocalGuidelines) {
      const guidelineId = String(guideline._id);

      if (
        namespace &&
        guideline.uploadedDocumentId &&
        !deletedDocumentIds.has(String(guideline.uploadedDocumentId))
      ) {
        try {
          await rag.deleteByKey(ctx, {
            namespaceId: namespace.namespaceId,
            key: guideline.uploadedDocumentId,
          });
          report.deletedRagEntries += 1;
        } catch (error) {
          report.errors.push(
            `Failed RAG cleanup for guideline ${guidelineId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      try {
        const deletedVersions = await ctx.runMutation(
          internal.documents.deleteGuidelineCascade,
          { guidelineId: guideline._id },
        );
        report.deletedGuidelineVersions += deletedVersions;
        report.deletedGuidelines += 1;
      } catch (error) {
        report.errors.push(
          `Failed guideline delete ${guidelineId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return report;
  },
});

export const getDocument = internalQuery({
  args: { documentId: v.id("uploadedDocuments") },
  handler: async (ctx, { documentId }) => {
    return await ctx.db.get(documentId);
  },
});

export const assertAdminAccess = internalQuery({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);
    return admin._id;
  },
});

export const listAllDocumentsForMigration = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("uploadedDocuments").collect();
  },
});

export const listAllGuidelinesForMigration = internalQuery({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("guidelines").collect();
  },
});

// Check if a content hash already exists among non-archived guidelines
export const checkContentHash = internalQuery({
  args: { contentHash: v.string() },
  returns: v.any(),
  handler: async (ctx, { contentHash }) => {
    const matches = await ctx.db
      .query("guidelines")
      .withIndex("by_contentHash", (q) => q.eq("contentHash", contentHash))
      .collect();
    const activeMatch = matches
      .filter((g) => g.status !== "archived")
      .sort((a, b) => b.lastUpdated - a.lastUpdated)[0];
    return activeMatch ?? null;
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
    await requireAdmin(ctx);
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
    await ctx.runQuery(internal.documents.assertAdminAccess, {});
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
            source: "local",
            guidelineId: guidelineId,
            slug: guideline.slug,
            storageId: guideline.storageId ?? "",
          },
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
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

export const deleteGuidelineCascade = internalMutation({
  args: { guidelineId: v.id("guidelines") },
  returns: v.number(),
  handler: async (ctx, { guidelineId }) => {
    const versions = await ctx.db
      .query("guidelineVersions")
      .withIndex("by_guideline", (q) => q.eq("guidelineId", guidelineId))
      .collect();

    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    await ctx.db.delete(guidelineId);
    return versions.length;
  },
});

export const clearExtractedTextStorageReference = internalMutation({
  args: { documentId: v.id("uploadedDocuments") },
  returns: v.null(),
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId);
    if (!doc || !doc.extractedTextStorageId) {
      return null;
    }

    const { _id, _creationTime, extractedTextStorageId, ...rest } = doc;
    void _id;
    void _creationTime;
    void extractedTextStorageId;
    await ctx.db.replace(documentId, rest);
    return null;
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
    return await ctx.db.get(guidelineId);
  },
});
