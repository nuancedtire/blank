import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Tests for document processing logic from documents.ts.
 *
 * Covers slug generation, the LLM metadata validation schema,
 * and category classification constants.
 */

// ---------------------------------------------------------------------------
// Slug generation (mirrors indexDocument handler)
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("generateSlug", () => {
  it("converts a simple title to a slug", () => {
    expect(generateSlug("Adult Sepsis Pathway")).toBe("adult-sepsis-pathway");
  });

  it("strips special characters", () => {
    expect(generateSlug("Paediatric (Febrile) Child — v2.1")).toBe(
      "paediatric-febrile-child-v2-1",
    );
  });

  it("trims leading and trailing hyphens", () => {
    expect(generateSlug("---Hello World---")).toBe("hello-world");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(generateSlug("CT   Head   Scan")).toBe("ct-head-scan");
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(generateSlug("!@#$%^&*()")).toBe("");
  });

  it("preserves numbers", () => {
    expect(generateSlug("NEWS2 Score Assessment")).toBe(
      "news2-score-assessment",
    );
  });
});

// ---------------------------------------------------------------------------
// DocumentMetadataSchema validation (mirrors documents.ts schema)
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = [
  "Medical",
  "Trauma",
  "Resuscitation",
  "Paediatrics",
  "Policies",
  "Other",
] as const;

const DocumentMetadataSchema = z.object({
  hasUsableContent: z.boolean(),
  errorReason: z.string(),
  title: z.string(),
  summary: z.string(),
  category: z.enum(VALID_CATEGORIES),
  tags: z.array(z.string()),
  cleanedContent: z.string(),
});

describe("DocumentMetadataSchema", () => {
  const validPayload = {
    hasUsableContent: true,
    errorReason: "",
    title: "Adult Sepsis Pathway",
    summary: "Sepsis recognition and management for adults in ED.",
    category: "Medical" as const,
    tags: ["sepsis", "antibiotics", "lactate"],
    cleanedContent: "# Adult Sepsis Pathway\n\n...",
  };

  it("accepts a valid payload", () => {
    const result = DocumentMetadataSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = DocumentMetadataSchema.safeParse({
      hasUsableContent: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = DocumentMetadataSchema.safeParse({
      ...validPayload,
      category: "InvalidCategory",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid categories", () => {
    for (const category of VALID_CATEGORIES) {
      const result = DocumentMetadataSchema.safeParse({
        ...validPayload,
        category,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects non-boolean hasUsableContent", () => {
    const result = DocumentMetadataSchema.safeParse({
      ...validPayload,
      hasUsableContent: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-array tags", () => {
    const result = DocumentMetadataSchema.safeParse({
      ...validPayload,
      tags: "sepsis",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty tags array", () => {
    const result = DocumentMetadataSchema.safeParse({
      ...validPayload,
      tags: [],
    });
    expect(result.success).toBe(true);
  });

  it("validates an unusable-content response", () => {
    const result = DocumentMetadataSchema.safeParse({
      hasUsableContent: false,
      errorReason: "Text appears to be OCR noise with no readable content",
      title: "",
      summary: "",
      category: "Other",
      tags: [],
      cleanedContent: "",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Category constants
// ---------------------------------------------------------------------------

describe("VALID_CATEGORIES", () => {
  it("contains exactly 6 categories", () => {
    expect(VALID_CATEGORIES).toHaveLength(6);
  });

  it("includes the expected clinical categories", () => {
    expect(VALID_CATEGORIES).toContain("Medical");
    expect(VALID_CATEGORIES).toContain("Trauma");
    expect(VALID_CATEGORIES).toContain("Resuscitation");
    expect(VALID_CATEGORIES).toContain("Paediatrics");
    expect(VALID_CATEGORIES).toContain("Policies");
    expect(VALID_CATEGORIES).toContain("Other");
  });
});
