// Turning a page or a selection into a saved item.
import { listCollections, putItem, putSnapshot } from "../lib/db";
import { broadcastChanged, type SaveResult } from "../lib/messages";
import { extractSourceFromTab } from "./tabSource";
import { getSavingTo } from "../lib/settings";
import { buildFragmentUrl } from "../lib/textFragment";
import { cleanSelectionText } from "../lib/dom";
import type { CapturePayload, SavedItem } from "../lib/types";
import { DEFAULT_COLLECTION_ID, DEFAULT_COLLECTION_NAME } from "../lib/types";

type Kind = "passage" | "page";

export const NO_ACCESS = "no-access";

export async function saveFromTab(
  tab: chrome.tabs.Tab,
  kind: Kind,
  opts: { frameId?: number; selectionText?: string } = {},
): Promise<SaveResult> {
  if (tab.id === undefined) return { ok: false, error: "No tab to save from." };
  const target: chrome.scripting.InjectionTarget = { tabId: tab.id, frameIds: [opts.frameId ?? 0] };

  let payload: CapturePayload | null = null;
  let scripted = false;
  try {
    await chrome.scripting.executeScript({ target, files: ["content.js"] });
    const [res] = await chrome.scripting.executeScript({
      target,
      func: (k: Kind) => window.__locus?.capture(k) ?? null,
      args: [kind],
    });
    payload = (res?.result as CapturePayload | null) ?? null;
    scripted = true;
  } catch (err) {
    // Chrome pages, the Web Store and the built-in PDF viewer can't be scripted
    console.warn("Locus: couldn't read the page, saving what Chrome gave us", err);
  }

  // Chrome's PDF viewer: the script runs but can't see the selection. Fall back to the menu's text.
  let limited = false;
  if ((!payload || !payload.text) && kind === "passage") {
    const text = cleanSelectionText(opts.selectionText ?? "");
    if (!text) {
      flashBadge(tab.id, false);
      return { ok: false, error: "Select some text first, then save it." };
    }
    payload = { kind, text, source: payload?.source ?? extractSourceFromTab(tab) };
    limited = true;
  }
  if (!payload && kind === "page") {
    // No access at all (we can't even see the URL), e.g. "Save this page" from the side panel,
    // which doesn't count as the user invoking the extension for activeTab
    if (!tab.url) return { ok: false, error: NO_ACCESS };
    payload = { kind, text: "", source: extractSourceFromTab(tab) };
    limited = true;
  }
  if (!payload) return { ok: false, error: "Nothing to save." };

  const item = await storeCapture(payload, limited);

  if (scripted) {
    const collectionName = await collectionNameFor(item.collectionId);
    chrome.scripting
      .executeScript({
        target,
        func: (o: { id: string; collectionName: string; limited: boolean; kind: Kind }) => window.__locus?.showSaved(o),
        args: [{ id: item.id, collectionName, limited, kind }],
      })
      .catch(() => {});
  }
  flashBadge(tab.id);
  return { ok: true, id: item.id, limited };
}

// Exported so tests (and later the companion import) can store a capture directly
export async function storeCapture(payload: CapturePayload, limited = false): Promise<SavedItem> {
  const now = Date.now();
  const collectionId = await validCollection(await getSavingTo());
  const item: SavedItem = {
    id: crypto.randomUUID(),
    kind: payload.kind,
    text: payload.text,
    prefix: payload.prefix,
    suffix: payload.suffix,
    heading: payload.heading,
    fragmentUrl:
      payload.kind === "passage" && !payload.source.isPdf
        ? buildFragmentUrl(payload.source.url, payload.text, payload.prefix, payload.suffix)
        : undefined,
    source: payload.source,
    collectionId,
    captureMode: limited ? "limited" : "full",
    createdAt: now,
    updatedAt: now,
  };
  await putItem(item);

  // Keep a readable copy of the page, so the passage can still be read if the page changes
  if (payload.pageText && payload.pageText.length > 40) {
    await putSnapshot({ url: payload.source.url, title: payload.source.title, text: payload.pageText, savedAt: now });
  }

  broadcastChanged();
  return item;
}

// The chosen collection might have been deleted since it was picked
async function validCollection(id: string): Promise<string> {
  if (id === DEFAULT_COLLECTION_ID) return id;
  const all = await listCollections();
  return all.some((c) => c.id === id) ? id : DEFAULT_COLLECTION_ID;
}

async function collectionNameFor(id: string): Promise<string> {
  if (id === DEFAULT_COLLECTION_ID) return DEFAULT_COLLECTION_NAME;
  const all = await listCollections();
  return all.find((c) => c.id === id)?.name ?? DEFAULT_COLLECTION_NAME;
}

// A quick check mark on the toolbar icon, useful where we can't show the on-page card (PDFs)
// (an amber "!" means nothing was saved, e.g. the shortcut was pressed with nothing selected)
function flashBadge(tabId: number, ok = true) {
  chrome.action.setBadgeBackgroundColor({ color: ok ? "#187A63" : "#FFC53D", tabId }).catch(() => {});
  chrome.action.setBadgeText({ text: ok ? "✓" : "!", tabId }).catch(() => {});
  setTimeout(() => chrome.action.setBadgeText({ text: "", tabId }).catch(() => {}), 2500);
}
