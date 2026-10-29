// A handful of line icons, drawn here so we don't pull in an icon package.
type P = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const SearchIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const BackIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const CopyIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </svg>
);

export const OpenIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const PageIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </svg>
);

export const PlusIcon = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const LogoMark = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
    <rect x="4" y="4" width="120" height="120" rx="26" fill="#14213D" />
    <rect x="26" y="74" width="78" height="24" rx="6" fill="#FFC53D" transform="rotate(-4 64 86)" />
    <rect x="38" y="26" width="17" height="70" rx="3" fill="#FFFFFF" />
    <rect x="38" y="80" width="54" height="16" rx="3" fill="#FFFFFF" />
  </svg>
);
