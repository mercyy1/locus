// Loads saves and collections from IndexedDB and reloads when the background saves something.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureDefaultCollection, listCollections, listItems } from "../lib/db";
import type { Message } from "../lib/messages";
import { buildIndex } from "../lib/search";
import { getSavingTo, setSavingTo } from "../lib/settings";
import type { Collection, SavedItem } from "../lib/types";

export function useLibrary() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savingTo, setSavingToState] = useState<string>("unsorted");
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    await ensureDefaultCollection();
    const [its, cols, st] = await Promise.all([listItems(), listCollections(), getSavingTo()]);
    setItems(its);
    setCollections(cols);
    setSavingToState(cols.some((c) => c.id === st) ? st : "unsorted");
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
    const onMsg = (msg: Message) => {
      if (msg.type === "items-changed") reload();
    };
    chrome.runtime.onMessage.addListener(onMsg);
    // Ask Chrome not to clear our storage when the disk is low
    navigator.storage?.persist?.().catch(() => {});
    return () => chrome.runtime.onMessage.removeListener(onMsg);
  }, [reload]);

  const chooseSavingTo = useCallback(async (id: string) => {
    setSavingToState(id);
    await setSavingTo(id);
  }, []);

  const index = useMemo(() => buildIndex(items), [items]);

  return { items, collections, savingTo, chooseSavingTo, reload, index, loaded };
}
