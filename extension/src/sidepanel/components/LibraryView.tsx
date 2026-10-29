import { useEffect, useRef, useState } from "react";
import type { Collection, SavedItem } from "../../lib/types";
import { DEFAULT_COLLECTION_ID } from "../../lib/types";
import {
  addCollection,
  deleteCollection,
  exportLibrary,
  importLibrary,
  isLibraryExport,
  renameCollection,
} from "../../lib/db";
import { PlusIcon } from "./Icons";

type Props = {
  items: SavedItem[];
  collections: Collection[];
  onOpenCollection: (id: string) => void;
  onChanged: () => void;
  notify: (msg: string) => void;
};

export function LibraryView({ items, collections, onOpenCollection, onChanged, notify }: Props) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [usage, setUsage] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => setUsage(e.usage !== undefined ? formatBytes(e.usage) : ""))
      .catch(() => {});
  }, [items.length]);

  const counts = new Map<string, number>();
  items.forEach((i) => counts.set(i.collectionId, (counts.get(i.collectionId) ?? 0) + 1));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await addCollection(newName);
    setNewName("");
    onChanged();
  }

  async function doExport() {
    const data = await exportLibrary();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `locus-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function doImport(file: File) {
    try {
      const data = JSON.parse(await file.text());
      if (!isLibraryExport(data)) {
        notify("That file isn't a Locus export");
        return;
      }
      const r = await importLibrary(data);
      onChanged();
      notify(`Imported ${r.items} saves`);
    } catch {
      notify("Couldn't read that file");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <section className="library">
      <h2 className="section-title">Collections</h2>
      <ul className="collections">
        {collections.map((c) => (
          <li key={c.id} className="collection">
            {editing === c.id ? (
              <form
                className="inline-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const name = new FormData(e.currentTarget).get("name") as string;
                  await renameCollection(c.id, name);
                  setEditing(null);
                  onChanged();
                }}
              >
                <input name="name" defaultValue={c.name} autoFocus aria-label="Collection name" />
                <button className="btn small primary">Save</button>
                <button type="button" className="btn small" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <button className="collection-open" onClick={() => onOpenCollection(c.id)}>
                  <span>{c.name}</span>
                  <span className="count">{counts.get(c.id) ?? 0}</span>
                </button>
                <button className="link-btn small-text" onClick={() => setEditing(c.id)}>
                  Rename
                </button>
                {c.id !== DEFAULT_COLLECTION_ID && (
                  <button
                    className="link-btn small-text danger-text"
                    onClick={async () => {
                      await deleteCollection(c.id);
                      onChanged();
                      notify(`Deleted "${c.name}". Its saves moved to Unsorted.`);
                    }}
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <form className="inline-form" onSubmit={create}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection, e.g. PSYC 2010 essay"
          aria-label="New collection name"
        />
        <button className="btn small" disabled={!newName.trim()}>
          <PlusIcon size={14} /> Add
        </button>
      </form>

      <h2 className="section-title">Your library</h2>
      <p className="muted">
        {items.length} {items.length === 1 ? "save" : "saves"}
        {usage && ` · ${usage} on this computer`}. Nothing leaves your computer.
      </p>
      <div className="actions">
        <button className="btn" onClick={doExport}>
          Export library
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
      </div>
    </section>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
