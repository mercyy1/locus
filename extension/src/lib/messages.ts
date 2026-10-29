// Messages passed between the side panel, the page script and the background worker.

export type Message =
  | { type: "save-page"; tabId?: number }
  | { type: "update-note"; id: string; note: string }
  | { type: "items-changed" };

export type SaveResult = { ok: true; id: string; limited: boolean } | { ok: false; error: string };

// Tell any open side panel to reload. It's fine if nobody's listening.
export function broadcastChanged() {
  chrome.runtime.sendMessage({ type: "items-changed" } satisfies Message).catch(() => {});
}
