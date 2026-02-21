import { describe, expect, it } from "vitest";

interface RagEntry {
  title?: string;
  text: string;
  metadata: Record<string, string>;
}

interface ShapedSource {
  title: string;
  source: string;
  fileName: string;
  guidelineId: string | null;
  slug: string | null;
  textChunk: string;
}

function shapeRagEntry(entry: RagEntry): ShapedSource {
  const metadata = entry.metadata;
  return {
    title: entry.title ?? "Untitled",
    source: metadata?.source ?? "local",
    fileName: metadata?.fileName ?? "unknown",
    guidelineId: metadata?.guidelineId ?? null,
    slug: metadata?.slug ?? null,
    textChunk: entry.text,
  };
}

describe("shapeRagEntry", () => {
  it("maps a fully-populated entry including slug metadata", () => {
    const entry: RagEntry = {
      title: "Sepsis Pathway",
      text: "Administer antibiotics within 1 hour",
      metadata: {
        source: "local",
        fileName: "sepsis.pdf",
        guidelineId: "abc123",
        slug: "adult-sepsis-pathway-1",
      },
    };

    expect(shapeRagEntry(entry)).toEqual({
      title: "Sepsis Pathway",
      source: "local",
      fileName: "sepsis.pdf",
      guidelineId: "abc123",
      slug: "adult-sepsis-pathway-1",
      textChunk: "Administer antibiotics within 1 hour",
    });
  });

  it("defaults missing fields", () => {
    const entry: RagEntry = {
      text: "chunk",
      metadata: {},
    };

    expect(shapeRagEntry(entry)).toEqual({
      title: "Untitled",
      source: "local",
      fileName: "unknown",
      guidelineId: null,
      slug: null,
      textChunk: "chunk",
    });
  });
});

interface GuidelineRecord {
  title: string;
  version: string;
  source: "local";
  category: string;
  content: string;
  lastUpdated: number;
  slug: string;
}

function shapeKeywordResults(results: GuidelineRecord[] | null) {
  const MAX_RESULTS = 5;
  const MAX_EXCERPT_CHARS = 900;

  if (!results || results.length === 0) {
    return {
      found: false,
      message: "No guidelines found matching your query.",
    };
  }

  const trimmed = results.slice(0, MAX_RESULTS);
  return {
    found: true,
    count: trimmed.length,
    guidelines: trimmed.map((g) => ({
      title: g.title,
      version: g.version,
      source: g.source,
      category: g.category,
      excerpt: g.content.slice(0, MAX_EXCERPT_CHARS),
      lastUpdated: new Date(g.lastUpdated).toLocaleDateString("en-GB"),
      slug: g.slug,
    })),
  };
}

describe("shapeKeywordResults", () => {
  it("returns found:false for empty results", () => {
    expect(shapeKeywordResults(null)).toEqual({
      found: false,
      message: "No guidelines found matching your query.",
    });
    expect(shapeKeywordResults([])).toEqual({
      found: false,
      message: "No guidelines found matching your query.",
    });
  });

  it("returns compact guidelines with excerpts", () => {
    const results: GuidelineRecord[] = [
      {
        title: "Sepsis Pathway",
        version: "2.3",
        source: "local",
        category: "Medical",
        content: "A".repeat(1200),
        lastUpdated: new Date("2026-01-15").getTime(),
        slug: "adult-sepsis-pathway",
      },
    ];

    const shaped = shapeKeywordResults(results);
    expect(shaped.found).toBe(true);
    expect(shaped.count).toBe(1);
    expect(shaped.guidelines?.[0]?.excerpt.length).toBe(900);
    expect(shaped.guidelines?.[0]?.slug).toBe("adult-sepsis-pathway");
  });

  it("caps returned result count", () => {
    const results = Array.from({ length: 7 }).map((_, i) => ({
      title: `Guideline ${i}`,
      version: "1.0",
      source: "local" as const,
      category: "Medical",
      content: "content",
      lastUpdated: Date.now(),
      slug: `guideline-${i}`,
    }));

    const shaped = shapeKeywordResults(results);
    expect(shaped.count).toBe(5);
    expect(shaped.guidelines).toHaveLength(5);
  });
});
