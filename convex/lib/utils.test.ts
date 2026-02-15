import { describe, it, expect } from "vitest";
import { slugify } from "./utils";

describe("slugify", () => {
  it("converts a normal title to a slug", () => {
    expect(slugify("Chest Pain Protocol")).toBe("chest-pain-protocol");
  });

  it("handles special characters and unicode dashes", () => {
    expect(slugify("STEMI — Acute Management!")).toBe("stemi-acute-management");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("--hello-world--")).toBe("hello-world");
  });

  it("collapses multiple consecutive special characters into a single hyphen", () => {
    expect(slugify("foo!!!bar???baz")).toBe("foo-bar-baz");
  });

  it("returns an empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("handles a string of only special characters", () => {
    expect(slugify("!@#$%^&*()")).toBe("");
  });

  it("preserves numbers", () => {
    expect(slugify("COVID-19 Protocol v2")).toBe("covid-19-protocol-v2");
  });
});
