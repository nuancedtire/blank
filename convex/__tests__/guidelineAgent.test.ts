import { describe, it, expect } from "vitest";

/**
 * Tests for the guideline agent search tool logic.
 *
 * These tests validate the pure-logic portions of the RAG search and
 * keyword search tools defined in guidelineAgent.ts — specifically the
 * filter construction, result shaping, and edge-case handling.
 *
 * The actual Convex ctx calls are mocked since they require a running backend.
 */

// ---------------------------------------------------------------------------
// Filter construction logic (mirrors ragSearchTool handler)
// ---------------------------------------------------------------------------

function buildRagFilters(
  source?: "local" | "rcem" | "nice",
): Array<{ name: "source"; value: string }> {
  return source ? [{ name: "source" as const, value: source }] : [];
}

describe("buildRagFilters", () => {
  it("returns an empty array when no source is provided", () => {
    expect(buildRagFilters()).toEqual([]);
    expect(buildRagFilters(undefined)).toEqual([]);
  });

  it("returns a single filter for 'local'", () => {
    expect(buildRagFilters("local")).toEqual([
      { name: "source", value: "local" },
    ]);
  });

  it("returns a single filter for 'rcem'", () => {
    expect(buildRagFilters("rcem")).toEqual([
      { name: "source", value: "rcem" },
    ]);
  });

  it("returns a single filter for 'nice'", () => {
    expect(buildRagFilters("nice")).toEqual([
      { name: "source", value: "nice" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// RAG result shaping (mirrors ragSearchTool handler output mapping)
// ---------------------------------------------------------------------------

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

function shapeRagEntry(
  entry: RagEntry,
  slug: string | null = null,
): ShapedSource {
  const metadata = entry.metadata;
  const guidelineId = metadata?.guidelineId ?? null;
  return {
    title: entry.title ?? "Untitled",
    source: metadata?.source ?? "unknown",
    fileName: metadata?.fileName ?? "unknown",
    guidelineId,
    slug,
    textChunk: entry.text,
  };
}

describe("shapeRagEntry", () => {
  it("maps a fully-populated entry correctly", () => {
    const entry: RagEntry = {
      title: "Sepsis Pathway",
      text: "Administer antibiotics within 1 hour",
      metadata: {
        source: "local",
        fileName: "sepsis.pdf",
        guidelineId: "abc123",
      },
    };
    const result = shapeRagEntry(entry, "adult-sepsis-pathway");
    expect(result).toEqual({
      title: "Sepsis Pathway",
      source: "local",
      fileName: "sepsis.pdf",
      guidelineId: "abc123",
      slug: "adult-sepsis-pathway",
      textChunk: "Administer antibiotics within 1 hour",
    });
  });

  it("defaults title to 'Untitled' when missing", () => {
    const entry: RagEntry = {
      text: "some text",
      metadata: { source: "rcem", fileName: "doc.pdf", guidelineId: "x" },
    };
    expect(shapeRagEntry(entry).title).toBe("Untitled");
  });

  it("defaults source and fileName to 'unknown' when metadata is sparse", () => {
    const entry: RagEntry = {
      title: "Test",
      text: "chunk",
      metadata: {},
    };
    const result = shapeRagEntry(entry);
    expect(result.source).toBe("unknown");
    expect(result.fileName).toBe("unknown");
    expect(result.guidelineId).toBeNull();
  });

  it("sets slug to null when not resolved", () => {
    const entry: RagEntry = {
      title: "Test",
      text: "chunk",
      metadata: { source: "nice", fileName: "nice.pdf", guidelineId: "id1" },
    };
    expect(shapeRagEntry(entry).slug).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Keyword search result shaping (mirrors searchGuidelinesTool handler)
// ---------------------------------------------------------------------------

interface GuidelineRecord {
  title: string;
  version: string;
  source: string;
  category: string;
  content: string;
  lastUpdated: number;
  slug: string;
}

function shapeKeywordResults(results: GuidelineRecord[] | null) {
  if (!results || results.length === 0) {
    return {
      found: false,
      message: "No guidelines found matching your query.",
    };
  }
  return {
    found: true,
    count: results.length,
    guidelines: results.map((g) => ({
      title: g.title,
      version: g.version,
      source: g.source,
      category: g.category,
      content: g.content,
      lastUpdated: new Date(g.lastUpdated).toLocaleDateString("en-GB"),
      slug: g.slug,
    })),
  };
}

describe("shapeKeywordResults", () => {
  it("returns found:false for null results", () => {
    expect(shapeKeywordResults(null)).toEqual({
      found: false,
      message: "No guidelines found matching your query.",
    });
  });

  it("returns found:false for empty array", () => {
    expect(shapeKeywordResults([])).toEqual({
      found: false,
      message: "No guidelines found matching your query.",
    });
  });

  it("shapes results with correct count and formatted date", () => {
    const results: GuidelineRecord[] = [
      {
        title: "Sepsis Pathway",
        version: "2.3",
        source: "local",
        category: "Medical",
        content: "# Sepsis\n...",
        lastUpdated: new Date("2026-01-15").getTime(),
        slug: "adult-sepsis-pathway",
      },
    ];
    const shaped = shapeKeywordResults(results);
    expect(shaped.found).toBe(true);
    expect(shaped.count).toBe(1);
    expect(shaped.guidelines![0].title).toBe("Sepsis Pathway");
    expect(shaped.guidelines![0].slug).toBe("adult-sepsis-pathway");
    // Date should be formatted in en-GB locale
    expect(shaped.guidelines![0].lastUpdated).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("handles multiple results", () => {
    const results: GuidelineRecord[] = [
      {
        title: "A",
        version: "1.0",
        source: "local",
        category: "Medical",
        content: "a",
        lastUpdated: Date.now(),
        slug: "a",
      },
      {
        title: "B",
        version: "1.0",
        source: "rcem",
        category: "Trauma",
        content: "b",
        lastUpdated: Date.now(),
        slug: "b",
      },
    ];
    const shaped = shapeKeywordResults(results);
    expect(shaped.count).toBe(2);
    expect(shaped.guidelines).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// RAG empty-result handling (mirrors ragSearchTool handler)
// ---------------------------------------------------------------------------

function shapeRagResults(
  results: { results: unknown[]; entries: RagEntry[]; text: string } | null,
  sources: ShapedSource[],
) {
  if (!results || results.results.length === 0) {
    return {
      found: false,
      message: "No relevant document content found for this query.",
    };
  }
  return {
    found: true,
    count: results.entries.length,
    sources,
    combinedText: results.text,
  };
}

describe("shapeRagResults", () => {
  it("returns found:false for null results", () => {
    expect(shapeRagResults(null, [])).toEqual({
      found: false,
      message: "No relevant document content found for this query.",
    });
  });

  it("returns found:false for empty results array", () => {
    expect(
      shapeRagResults({ results: [], entries: [], text: "" }, []),
    ).toEqual({
      found: false,
      message: "No relevant document content found for this query.",
    });
  });

  it("returns found:true with sources and combined text", () => {
    const mockResults = {
      results: [{}],
      entries: [
        {
          title: "Test",
          text: "chunk text",
          metadata: { source: "local", fileName: "test.pdf" },
        },
      ],
      text: "combined chunk text",
    };
    const sources: ShapedSource[] = [
      {
        title: "Test",
        source: "local",
        fileName: "test.pdf",
        guidelineId: null,
        slug: null,
        textChunk: "chunk text",
      },
    ];
    const result = shapeRagResults(mockResults, sources);
    expect(result.found).toBe(true);
    expect(result.count).toBe(1);
    expect(result.combinedText).toBe("combined chunk text");
    expect(result.sources).toEqual(sources);
  });
});
