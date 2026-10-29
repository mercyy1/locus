// Keyword search over saves, built on MiniSearch (a small in-memory full-text index).
// Put words in "quotes" to require that exact phrase.
// Search by meaning (embeddings) comes later; this is the exact-words half of hybrid search.
import MiniSearch from "minisearch";
import type { SavedItem } from "./types";
import { normalizeSpace } from "./text";

type Doc = { id: string; text: string; note: string; title: string; site: string; authors: string; heading: string };

export interface SearchHit {
  item: SavedItem;
  // Words to highlight in the result
  terms: string[];
}

export interface SearchIndex {
  ms: MiniSearch<Doc>;
  byId: Map<string, SavedItem>;
  items: SavedItem[];
}

export function buildIndex(items: SavedItem[]): SearchIndex {
  const ms = new MiniSearch<Doc>({
    fields: ["text", "note", "title", "site", "authors", "heading"],
    searchOptions: {
      boost: { text: 2, note: 1.5, title: 1.5 },
      prefix: true,
      fuzzy: (term) => (term.length > 4 ? 0.15 : false),
    },
  });
  ms.addAll(items.map(toDoc));
  return { ms, byId: new Map(items.map((i) => [i.id, i])), items };
}

export function parseQuery(raw: string): { phrases: string[]; rest: string } {
  const phrases: string[] = [];
  const rest = raw.replace(/"([^"]+)"/g, (_, p: string) => {
    const clean = normalizeSpace(p);
    if (clean) phrases.push(clean);
    return " ";
  });
  return { phrases, rest: normalizeSpace(rest.replace(/"/g, " ")) };
}

export function search(index: SearchIndex, raw: string): SearchHit[] {
  const { phrases, rest } = parseQuery(raw);
  if (!phrases.length && !rest) return index.items.map((item) => ({ item, terms: [] }));

  let hits: SearchHit[];
  if (rest) {
    // All words first; if that finds nothing, any word
    let results = index.ms.search(rest, { combineWith: "AND" });
    if (!results.length) results = index.ms.search(rest, { combineWith: "OR" });
    hits = results.map((r) => ({ item: index.byId.get(r.id)!, terms: r.terms })).filter((h) => h.item);
  } else {
    hits = index.items.map((item) => ({ item, terms: [] }));
  }

  if (phrases.length) {
    const lowered = phrases.map((p) => p.toLowerCase());
    hits = hits.filter((h) => {
      const hay = haystack(h.item);
      return lowered.every((p) => hay.includes(p));
    });
    hits.forEach((h) => h.terms.push(...phrases));
  }
  return hits;
}

function haystack(i: SavedItem): string {
  return normalizeSpace([i.text, i.note ?? "", i.source.title].join(" ")).toLowerCase();
}

function toDoc(i: SavedItem): Doc {
  return {
    id: i.id,
    text: i.text,
    note: i.note ?? "",
    title: i.source.title,
    site: i.source.siteName ?? "",
    authors: i.source.authors.join(" "),
    heading: i.heading ?? "",
  };
}
