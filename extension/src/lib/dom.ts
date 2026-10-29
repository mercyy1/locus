// Reading things out of the live page: context around a selection, nearest heading,
// and the page's readable text. Kept separate from the page script so it can be tested.
import { normalizeSpace, truncate } from "./text";

const BLOCK = "p,li,td,th,dd,dt,blockquote,pre,h1,h2,h3,h4,h5,h6,figcaption,caption,section,article,div,main,body";
const CONTEXT_CHARS = 160;

function elementOf(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

function blockOf(node: Node, doc: Document): Element {
  return elementOf(node)?.closest(BLOCK) ?? doc.body;
}

// Text right before and after the selection, staying inside the same paragraph.
// Text fragments only match within a block, so context from the previous paragraph would break the link.
export function contextAround(range: Range, doc: Document = document): { prefix: string; suffix: string } {
  const before = doc.createRange();
  before.selectNodeContents(blockOf(range.startContainer, doc));
  before.setEnd(range.startContainer, range.startOffset);

  const after = doc.createRange();
  after.selectNodeContents(blockOf(range.endContainer, doc));
  after.setStart(range.endContainer, range.endOffset);

  return {
    prefix: before.toString().replace(/\s+/g, " ").slice(-CONTEXT_CHARS),
    suffix: after.toString().replace(/\s+/g, " ").slice(0, CONTEXT_CHARS),
  };
}

export function nearestHeading(node: Node, doc: Document = document): string | undefined {
  let best: Element | undefined;
  for (const h of Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"))) {
    if (h.contains(node)) {
      best = h;
      break;
    }
    if (h.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) best = h;
    else break;
  }
  const text = best ? normalizeSpace(best.textContent ?? "") : "";
  return text ? truncate(text, 200) : undefined;
}

// The page's main text. innerText skips hidden elements, which also drops
// text that's on the page but not visible (a common prompt-injection trick).
export function readableText(doc: Document = document): string {
  const articles = Array.from(doc.querySelectorAll("article"));
  const main = doc.querySelector("main, [role='main']");
  const pick =
    articles.sort((a, b) => textOf(b).length - textOf(a).length)[0] ??
    main ??
    doc.body;
  const text = pick ? textOf(pick) : "";
  return text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function textOf(el: Element): string {
  const html = el as HTMLElement;
  // jsdom (tests) has no innerText
  return typeof html.innerText === "string" ? html.innerText : (el.textContent ?? "");
}

// Clean up a selection: keep paragraph breaks, squash everything else
export function cleanSelectionText(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
