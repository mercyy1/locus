import { describe, expect, it } from "vitest";
import { buildIndex, parseQuery, search } from "../../src/lib/search";
import { makeItem } from "./helpers";

const items = [
  makeItem({ text: "Commuting time fell by a third after the switch to remote work.", title: "Remote work survey" }),
  makeItem({ text: "Bike lanes cut collisions by 20 percent in the first year.", title: "City transport report", note: "use for intro" }),
  makeItem({ text: "Students who commute more than an hour report lower grades.", title: "Student commuting study" }),
];

describe("search", () => {
  const index = buildIndex(items);

  it("returns everything for an empty query", () => {
    expect(search(index, "  ")).toHaveLength(3);
  });

  it("matches word starts", () => {
    const hits = search(index, "commut");
    expect(hits.map((h) => h.item.text)).toEqual(
      expect.arrayContaining([items[0].text, items[2].text]),
    );
    expect(hits).toHaveLength(2);
  });

  it("searches notes and titles too", () => {
    expect(search(index, "intro")[0].item).toBe(items[1]);
    expect(search(index, "transport")[0].item).toBe(items[1]);
  });

  it("needs all words when it can", () => {
    expect(search(index, "commute grades")).toHaveLength(1);
  });

  it("supports exact phrases in quotes", () => {
    expect(search(index, '"by a third"').map((h) => h.item)).toEqual([items[0]]);
    expect(search(index, '"by a quarter"')).toHaveLength(0);
  });

  it("parses mixed queries", () => {
    expect(parseQuery('remote "by a third" work')).toEqual({ phrases: ["by a third"], rest: "remote work" });
  });

  // From the storage test in the plan: search across 1,000 passages in under a second
  it("searches 1,000 passages quickly", () => {
    const many = Array.from({ length: 1000 }, (_, i) =>
      makeItem({ text: `Passage ${i} about topic ${i % 37} with some filler words like research memory and sources.` }),
    );
    const t0 = performance.now();
    const idx = buildIndex(many);
    const hits = search(idx, "topic research");
    const ms = performance.now() - t0;
    expect(hits.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(1000);
  });
});
