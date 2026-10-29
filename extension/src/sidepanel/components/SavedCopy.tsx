import { useEffect, useRef, useState } from "react";
import { getSnapshot } from "../../lib/db";
import type { SavedItem, Snapshot } from "../../lib/types";
import { formatDate, normalizeSpace } from "../../lib/text";
import { BackIcon } from "./Icons";

// The page as Locus saved it, with the passage marked. Useful when the page changed or is gone.
export function SavedCopy({ item, onBack }: { item: SavedItem; onBack: () => void }) {
  const [snap, setSnap] = useState<Snapshot | null | undefined>(undefined);
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    getSnapshot(item.source.url).then((s) => setSnap(s ?? null));
  }, [item.source.url]);

  useEffect(() => {
    markRef.current?.scrollIntoView({ block: "center" });
  }, [snap]);

  if (snap === undefined) return null;

  return (
    <section className="detail">
      <button className="link-btn back" onClick={onBack}>
        <BackIcon /> Back
      </button>
      {snap === null ? (
        <p className="empty">There's no saved copy of this page. Locus keeps one when it can read the page.</p>
      ) : (
        <>
          <p className="eyebrow">Saved copy · {formatDate(snap.savedAt)}</p>
          <h2 className="serif snap-title">{snap.title}</h2>
          <div className="snapshot serif">{renderWithPassage(snap.text, item, markRef)}</div>
        </>
      )}
    </section>
  );
}

// Find the passage in the saved text, ignoring differences in spacing
function renderWithPassage(text: string, item: SavedItem, markRef: React.RefObject<HTMLElement | null>) {
  if (item.kind !== "passage") return text;
  const needle = normalizeSpace(item.text);
  const words = needle.split(" ").map(escapeRegExp);
  const re = new RegExp(words.join("\\s+"), "i");
  const m = re.exec(text);
  if (!m) return text;
  return (
    <>
      {text.slice(0, m.index)}
      <mark ref={markRef}>{m[0]}</mark>
      {text.slice(m.index + m[0].length)}
    </>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
