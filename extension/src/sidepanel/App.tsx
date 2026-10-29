import { useEffect, useMemo, useRef, useState } from "react";
import { useLibrary } from "./useLibrary";
import { search } from "../lib/search";
import { copyWithSources } from "../lib/citation";
import type { Message, SaveResult } from "../lib/messages";
import type { SavedItem } from "../lib/types";
import { ItemRow } from "./components/ItemRow";
import { ItemDetail } from "./components/ItemDetail";
import { SavedCopy } from "./components/SavedCopy";
import { LibraryView } from "./components/LibraryView";
import { CopyIcon, LogoMark, PageIcon, SearchIcon } from "./components/Icons";

type Tab = "search" | "library";
type View = { name: "list" } | { name: "detail"; id: string } | { name: "copy"; id: string };

export function App() {
  const { items, collections, savingTo, chooseSavingTo, reload, index, loaded } = useLibrary();
  const [tab, setTab] = useState<Tab>("search");
  const [view, setView] = useState<View>({ name: "list" });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [pageHint, setPageHint] = useState(false);
  const toastTimer = useRef<number>(0);

  const notify = (msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const hits = useMemo(() => {
    const all = search(index, query);
    return filter ? all.filter((h) => h.item.collectionId === filter) : all;
  }, [index, query, filter]);

  // Drop selections for things that were deleted
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const current = view.name !== "list" ? items.find((i) => i.id === view.id) : undefined;
  useEffect(() => {
    if (view.name !== "list" && loaded && !current) setView({ name: "list" });
  }, [view, current, loaded]);

  async function copy(list: SavedItem[]) {
    try {
      await navigator.clipboard.writeText(copyWithSources(list));
      notify(list.length === 1 ? "Copied with its source" : `Copied ${list.length} passages with sources`);
    } catch {
      notify("Couldn't copy. Click inside the panel and try again.");
    }
  }

  async function savePage() {
    const res: SaveResult = await chrome.runtime.sendMessage({ type: "save-page" } satisfies Message);
    if (res?.ok) {
      setPageHint(false);
      notify(res.limited ? "Saved the link only (Locus couldn't read this page)" : "Page saved");
    } else if (res?.error === "no-access") setPageHint(true);
    else notify("Couldn't save this page. Try right-click → Save page to Locus.");
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filterName = filter ? collections.find((c) => c.id === filter)?.name : undefined;
  const selectedItems = items.filter((i) => selected.has(i.id));

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <LogoMark />
          <span>Locus</span>
        </div>
        <label className="saving-to">
          <span>Saving to</span>
          <select
            value={savingTo}
            onChange={(e) => {
              if (e.target.value === "__new") {
                setTab("library");
                setView({ name: "list" });
              } else chooseSavingTo(e.target.value);
            }}
          >
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__new">New collection…</option>
          </select>
        </label>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "search"} onClick={() => { setTab("search"); setView({ name: "list" }); }}>
          Search
        </button>
        <button role="tab" aria-selected={tab === "library"} onClick={() => { setTab("library"); setView({ name: "list" }); }}>
          Library
        </button>
        <button role="tab" aria-selected={false} disabled title="Ask is coming later. It's the last thing on the build plan.">
          Ask
        </button>
      </nav>

      <main className="content">
        {view.name === "detail" && current ? (
          <ItemDetail
            item={current}
            collections={collections}
            onBack={() => setView({ name: "list" })}
            onCopy={copy}
            onSavedCopy={() => setView({ name: "copy", id: current.id })}
            onChanged={reload}
            notify={notify}
          />
        ) : view.name === "copy" && current ? (
          <SavedCopy item={current} onBack={() => setView({ name: "detail", id: current.id })} />
        ) : tab === "library" ? (
          <LibraryView
            items={items}
            collections={collections}
            onOpenCollection={(id) => {
              setFilter(id);
              setTab("search");
            }}
            onChanged={reload}
            notify={notify}
          />
        ) : (
          <section>
            <div className="search">
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Search saves. "Quotes" for exact words'
                aria-label="Search your saves"
                autoFocus
              />
            </div>

            <div className="list-head">
              <span>
                {query ? `${hits.length} ${hits.length === 1 ? "match" : "matches"}` : "Recent saves"}
                {filterName && (
                  <button className="chip" onClick={() => setFilter(null)} aria-label={`Stop filtering by ${filterName}`}>
                    {filterName} ×
                  </button>
                )}
              </span>
              <button className="btn small" onClick={savePage}>
                <PageIcon size={14} /> Save this page
              </button>
            </div>

            {pageHint && (
              <div className="callout">
                <p>
                  Chrome only lets Locus read a page when you ask from the page itself. Right-click the page and choose{" "}
                  <b>Save page to Locus</b>, or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>.
                </p>
                <button className="link-btn small-text" onClick={() => setPageHint(false)}>
                  Got it
                </button>
              </div>
            )}

            {loaded && items.length === 0 ? (
              <div className="empty">
                <p className="empty-title">Nothing saved yet</p>
                <p>
                  Select text on any page, then right-click and choose <b>Save passage to Locus</b>, or press{" "}
                  <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>.
                </p>
                <p className="muted">Your saves stay on this computer.</p>
              </div>
            ) : hits.length === 0 && loaded ? (
              <p className="empty">No saves match that. Try fewer words.</p>
            ) : (
              <ul className="rows">
                {hits.map((h) => (
                  <ItemRow
                    key={h.item.id}
                    item={h.item}
                    terms={h.terms}
                    selected={selected.has(h.item.id)}
                    onToggle={() => toggle(h.item.id)}
                    onOpen={() => setView({ name: "detail", id: h.item.id })}
                  />
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {selected.size > 0 && view.name === "list" && (
        <div className="selection-bar">
          <span>{selected.size} selected</span>
          <button className="link-btn" onClick={() => setSelected(new Set())}>
            Clear
          </button>
          <button className="btn primary" onClick={() => copy(selectedItems)}>
            <CopyIcon /> Copy with sources
          </button>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
