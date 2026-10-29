// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { cleanSelectionText, contextAround, nearestHeading, readableText } from "../../src/lib/dom";

function setup(html: string) {
  document.body.innerHTML = html;
}

function rangeOver(el: Element, start: number, end: number): Range {
  const text = el.firstChild!;
  const r = document.createRange();
  r.setStart(text, start);
  r.setEnd(text, end);
  return r;
}

describe("page reading", () => {
  it("takes context from the same paragraph only", () => {
    setup(`<h2>Results</h2><p>First paragraph ends here.</p><p id="p">Commute time fell by a third in the survey.</p>`);
    const p = document.getElementById("p")!;
    // select "fell by a third"
    const r = rangeOver(p, 13, 28);
    expect(r.toString()).toBe("fell by a third");
    const { prefix, suffix } = contextAround(r);
    expect(prefix).toBe("Commute time ");
    expect(suffix).toBe(" in the survey.");
  });

  it("finds the nearest heading above", () => {
    setup(`<h1>Report</h1><h2>Methods</h2><p>a</p><h2 id="res">Results</h2><p id="p">the passage</p><h2>Later</h2>`);
    expect(nearestHeading(document.getElementById("p")!.firstChild!)).toBe("Results");
  });

  it("returns nothing when there's no heading", () => {
    setup(`<p id="p">no headings here</p>`);
    expect(nearestHeading(document.getElementById("p")!.firstChild!)).toBeUndefined();
  });

  it("prefers the article over the whole page", () => {
    setup(`<nav>Home About</nav><article><p>The real content.</p></article><footer>©</footer>`);
    expect(readableText()).toBe("The real content.");
  });

  it("tidies selections", () => {
    expect(cleanSelectionText("  one  two \n\n\n\n three  ")).toBe("one two\n\nthree");
  });
});
