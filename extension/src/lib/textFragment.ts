// Builds "exact spot" links using URL text fragments (#:~:text=...).
// Chrome scrolls to and highlights the text when the link opens.
// If the text isn't found, the page just opens at the top, which is fine.
import { words } from "./text";

// Short passages are matched whole; longer ones by their first and last few words.
const WHOLE_MATCH_MAX = 80;
const EDGE_WORDS = 5;
const CONTEXT_WORDS = 3;

// Text directives treat - , & as syntax, so they need escaping on top of the usual encoding.
export function encodeFragmentPart(s: string): string {
  return encodeURIComponent(s).replace(/-/g, "%2D").replace(/,/g, "%2C").replace(/&/g, "%26");
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

export function buildTextDirective(passage: string, prefix?: string, suffix?: string): string {
  let w = words(passage);

  // Text fragments only match whole words. If the selection starts or ends
  // mid-word, drop that partial word (and the context on that side).
  if (prefix && WORD_CHAR.test(prefix.slice(-1)) && WORD_CHAR.test(w[0]?.[0] ?? "")) {
    w = w.slice(1);
    prefix = undefined;
  }
  if (suffix && WORD_CHAR.test(suffix[0] ?? "") && WORD_CHAR.test(w.at(-1)?.slice(-1) ?? "")) {
    w = w.slice(0, -1);
    suffix = undefined;
  }

  const text = w.join(" ");
  if (!text) return "";

  let core: string;
  if (text.length <= WHOLE_MATCH_MAX || w.length <= EDGE_WORDS * 2) {
    core = encodeFragmentPart(text);
  } else {
    const start = w.slice(0, EDGE_WORDS).join(" ");
    const end = w.slice(-EDGE_WORDS).join(" ");
    core = `${encodeFragmentPart(start)},${encodeFragmentPart(end)}`;
  }

  // A little context on each side helps when the same words show up twice on a page
  const pre = prefix ? words(prefix).slice(-CONTEXT_WORDS).join(" ") : "";
  const suf = suffix ? words(suffix).slice(0, CONTEXT_WORDS).join(" ") : "";
  const parts = [pre ? `${encodeFragmentPart(pre)}-,` : "", core, suf ? `,-${encodeFragmentPart(suf)}` : ""];
  return `text=${parts.join("")}`;
}

export function buildFragmentUrl(pageUrl: string, passage: string, prefix?: string, suffix?: string): string {
  const directive = buildTextDirective(passage, prefix, suffix);
  if (!directive) return pageUrl;

  // Drop any old text directive but keep a normal #section (some sites route with it)
  const [base, hash = ""] = splitHash(pageUrl);
  const cleanHash = hash.split(":~:")[0];
  return `${base}#${cleanHash}:~:${directive}`;
}

function splitHash(url: string): [string, string?] {
  const i = url.indexOf("#");
  return i === -1 ? [url] : [url.slice(0, i), url.slice(i + 1)];
}
