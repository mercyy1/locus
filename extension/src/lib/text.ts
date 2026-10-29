// Small text helpers used all over.

export function normalizeSpace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function words(s: string): string[] {
  return normalizeSpace(s).split(" ").filter(Boolean);
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const dateFmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" });
const utcDateFmt = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export function formatDate(value: number | string | undefined): string {
  if (value === undefined || value === "") return "";
  if (typeof value === "string") {
    const v = value.trim();
    // Just a year, or a year and month: show it as written
    if (/^\d{4}(-\d{2})?$/.test(v)) return v;
    // Date-only strings are UTC midnight, so format in UTC or they slip a day
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return utcDateFmt.format(new Date(v));
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return dateFmt.format(d);
}
