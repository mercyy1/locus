// Runs inside the page, only after the user saves something (activeTab).
// The background worker injects this file, then calls the functions on window.__locus.
import { extractSource } from "../lib/metadata";
import { cleanSelectionText, contextAround, nearestHeading, readableText } from "../lib/dom";
import type { CapturePayload } from "../lib/types";
import { showSavedCard } from "./savedCard";

type LocusPage = {
  capture(kind: "passage" | "page"): CapturePayload | null;
  showSaved(opts: { id: string; collectionName: string; limited: boolean; kind: "passage" | "page" }): void;
  alive(): boolean;
};

declare global {
  interface Window {
    __locus?: LocusPage;
  }
}

let lastRange: Range | null = null;

function capture(kind: "passage" | "page"): CapturePayload | null {
  const source = extractSource(document, location.href);
  const pageText = readableText();

  if (kind === "page") {
    lastRange = null;
    const description =
      document.querySelector<HTMLMetaElement>('meta[name="description"], meta[property="og:description"]')?.content?.trim() ||
      pageText.slice(0, 280);
    return { kind, text: description, source, pageText };
  }

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const text = cleanSelectionText(sel.toString());
  if (!text) return null;

  const range = sel.getRangeAt(0);
  lastRange = range.cloneRange();
  const { prefix, suffix } = contextAround(range);

  return {
    kind,
    text,
    prefix,
    suffix,
    heading: nearestHeading(range.startContainer),
    source,
    pageText,
  };
}

// Mark the saved words on the page with the Custom Highlight API,
// which colours text without touching the page's HTML
function highlight(range: Range) {
  if (typeof Highlight === "undefined" || !CSS.highlights) return;
  const existing = CSS.highlights.get("locus-saved") ?? new Highlight();
  existing.add(range);
  CSS.highlights.set("locus-saved", existing);
  if (!document.getElementById("locus-highlight-style")) {
    const style = document.createElement("style");
    style.id = "locus-highlight-style";
    style.textContent = "::highlight(locus-saved) { background-color: #ffe08a; color: inherit; }";
    (document.head ?? document.documentElement).appendChild(style);
  }
}

function showSaved(opts: { id: string; collectionName: string; limited: boolean; kind: "passage" | "page" }) {
  const range = opts.kind === "passage" ? lastRange : null;
  if (range) {
    highlight(range);
    window.getSelection()?.removeAllRanges();
  }
  showSavedCard({ ...opts, anchor: range?.getBoundingClientRect() ?? null });
}

// Injecting twice is harmless; keep the first copy so its state survives.
// After the extension reloads, the old copy loses its connection, so replace it.
if (!window.__locus || !window.__locus.alive()) {
  window.__locus = { capture, showSaved, alive: () => !!chrome.runtime?.id };
}
