// When we can't read the page, the tab's URL and title are all we have.
import type { Source } from "../lib/types";
import { hostnameOf } from "../lib/text";

export function extractSourceFromTab(tab: chrome.tabs.Tab): Source {
  const url = tab.url ?? tab.pendingUrl ?? "";
  return {
    url,
    title: tab.title || hostnameOf(url) || "Untitled page",
    siteName: hostnameOf(url) || undefined,
    authors: [],
    isPdf: /\.pdf($|[?#])/i.test(url) || undefined,
  };
}
