import type { SavedItem } from "../../lib/types";
import { formatDate, hostnameOf } from "../../lib/text";
import { linkWarning } from "../../lib/links";
import { Marked } from "./Marked";
import { PageIcon } from "./Icons";

type Props = {
  item: SavedItem;
  terms: string[];
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
};

export function ItemRow({ item, terms, selected, onToggle, onOpen }: Props) {
  const site = item.source.siteName || hostnameOf(item.source.url);
  const warn = !item.source.permalink && linkWarning(item.source.url);

  return (
    <li className={`row ${selected ? "is-selected" : ""}`}>
      <input
        type="checkbox"
        className="row-check"
        checked={selected}
        onChange={onToggle}
        aria-label={selected ? "Unselect" : "Select for Copy with sources"}
      />
      <button className="row-body" onClick={onOpen}>
        {item.kind === "passage" ? (
          <p className="row-passage">
            <Marked text={item.text} terms={terms} />
          </p>
        ) : (
          <p className="row-page">
            <PageIcon size={14} /> <Marked text={item.source.title} terms={terms} />
          </p>
        )}
        {item.note && (
          <p className="row-note">
            <Marked text={item.note} terms={terms} />
          </p>
        )}
        <p className="row-meta">
          {item.kind === "passage" && <span className="row-title">{item.source.title}</span>}
          <span>
            {site} · saved {formatDate(item.createdAt)}
          </span>
        </p>
        {(warn || item.captureMode === "limited" || item.source.isPdf) && (
          <p className="row-badges">
            {item.source.isPdf && <span className="badge">PDF</span>}
            {item.captureMode === "limited" && <span className="badge">Text only</span>}
            {warn && <span className="badge badge-caution">Link may expire</span>}
          </p>
        )}
      </button>
    </li>
  );
}
