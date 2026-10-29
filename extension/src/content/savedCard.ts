// The little "Saved" card that shows up next to the passage.
// It lives in a shadow root so the page's CSS can't mess with it (and ours can't leak out).
import type { Message } from "../lib/messages";

type CardOpts = {
  id: string;
  collectionName: string;
  limited: boolean;
  kind: "passage" | "page";
  anchor: DOMRect | null;
};

const HOST_ID = "locus-saved-card";
const CARD_WIDTH = 300;

const css = `
  :host { all: initial; }
  .card {
    position: fixed; z-index: 2147483647; width: ${CARD_WIDTH}px; box-sizing: border-box;
    background: #fff; color: #2f3a4f; border: 1px solid #dce1e8; border-radius: 12px;
    box-shadow: 0 8px 24px rgba(20, 33, 61, 0.18); padding: 12px 14px;
    font: 14px/1.4 "Atkinson Hyperlegible Next", "Segoe UI", system-ui, sans-serif;
  }
  .row { display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #187a63; flex: none; }
  .title { font-weight: 700; color: #14213d; flex: 1; }
  .sub { color: #5b6578; font-size: 13px; margin: 2px 0 8px 18px; }
  .close { all: unset; cursor: pointer; color: #5b6578; font-size: 18px; line-height: 1; padding: 2px 4px; border-radius: 6px; }
  .close:hover { background: #f5f7fa; }
  .close:focus-visible, input:focus-visible { outline: 2px solid #14213d; outline-offset: 2px; }
  input {
    width: 100%; box-sizing: border-box; font: inherit; color: inherit;
    border: 1px solid #8a94a6; border-radius: 8px; padding: 6px 8px;
  }
  .hint { color: #5b6578; font-size: 12px; margin-top: 4px; }
  .warn { color: #7a5600; background: #fff4d1; border-radius: 8px; padding: 6px 8px; font-size: 12.5px; margin-bottom: 8px; }
`;

export function showSavedCard(opts: CardOpts) {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  const root = host.attachShadow({ mode: "closed" });
  const what = opts.kind === "passage" ? "Passage saved" : "Page saved";

  root.innerHTML = `
    <style>${css}</style>
    <div class="card" role="status" aria-live="polite">
      <div class="row">
        <span class="dot" aria-hidden="true"></span>
        <span class="title">${what}</span>
        <button class="close" aria-label="Close">×</button>
      </div>
      <div class="sub">In ${escapeHtml(opts.collectionName)} · kept on this computer</div>
      ${opts.limited ? `<div class="warn">Locus couldn't read this page fully, so only the text was saved.</div>` : ""}
      <input type="text" placeholder="Add a note (optional)" aria-label="Note for this save" />
      <div class="hint">Press Enter to save the note</div>
    </div>`;

  const card = root.querySelector<HTMLDivElement>(".card")!;
  const input = root.querySelector<HTMLInputElement>("input")!;
  const hint = root.querySelector<HTMLDivElement>(".hint")!;
  position(card, opts.anchor);

  let timer = window.setTimeout(close, 8000);
  const hold = () => window.clearTimeout(timer);
  const release = () => {
    if (root.activeElement !== input) timer = window.setTimeout(close, 4000);
  };
  card.addEventListener("mouseenter", hold);
  card.addEventListener("mouseleave", release);
  input.addEventListener("focus", hold);

  root.querySelector(".close")!.addEventListener("click", close);
  input.addEventListener("keydown", async (e) => {
    if (e.key === "Escape") close();
    if (e.key !== "Enter") return;
    const note = input.value.trim();
    if (!note) return;
    try {
      await chrome.runtime.sendMessage({ type: "update-note", id: opts.id, note } satisfies Message);
      hint.textContent = "Note saved";
      window.setTimeout(close, 1200);
    } catch {
      hint.textContent = "Couldn't save the note. Try again from the side panel.";
    }
  });

  function close() {
    host.remove();
  }

  document.documentElement.appendChild(host);
}

// Under the passage if there's room, otherwise above it; top-right for page saves
function position(card: HTMLDivElement, anchor: DOMRect | null) {
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!anchor || (anchor.width === 0 && anchor.height === 0)) {
    card.style.top = `${margin + 8}px`;
    card.style.right = `${margin + 8}px`;
    return;
  }
  const left = Math.min(Math.max(anchor.left, margin), vw - CARD_WIDTH - margin);
  card.style.left = `${left}px`;
  const below = anchor.bottom + 8;
  if (below + 170 < vh) card.style.top = `${below}px`;
  else card.style.top = `${Math.max(anchor.top - 178, margin)}px`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
