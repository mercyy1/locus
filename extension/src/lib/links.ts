// Spots links that probably won't work later: library proxy and session links.
// These are common when students read through a library database.

const SESSION_PARAMS = ["sid", "sessionid", "session", "jsessionid", "phpsessid", "token", "auth", "ticket", "accountid", "sessiontoken"];

export function linkWarning(url: string): string | undefined {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return undefined;
  }

  const host = u.hostname.toLowerCase();
  if (host.includes("ezproxy") || /(^|\.)proxy\./.test(host) || host.includes(".idm.oclc.org")) {
    return "This link goes through a library proxy and may only work while you're signed in.";
  }
  if (/;jsessionid=/i.test(u.pathname)) {
    return "This link includes a login session and will probably expire.";
  }
  for (const key of u.searchParams.keys()) {
    if (SESSION_PARAMS.includes(key.toLowerCase())) {
      return "This link includes a login session and will probably expire.";
    }
  }
  return undefined;
}

// The link we cite: a pasted permalink wins, then the DOI, then the page's own canonical link
export function bestLink(source: { url: string; canonicalUrl?: string; doi?: string; permalink?: string }): string {
  if (source.permalink) return source.permalink;
  if (source.doi) return `https://doi.org/${source.doi}`;
  return source.canonicalUrl || source.url;
}
