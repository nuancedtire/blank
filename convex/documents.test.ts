import { describe, it, expect } from "vitest";
import { DocumentMetadataSchema, VALID_CATEGORIES } from "./documents";

describe("VALID_CATEGORIES", () => {
  it("contains the expected categories", () => {
    expect(VALID_CATEGORIES).toEqual([
      "Medical",
      "Trauma",
      "Resuscitation",
      "Paediatrics",
      "Policies",
      "Other",
    ]);
  });
});

describe("DocumentMetadataSchema", () => {
  const validMetadata = {
    hasUsableContent: true,
    errorReason: "",
    title: "Chest Pain Assessment",
    summary: "Guideline for assessing chest pain in the ED.",
    category: "Medical" as const,
    tags: ["chest pain", "ACS", "troponin"],
    cleanedContent: "# Chest Pain Assessment\n\nContent here...",
  };

  it("parses valid complete metadata", () => {
    const result = DocumentMetadataSchema.safeParse(validMetadata);
    expect(result.success).toBe(true);
  });

  it("fails when required fields are missing", () => {
    const { title: _title, ...incomplete } = validMetadata;
    const result = DocumentMetadataSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("fails with an invalid category value", () => {
    const result = DocumentMetadataSchema.safeParse({
      ...validMetadata,
      category: "InvalidCategory",
    });
    expect(result.success).toBe(false);
  });

  it("accepts every valid category", () => {
    for (const category of VALID_CATEGORIES) {
      const result = DocumentMetadataSchema.safeParse({
        ...validMetadata,
        category,
      });
      expect(result.success).toBe(true);
    }
  });

  it("validates tags as an array of strings", () => {
    const result = DocumentMetadataSchema.safeParse({
      ...validMetadata,
      tags: [123, true],
    });
    expect(result.success).toBe(false);
  });

  it("fails when hasUsableContent is not a boolean", () => {
    const result = DocumentMetadataSchema.safeParse({
      ...validMetadata,
      hasUsableContent: "yes",
    });
    expect(result.success).toBe(false);
  });
});
