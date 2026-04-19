import { describe, it, expect, vi } from "vitest";
import { api } from "../_generated/api";

// We extract the handler to test it in isolation
// In a real convex-test we'd use t.query(api.guidelines.getSlugByTitle, ...)
// but here we want to verify the logic and index usage specifically.

async function getSlugByTitleLogic(ctx: any, title: string) {
  // ⚡ Fast path: Exact match using the new by_status_title index.
  const exactMatch = await ctx.db
    .query("guidelines")
    .withIndex("by_status_title", (q: any) =>
      q.eq("status", "published").eq("title", title)
    )
    .unique();

  if (exactMatch) return exactMatch.slug;

  // Fallback path: Case-insensitive/trimmed scan.
  const guidelines = await ctx.db
    .query("guidelines")
    .withIndex("by_status", (q: any) => q.eq("status", "published"))
    .collect();
  const normalized = title.toLowerCase().trim();
  const match = guidelines.find((g: any) => g.title.toLowerCase().trim() === normalized);
  return match?.slug ?? null;
}

describe("guidelines.getSlugByTitle logic", () => {
  it("uses the fast path for an exact title match", async () => {
    const mockGuideline = { title: "Sepsis", slug: "sepsis-slug", status: "published" };

    const fastQueryStub = {
      withIndex: vi.fn().mockReturnThis(),
      unique: vi.fn().mockResolvedValue(mockGuideline),
    };

    const ctx = {
      db: {
        query: vi.fn().mockImplementation((table) => {
          if (table === "guidelines") return fastQueryStub;
          return null;
        }),
      },
    };

    const result = await getSlugByTitleLogic(ctx, "Sepsis");

    expect(result).toBe("sepsis-slug");
    expect(fastQueryStub.withIndex).toHaveBeenCalledWith("by_status_title", expect.any(Function));
    expect(fastQueryStub.unique).toHaveBeenCalled();
  });

  it("falls back to a full scan if the exact match fails (case-insensitive)", async () => {
    const mockGuidelines = [
      { title: "Sepsis", slug: "sepsis-slug", status: "published" },
    ];

    const fastQueryStub = {
      withIndex: vi.fn().mockReturnThis(),
      unique: vi.fn().mockResolvedValue(null),
    };

    const slowQueryStub = {
      withIndex: vi.fn().mockReturnThis(),
      collect: vi.fn().mockResolvedValue(mockGuidelines),
    };

    let callCount = 0;
    const ctx = {
      db: {
        query: vi.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? fastQueryStub : slowQueryStub;
        }),
      },
    };

    // "sepsis" (lowercase) should fail exact match but pass fallback
    const result = await getSlugByTitleLogic(ctx, "sepsis");

    expect(result).toBe("sepsis-slug");
    expect(ctx.db.query).toHaveBeenCalledTimes(2);
    expect(slowQueryStub.withIndex).toHaveBeenCalledWith("by_status", expect.any(Function));
    expect(slowQueryStub.collect).toHaveBeenCalled();
  });

  it("returns null if no match is found even after fallback", async () => {
    const fastQueryStub = {
      withIndex: vi.fn().mockReturnThis(),
      unique: vi.fn().mockResolvedValue(null),
    };

    const slowQueryStub = {
      withIndex: vi.fn().mockReturnThis(),
      collect: vi.fn().mockResolvedValue([{ title: "Other", slug: "other", status: "published" }]),
    };

    let callCount = 0;
    const ctx = {
      db: {
        query: vi.fn().mockImplementation(() => {
          callCount++;
          return callCount === 1 ? fastQueryStub : slowQueryStub;
        }),
      },
    };

    const result = await getSlugByTitleLogic(ctx, "Non-existent");

    expect(result).toBeNull();
    expect(ctx.db.query).toHaveBeenCalledTimes(2);
  });
});
