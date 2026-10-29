import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addCollection,
  deleteCollection,
  ensureDefaultCollection,
  exportLibrary,
  getItem,
  importLibrary,
  isLibraryExport,
  listItems,
  putItem,
  putSnapshot,
  resetDbConnection,
  updateItem,
} from "../../src/lib/db";
import { makeItem } from "./helpers";

beforeEach(async () => {
  await resetDbConnection();
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase("locus");
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
  await ensureDefaultCollection();
});

describe("storage", () => {
  it("lists newest first", async () => {
    const a = makeItem({ text: "older" });
    const b = makeItem({ text: "newer" });
    await putItem(a);
    await putItem(b);
    expect((await listItems()).map((i) => i.text)).toEqual(["newer", "older"]);
  });

  it("updates without losing fields", async () => {
    const a = makeItem({ text: "keep me" });
    await putItem(a);
    await updateItem(a.id, { note: "hello" });
    const got = await getItem(a.id);
    expect(got?.text).toBe("keep me");
    expect(got?.note).toBe("hello");
  });

  it("moves saves back to Unsorted when a collection is deleted", async () => {
    const c = await addCollection("Essay");
    const a = { ...makeItem({ text: "in essay" }), collectionId: c.id };
    await putItem(a);
    await deleteCollection(c.id);
    expect((await getItem(a.id))?.collectionId).toBe("unsorted");
  });

  // From the storage test in the plan: export, then import into a fresh install, restores everything
  it("round-trips through export and import", async () => {
    const c = await addCollection("Thesis");
    for (let i = 0; i < 1000; i++) await putItem({ ...makeItem({ text: `passage ${i}` }), collectionId: c.id });
    await putSnapshot({ url: "https://example.org/1", title: "One", text: "page text", savedAt: 1 });
    const dump = JSON.parse(JSON.stringify(await exportLibrary()));
    expect(isLibraryExport(dump)).toBe(true);

    // wipe and restore
    await resetDbConnection();
    await new Promise<void>((r) => {
      const req = indexedDB.deleteDatabase("locus");
      req.onsuccess = req.onerror = req.onblocked = () => r();
    });
    const result = await importLibrary(dump);
    expect(result.items).toBe(1000);
    const after = await exportLibrary();
    expect(after.items).toHaveLength(1000);
    expect(after.collections.map((x) => x.name).sort()).toEqual(["Thesis", "Unsorted"]);
    expect(after.snapshots).toHaveLength(1);
  });

  it("rejects files that aren't Locus exports", () => {
    expect(isLibraryExport({ hello: 1 })).toBe(false);
    expect(isLibraryExport(null)).toBe(false);
  });
});
