import { describe, expect, it } from "vitest";
import { bestLink, linkWarning } from "../../src/lib/links";

describe("link checks", () => {
  it("flags library proxy links", () => {
    expect(linkWarning("https://www-jstor-org.ezproxy.example.ca/stable/123")).toMatch(/proxy/);
  });

  it("flags session links", () => {
    expect(linkWarning("https://search.example.com/doc/1?accountid=999")).toMatch(/session/);
    expect(linkWarning("https://db.example.com/view;jsessionid=ABC123")).toMatch(/session/);
  });

  it("leaves normal links alone", () => {
    expect(linkWarning("https://en.wikipedia.org/wiki/Commuting")).toBeUndefined();
    expect(linkWarning("not a url")).toBeUndefined();
  });

  it("prefers permalink, then DOI, then canonical", () => {
    const base = { url: "https://a.example/x?sid=1", canonicalUrl: "https://a.example/x" };
    expect(bestLink(base)).toBe("https://a.example/x");
    expect(bestLink({ ...base, doi: "10.1/x" })).toBe("https://doi.org/10.1/x");
    expect(bestLink({ ...base, doi: "10.1/x", permalink: "https://perma.example/1" })).toBe("https://perma.example/1");
  });
});
