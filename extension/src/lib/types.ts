// Shapes shared by the background worker, the page script and the side panel.

export type ItemKind = "passage" | "page";

// "full" means we could read the page; "limited" means we only got what Chrome
// handed us (e.g. Chrome's PDF viewer or a page we can't script).
export type CaptureMode = "full" | "limited";

export interface Source {
  url: string;
  canonicalUrl?: string;
  title: string;
  siteName?: string;
  authors: string[];
  publishedDate?: string;
  doi?: string;
  // A stable link the user pasted in, e.g. a database permalink
  permalink?: string;
  isPdf?: boolean;
}

export interface SavedItem {
  id: string;
  kind: ItemKind;
  // The exact passage, or a short description for page saves
  text: string;
  note?: string;
  // A bit of text on either side of the passage, used to find it again
  prefix?: string;
  suffix?: string;
  // Nearest heading above the passage
  heading?: string;
  fragmentUrl?: string;
  source: Source;
  collectionId: string;
  captureMode: CaptureMode;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: number;
}

// Readable text of a page, kept so a passage can still be read if the page changes or goes away
export interface Snapshot {
  url: string;
  title: string;
  text: string;
  savedAt: number;
}

// What the page script hands back to the background worker
export interface CapturePayload {
  kind: ItemKind;
  text: string;
  prefix?: string;
  suffix?: string;
  heading?: string;
  source: Source;
  pageText?: string;
}

export interface LibraryExport {
  app: "locus";
  formatVersion: 1;
  exportedAt: string;
  collections: Collection[];
  items: SavedItem[];
  snapshots: Snapshot[];
}

export const DEFAULT_COLLECTION_ID = "unsorted";
export const DEFAULT_COLLECTION_NAME = "Unsorted";
