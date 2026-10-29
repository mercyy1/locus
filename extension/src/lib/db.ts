// Local storage for everything Locus saves. It's IndexedDB inside the extension,
// so nothing leaves the computer. Later the Windows companion can take over as the
// main store and this becomes a cache.
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Collection, LibraryExport, SavedItem, Snapshot } from "./types";
import { DEFAULT_COLLECTION_ID, DEFAULT_COLLECTION_NAME } from "./types";

interface LocusDB extends DBSchema {
  items: {
    key: string;
    value: SavedItem;
    indexes: { byCreated: number; byCollection: string; byUrl: string };
  };
  collections: { key: string; value: Collection };
  snapshots: { key: string; value: Snapshot };
}

const DB_NAME = "locus";
const DB_VERSION = 1;

// Cap saved page text so one huge page can't bloat the library
export const SNAPSHOT_MAX_CHARS = 400_000;

let dbPromise: Promise<IDBPDatabase<LocusDB>> | null = null;

export function db(): Promise<IDBPDatabase<LocusDB>> {
  dbPromise ??= openDB<LocusDB>(DB_NAME, DB_VERSION, {
    upgrade(d) {
      const items = d.createObjectStore("items", { keyPath: "id" });
      items.createIndex("byCreated", "createdAt");
      items.createIndex("byCollection", "collectionId");
      items.createIndex("byUrl", "source.url");
      d.createObjectStore("collections", { keyPath: "id" });
      d.createObjectStore("snapshots", { keyPath: "url" });
    },
  });
  return dbPromise;
}

// Tests use this to start from a clean slate
export function resetDbConnection() {
  dbPromise = null;
}

export async function ensureDefaultCollection(): Promise<void> {
  const d = await db();
  if (!(await d.get("collections", DEFAULT_COLLECTION_ID))) {
    await d.put("collections", { id: DEFAULT_COLLECTION_ID, name: DEFAULT_COLLECTION_NAME, createdAt: Date.now() });
  }
}

// ---- items

export async function putItem(item: SavedItem): Promise<void> {
  await (await db()).put("items", item);
}

export async function getItem(id: string): Promise<SavedItem | undefined> {
  return (await db()).get("items", id);
}

export async function listItems(): Promise<SavedItem[]> {
  const all = await (await db()).getAllFromIndex("items", "byCreated");
  return all.reverse(); // newest first
}

export async function updateItem(id: string, patch: Partial<SavedItem>): Promise<SavedItem | undefined> {
  const d = await db();
  const tx = d.transaction("items", "readwrite");
  const current = await tx.store.get(id);
  if (!current) return undefined;
  const next: SavedItem = { ...current, ...patch, id, updatedAt: Date.now() };
  await tx.store.put(next);
  await tx.done;
  return next;
}

export async function deleteItem(id: string): Promise<void> {
  await (await db()).delete("items", id);
}

// ---- collections

export async function listCollections(): Promise<Collection[]> {
  const all = await (await db()).getAll("collections");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function addCollection(name: string): Promise<Collection> {
  const c: Collection = { id: crypto.randomUUID(), name: name.trim() || "Untitled", createdAt: Date.now() };
  await (await db()).put("collections", c);
  return c;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  const d = await db();
  const c = await d.get("collections", id);
  if (c) await d.put("collections", { ...c, name: name.trim() || c.name });
}

// Deleting a collection keeps its saves; they move back to Unsorted
export async function deleteCollection(id: string): Promise<void> {
  if (id === DEFAULT_COLLECTION_ID) return;
  const d = await db();
  const tx = d.transaction(["items", "collections"], "readwrite");
  const items = await tx.objectStore("items").index("byCollection").getAll(id);
  for (const it of items) {
    await tx.objectStore("items").put({ ...it, collectionId: DEFAULT_COLLECTION_ID, updatedAt: Date.now() });
  }
  await tx.objectStore("collections").delete(id);
  await tx.done;
}

// ---- snapshots (saved copies of pages)

export async function putSnapshot(s: Snapshot): Promise<void> {
  await (await db()).put("snapshots", { ...s, text: s.text.slice(0, SNAPSHOT_MAX_CHARS) });
}

export async function getSnapshot(url: string): Promise<Snapshot | undefined> {
  return (await db()).get("snapshots", url);
}

// ---- export / import

export async function exportLibrary(): Promise<LibraryExport> {
  const d = await db();
  return {
    app: "locus",
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    collections: await d.getAll("collections"),
    items: await d.getAll("items"),
    snapshots: await d.getAll("snapshots"),
  };
}

export function isLibraryExport(data: unknown): data is LibraryExport {
  const d = data as LibraryExport;
  return !!d && d.app === "locus" && d.formatVersion === 1 && Array.isArray(d.items) && Array.isArray(d.collections);
}

// Import merges: same id = replaced, everything else is kept
export async function importLibrary(data: LibraryExport): Promise<{ items: number; collections: number }> {
  const d = await db();
  const tx = d.transaction(["items", "collections", "snapshots"], "readwrite");
  for (const c of data.collections) await tx.objectStore("collections").put(c);
  for (const it of data.items) await tx.objectStore("items").put(it);
  for (const s of data.snapshots ?? []) await tx.objectStore("snapshots").put(s);
  await tx.done;
  await ensureDefaultCollection();
  return { items: data.items.length, collections: data.collections.length };
}
