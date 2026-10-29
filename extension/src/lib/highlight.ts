// Splits text into plain and highlighted parts for search results.

export type Part = { text: string; mark: boolean };

export function highlightParts(text: string, terms: string[]): Part[] {
  const clean = Array.from(new Set(terms.map((t) => t.trim()).filter(Boolean)));
  if (!clean.length) return [{ text, mark: false }];

  // Longest first so "commuting" wins over "commute"; match from a word start
  const pattern = clean
    .sort((a, b) => b.length - a.length)
    .map((t) => escapeRegExp(t).replace(/\s+/g, "\\s+"))
    .join("|");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})[\\p{L}\\p{N}]*`, "giu");

  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), mark: false });
    parts.push({ text: m[0], mark: true });
    last = start + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mark: false });
  return parts;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
