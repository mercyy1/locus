// Tiny settings kept in chrome.storage so the panel and background agree on them.
import { DEFAULT_COLLECTION_ID } from "./types";

export async function getSavingTo(): Promise<string> {
  const { savingTo } = await chrome.storage.local.get("savingTo");
  return typeof savingTo === "string" ? savingTo : DEFAULT_COLLECTION_ID;
}

export async function setSavingTo(collectionId: string): Promise<void> {
  await chrome.storage.local.set({ savingTo: collectionId });
}
