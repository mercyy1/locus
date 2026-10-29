// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { extractSource } from "../../src/lib/metadata";

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("citation details", () => {
  it("reads Google Scholar style citation tags", () => {
    const doc = docFrom(`<html><head>
      <title>Ignored title</title>
      <meta name="citation_title" content="Remote Work and Time Use">
      <meta name="citation_author" content="Barrero, Jose Maria">
      <meta name="citation_author" content="Bloom, Nicholas">
      <meta name="citation_publication_date" content="2023/04/01">
      <meta name="citation_journal_title" content="Journal of Example Studies">
      <meta name="citation_doi" content="10.1234/jes.2023.001">
    </head><body></body></html>`);
    const s = extractSource(doc, "https://journal.example/article/1");
    expect(s.title).toBe("Remote Work and Time Use");
    expect(s.authors).toEqual(["Barrero, Jose Maria", "Bloom, Nicholas"]);
    expect(s.publishedDate).toBe("2023-04-01");
    expect(s.siteName).toBe("Journal of Example Studies");
    expect(s.doi).toBe("10.1234/jes.2023.001");
  });

  it("falls back to Open Graph and JSON-LD for news pages", () => {
    const doc = docFrom(`<html><head>
      <title>Page | Site</title>
      <meta property="og:title" content="City adds 40 km of bike lanes">
      <meta property="og:site_name" content="The Daily Example">
      <link rel="canonical" href="/news/bike-lanes">
      <script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-10-01T09:30:00-04:00","author":[{"@type":"Person","name":"Priya Shah"}]}</script>
    </head><body></body></html>`);
    const s = extractSource(doc, "https://daily.example/news/bike-lanes?utm=x");
    expect(s.title).toBe("City adds 40 km of bike lanes");
    expect(s.siteName).toBe("The Daily Example");
    expect(s.authors).toEqual(["Priya Shah"]);
    expect(s.publishedDate).toBe("2026-10-01");
    expect(s.canonicalUrl).toBe("https://daily.example/news/bike-lanes");
  });

  it("copes with a bare page", () => {
    const doc = docFrom("<html><body><p>hi</p></body></html>");
    const s = extractSource(doc, "https://www.example.org/x");
    expect(s.title).toBe("example.org");
    expect(s.siteName).toBe("example.org");
    expect(s.authors).toEqual([]);
  });

  it("finds a DOI in the URL", () => {
    const doc = docFrom("<html><head><title>x</title></head></html>");
    expect(extractSource(doc, "https://doi.org/10.5555/abc.123.").doi).toBe("10.5555/abc.123");
  });
});
