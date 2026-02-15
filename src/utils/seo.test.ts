import { describe, it, expect } from "vitest";
import { seo } from "./seo";

describe("seo", () => {
  it("returns base meta tags with just a title", () => {
    const tags = seo({ title: "My Page" });

    expect(tags).toContainEqual({ title: "My Page" });
    expect(tags).toContainEqual({ name: "og:title", content: "My Page" });
    expect(tags).toContainEqual({ name: "twitter:title", content: "My Page" });
    expect(tags).toContainEqual({ name: "og:type", content: "website" });
  });

  it("includes description and keywords when provided", () => {
    const tags = seo({
      title: "Test",
      description: "A test page",
      keywords: "test, vitest",
    });

    expect(tags).toContainEqual({ name: "description", content: "A test page" });
    expect(tags).toContainEqual({ name: "keywords", content: "test, vitest" });
    expect(tags).toContainEqual({
      name: "og:description",
      content: "A test page",
    });
    expect(tags).toContainEqual({
      name: "twitter:description",
      content: "A test page",
    });
  });

  it("adds image tags when image is provided", () => {
    const tags = seo({ title: "With Image", image: "https://example.com/img.png" });

    expect(tags).toContainEqual({
      name: "og:image",
      content: "https://example.com/img.png",
    });
    expect(tags).toContainEqual({
      name: "twitter:image",
      content: "https://example.com/img.png",
    });
    expect(tags).toContainEqual({
      name: "twitter:card",
      content: "summary_large_image",
    });
  });

  it("does not include image tags when image is omitted", () => {
    const tags = seo({ title: "No Image" });

    const tagNames = tags.map((t) => ("name" in t ? t.name : undefined));
    expect(tagNames).not.toContain("og:image");
    expect(tagNames).not.toContain("twitter:image");
    expect(tagNames).not.toContain("twitter:card");
  });

  it("includes all fields when every option is provided", () => {
    const tags = seo({
      title: "Full",
      description: "desc",
      keywords: "a, b",
      image: "https://example.com/full.png",
    });

    // Base tags (10) + image tags (3) = 13
    expect(tags).toHaveLength(13);
  });
});
