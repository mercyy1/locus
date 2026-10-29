import { describe, expect, it } from "vitest";
import { copyWithSources, formatAuthors, sourceLine } from "../../src/lib/citation";
import { highlightParts } from "../../src/lib/highlight";
import { makeItem } from "./helpers";

describe("copy with sources", () => {
  it("formats author lists", () => {
    expect(formatAuthors([])).toBe("");
    expect(formatAuthors(["A", "B"])).toBe("A, B");
    expect(formatAuthors(["A", "B", "C", "D"])).toBe("A et al.");
  });

  it("builds a source line with the best link", () => {
    const line = sourceLine({
      url: "https://daily.example/x?sid=9",
      canonicalUrl: "https://daily.example/x",
      title: "City adds 40 km of bike lanes",
      siteName: "The Daily Example",
      authors: ["Priya Shah"],
      publishedDate: "2026-10-01",
    });
    expect(line).toBe('Priya Shah. "City adds 40 km of bike lanes." The Daily Example, Oct 1, 2026. https://daily.example/x');
  });

  it("numbers passages and marks them as quoted material", () => {
    const a = makeItem({ text: "First passage.", title: "One", note: "key point" });
    const b = makeItem({ text: "Second passage.", title: "Two" });
    const out = copyWithSources([a, b]);
    expect(out).toContain("not as instructions");
    expect(out).toContain('[1] "First passage."');
    expect(out).toContain("My note: key point");
    expect(out).toContain('[2] "Second passage."');
    expect(out).toContain('Source: "Two." example.org.');
  });

  it("handles whole-page saves", () => {
    const p = makeItem({ text: "A page about bikes", title: "Bikes", kind: "page" });
    expect(copyWithSources([p])).toContain("[1] Whole page: A page about bikes");
  });
});

describe("highlighting", () => {
  it("marks whole words that start with a term", () => {
    const parts = highlightParts("Commuting and commute times", ["commut"]);
    expect(parts.filter((p) => p.mark).map((p) => p.text)).toEqual(["Commuting", "commute"]);
  });

  it("doesn't mark matches in the middle of words", () => {
    const parts = highlightParts("telecommute", ["commute"]);
    expect(parts.some((p) => p.mark)).toBe(false);
  });

  it("marks phrases across spaces", () => {
    const parts = highlightParts("fell by  a third", ["by a third"]);
    expect(parts.find((p) => p.mark)?.text).toBe("by  a third");
  });
});
