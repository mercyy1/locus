// Pulls citation details out of a page: title, authors, date, site, DOI.
// Academic sites use citation_* meta tags (the Google Scholar ones), news and blogs
// use Open Graph and JSON-LD, so we check those in that order.
import type { Source } from "./types";
import { hostnameOf, normalizeSpace } from "./text";

export function extractSource(doc: Document, url: string): Source {
  const ld = readJsonLd(doc);

  const title =
    meta(doc, "citation_title") ||
    meta(doc, "og:title") ||
    str(ld?.headline) ||
    normalizeSpace(doc.title) ||
    hostnameOf(url) ||
    url;

  const authors = uniq([
    ...metaAll(doc, "citation_author"),
    ...metaAll(doc, "dc.creator"),
    ...ldAuthors(ld),
    ...metaAll(doc, "author"),
    ...metaAll(doc, "article:author").filter((a) => !/^https?:/i.test(a)),
  ]).slice(0, 12);

  const publishedDate =
    meta(doc, "citation_publication_date") ||
    meta(doc, "citation_date") ||
    meta(doc, "article:published_time") ||
    str(ld?.datePublished) ||
    meta(doc, "dc.date") ||
    meta(doc, "date") ||
    undefined;

  const siteName =
    meta(doc, "citation_journal_title") ||
    meta(doc, "og:site_name") ||
    str(ld?.publisher?.name) ||
    hostnameOf(url) ||
    undefined;

  const canonical = doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute("href") || undefined;

  return {
    url,
    canonicalUrl: canonical ? absolute(canonical, url) : undefined,
    title,
    siteName,
    authors,
    publishedDate: publishedDate ? normalizeDate(publishedDate) : undefined,
    doi: findDoi(doc, url),
    isPdf: doc.contentType === "application/pdf" || /\.pdf($|[?#])/i.test(url) || undefined,
  };
}

export function findDoi(doc: Document, url: string): string | undefined {
  const candidates = [
    meta(doc, "citation_doi"),
    meta(doc, "dc.identifier"),
    meta(doc, "prism.doi"),
    url,
  ];
  for (const c of candidates) {
    const m = c?.match(/\b(10\.\d{4,9}\/[^\s"<>]+)/);
    if (m) return m[1].replace(/[.,;]+$/, "");
  }
  return undefined;
}

// Most dates come as ISO strings; keep just the date part so they're easy to read
function normalizeDate(raw: string): string {
  const s = raw.trim().replace(/\//g, "-");
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const y = s.match(/^(\d{4})(-\d{2})?$/);
  if (y) return s;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? raw.trim() : d.toISOString().slice(0, 10);
}

function meta(doc: Document, key: string): string {
  return metaAll(doc, key)[0] ?? "";
}

function metaAll(doc: Document, key: string): string[] {
  const lower = key.toLowerCase();
  const out: string[] = [];
  doc.querySelectorAll("meta").forEach((m) => {
    const k = (m.getAttribute("name") || m.getAttribute("property") || m.getAttribute("itemprop") || "").toLowerCase();
    const v = m.getAttribute("content");
    if (k === lower && v && v.trim()) out.push(normalizeSpace(v));
  });
  return out;
}

// JSON-LD is the structured data block many news sites ship. Find the article-ish one.
function readJsonLd(doc: Document): any | undefined {
  const blocks = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const b of Array.from(blocks)) {
    try {
      const data = JSON.parse(b.textContent || "");
      const list = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data];
      const hit = list.find((x: any) => /Article|BlogPosting|Report|ScholarlyArticle|WebPage/i.test(String(x?.["@type"])));
      if (hit) return hit;
    } catch {
      // Broken JSON-LD is common, just skip it
    }
  }
  return undefined;
}

function ldAuthors(ld: any): string[] {
  if (!ld?.author) return [];
  const list = Array.isArray(ld.author) ? ld.author : [ld.author];
  return list.map((a: any) => (typeof a === "string" ? a : str(a?.name))).filter(Boolean);
}

function str(v: unknown): string {
  return typeof v === "string" ? normalizeSpace(v) : "";
}

function uniq(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((x) => {
    const k = x.toLowerCase();
    if (!x || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function absolute(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}
