import { useEffect, useState } from "react";
import type { Collection, SavedItem } from "../../lib/types";
import { deleteItem, updateItem } from "../../lib/db";
import { bestLink, linkWarning } from "../../lib/links";
import { formatAuthors } from "../../lib/citation";
import { formatDate, hostnameOf } from "../../lib/text";
import { BackIcon, CopyIcon, OpenIcon } from "./Icons";

type Props = {
  item: SavedItem;
  collections: Collection[];
  onBack: () => void;
  onCopy: (items: SavedItem[]) => void;
  onSavedCopy: () => void;
  onChanged: () => void;
  notify: (msg: string) => void;
};

export function ItemDetail({ item, collections, onBack, onCopy, onSavedCopy, onChanged, notify }: Props) {
  const [note, setNote] = useState(item.note ?? "");
  const [permalink, setPermalink] = useState(item.source.permalink ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Keep the fields in step if the item changes underneath us
  useEffect(() => {
    setNote(item.note ?? "");
    setPermalink(item.source.permalink ?? "");
  }, [item.id, item.note, item.source.permalink]);

  const s = item.source;
  const warn = linkWarning(s.url);

  async function saveNote() {
    if ((item.note ?? "") === note.trim()) return;
    await updateItem(item.id, { note: note.trim() || undefined });
    onChanged();
    notify("Note saved");
  }

  async function savePermalink() {
    const value = permalink.trim();
    if ((s.permalink ?? "") === value) return;
    if (value && !/^https?:\/\//i.test(value)) {
      notify("That doesn't look like a link");
      return;
    }
    await updateItem(item.id, { source: { ...s, permalink: value || undefined } });
    onChanged();
    notify("Stable link saved");
  }

  async function move(collectionId: string) {
    await updateItem(item.id, { collectionId });
    onChanged();
  }

  async function remove() {
    await deleteItem(item.id);
    onChanged();
    notify("Deleted");
    onBack();
  }

  function openAtPassage() {
    chrome.tabs.create({ url: item.fragmentUrl || bestLink(s) });
  }

  return (
    <section className="detail">
      <button className="link-btn back" onClick={onBack}>
        <BackIcon /> Back
      </button>

      {item.kind === "passage" ? (
        <blockquote className="passage">{item.text}</blockquote>
      ) : (
        <div className="page-save">
          <p className="eyebrow">Whole page</p>
          {item.text && <p className="page-desc">{item.text}</p>}
        </div>
      )}

      <div className="actions">
        <button className="btn primary" onClick={openAtPassage}>
          <OpenIcon /> {item.kind === "passage" && item.fragmentUrl ? "Open at passage" : "Open page"}
        </button>
        <button className="btn" onClick={() => onCopy([item])}>
          <CopyIcon /> Copy with sources
        </button>
      </div>

      <dl className="facts">
        <dt>Source</dt>
        <dd className="serif">{s.title}</dd>
        {s.authors.length > 0 && (
          <>
            <dt>By</dt>
            <dd>{formatAuthors(s.authors)}</dd>
          </>
        )}
        <dt>Site</dt>
        <dd>{s.siteName || hostnameOf(s.url)}</dd>
        {s.publishedDate && (
          <>
            <dt>Published</dt>
            <dd>{formatDate(s.publishedDate)}</dd>
          </>
        )}
        {item.heading && (
          <>
            <dt>Section</dt>
            <dd>{item.heading}</dd>
          </>
        )}
        {s.doi && (
          <>
            <dt>DOI</dt>
            <dd className="mono">{s.doi}</dd>
          </>
        )}
        <dt>Saved</dt>
        <dd>{formatDate(item.createdAt)}</dd>
      </dl>

      {item.captureMode === "limited" && (
        <p className="callout">
          Locus couldn't read this page, so it saved the text only. {s.isPdf ? "PDF support with page numbers is on the way." : ""}
        </p>
      )}

      {warn && (
        <div className="callout caution">
          <p>{warn} Paste a permalink or DOI link so you can find it again.</p>
          <label className="field">
            <span>Stable link</span>
            <input
              type="url"
              value={permalink}
              placeholder="https://"
              onChange={(e) => setPermalink(e.target.value)}
              onBlur={savePermalink}
            />
          </label>
        </div>
      )}

      <label className="field">
        <span>Note</span>
        <textarea
          rows={3}
          value={note}
          placeholder="Why this matters, where you'll use it…"
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
        />
      </label>

      <label className="field">
        <span>Collection</span>
        <select value={item.collectionId} onChange={(e) => move(e.target.value)}>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <div className="detail-footer">
        <button className="link-btn" onClick={onSavedCopy}>
          Read the saved copy
        </button>
        {confirmDelete ? (
          <span className="confirm">
            Delete this save?
            <button className="btn danger small" onClick={remove}>
              Delete
            </button>
            <button className="btn small" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button className="link-btn danger-text" onClick={() => setConfirmDelete(true)}>
            Delete
          </button>
        )}
      </div>
    </section>
  );
}
