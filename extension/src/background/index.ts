// Background worker: menus, shortcuts and saving.
import { ensureDefaultCollection, updateItem } from "../lib/db";
import { broadcastChanged, type Message, type SaveResult } from "../lib/messages";
import { saveFromTab, storeCapture } from "./save";

const MENU_PASSAGE = "locus-save-passage";
const MENU_PAGE = "locus-save-page";

chrome.runtime.onInstalled.addListener(async () => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  await ensureDefaultCollection();

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_PASSAGE, title: "Save passage to Locus", contexts: ["selection"] });
    chrome.contextMenus.create({ id: MENU_PAGE, title: "Save page to Locus", contexts: ["page"] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return;
  if (info.menuItemId === MENU_PASSAGE) {
    saveFromTab(tab, "passage", { frameId: info.frameId, selectionText: info.selectionText }).then(report);
  } else if (info.menuItemId === MENU_PAGE) {
    saveFromTab(tab, "page", { frameId: info.frameId }).then(report);
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab) return;
  if (command === "save-passage") saveFromTab(tab, "passage").then(report);
  if (command === "save-page") saveFromTab(tab, "page").then(report);
});

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === "update-note") {
    updateItem(msg.id, { note: msg.note })
      .then(() => {
        broadcastChanged();
        sendResponse({ ok: true });
      })
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true; // we'll answer asynchronously
  }

  if (msg.type === "save-page") {
    activeTab(msg.tabId)
      .then((tab) => (tab ? saveFromTab(tab, "page") : ({ ok: false, error: "No page open." } as SaveResult)))
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
  return false;
});

async function activeTab(tabId?: number): Promise<chrome.tabs.Tab | undefined> {
  if (tabId !== undefined) return chrome.tabs.get(tabId);
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

function report(r: SaveResult) {
  if (!r.ok) console.warn("Locus:", r.error);
}

// Handy from the worker's DevTools console, and used by the browser tests
Object.assign(globalThis, { locusDebug: { storeCapture, saveFromTab } });
