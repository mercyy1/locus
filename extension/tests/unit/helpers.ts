import type { SavedItem } from "../../src/lib/types";

let n = 0;

export function makeItem(o: { text: string; title?: string; note?: string; kind?: "passage" | "page" }): SavedItem {
  n += 1;
  const now = Date.UTC(2026, 9, 29, 15, 0, 0) + n;
  return {
    id: `item-${n}`,
    kind: o.kind ?? "passage",
    text: o.text,
    note: o.note,
    source: { url: `https://example.org/${n}`, title: o.title ?? `Page ${n}`, siteName: "example.org", authors: [] },
    collectionId: "unsorted",
    captureMode: "full",
    createdAt: now,
    updatedAt: now,
  };
}
