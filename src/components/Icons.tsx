import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 24, props: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const ChevronLeft = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const ArrowLeft = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);
export const ArrowRight = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const ArrowUp = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const ArrowDown = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 5v14M18 13l-6 6-6-6" />
  </svg>
);
export const Play = ({ size, ...p }: P) => (
  <svg {...base(size, p)} fill="currentColor" stroke="none">
    <path d="M7 4.8v14.4c0 .8.9 1.3 1.6.8l11-7.2c.6-.4.6-1.2 0-1.6l-11-7.2C7.9 3.5 7 4 7 4.8z" />
  </svg>
);
export const Pause = ({ size, ...p }: P) => (
  <svg {...base(size, p)} fill="currentColor" stroke="none">
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
  </svg>
);
export const Plus = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Volume = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" />
    <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
  </svg>
);
export const VolumeOff = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" />
    <path d="M22 9l-6 6M16 9l6 6" />
  </svg>
);
export const Lock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="4" y="11" width="16" height="10" rx="2.5" />
    <path d="M8 11V7.5a4 4 0 118 0V11" />
  </svg>
);
export const Unlock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="4" y="11" width="16" height="10" rx="2.5" />
    <path d="M8 11V7.5a4 4 0 017.7-1.5" />
  </svg>
);
export const More = ({ size, ...p }: P) => (
  <svg {...base(size, p)} fill="currentColor" stroke="none">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);
export const Trash = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </svg>
);
export const Replace = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M20 11a8 8 0 00-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0014.6 4.5L20 16M20 20v-4h-4" />
  </svg>
);
export const Download = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);
export const Share = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
  </svg>
);
export const Copy = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />
  </svg>
);
export const Edit = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 20h4L19 9a2.8 2.8 0 00-4-4L4 16v4zM13.5 6.5l4 4" />
  </svg>
);
export const Dice = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    <circle cx="15" cy="15" r="1.2" fill="currentColor" />
    <circle cx="15" cy="9" r="1.2" fill="currentColor" />
    <circle cx="9" cy="15" r="1.2" fill="currentColor" />
  </svg>
);
export const Check = ({ size, ...p }: P) => (
  <svg {...base(size, p)} strokeWidth={3}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const Cross = ({ size, ...p }: P) => (
  <svg {...base(size, p)} strokeWidth={3}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const Film = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4" />
  </svg>
);
export const Trophy = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3" />
  </svg>
);
export const Users = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a6.5 6.5 0 013.5 6" />
  </svg>
);

export const TikTokLogo = ({ size = 16, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...p}>
    <path
      fill="currentColor"
      d="M16.6 2h-3.4v13.4a3 3 0 11-3-3c.3 0 .6 0 .9.1V9a6.5 6.5 0 105.5 6.4V8.6a8.1 8.1 0 004.4 1.3V6.5a4.5 4.5 0 01-4.4-4.5z"
    />
  </svg>
);

export const InstagramLogo = ({ size = 16, ...p }: P) => (
  <svg {...base(size, p)} strokeWidth={2.2}>
    <rect x="3" y="3" width="18" height="18" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);
