import { describe, it, expect } from "vitest";
import { ED_GUIDELINES_SYSTEM_PROMPT } from "./guidelineAgent";

describe("ED_GUIDELINES_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof ED_GUIDELINES_SYSTEM_PROMPT).toBe("string");
    expect(ED_GUIDELINES_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it("mentions the emergency department role", () => {
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("Emergency Department");
  });

  it("describes the search strategy with source priority order", () => {
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("local");
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("RCEM");
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("NICE");
    // Verify the priority order: local → RCEM → NICE
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain(
      "Search local trust guidelines first, then RCEM, then NICE",
    );
  });

  it("includes search strategy instructions", () => {
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("SEARCH STRATEGY");
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("ragSearch");
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("searchGuidelines");
  });

  it("includes a safety disclaimer about referring to full guidelines", () => {
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain(
      "always refer to the full guideline for complete clinical guidance",
    );
  });

  it("instructs the agent to always answer using guideline content", () => {
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain(
      "ALWAYS answer using the guideline content",
    );
  });

  it("instructs to cite sources with the expected format", () => {
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("📄");
    expect(ED_GUIDELINES_SYSTEM_PROMPT).toContain("Slug:");
  });
});
