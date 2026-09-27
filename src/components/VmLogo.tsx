import { useId } from 'react';

// The "Vm" mark, revealed like handwriting — same stroke path viralmarkets.com uses on its splash.
const STROKE =
  'M68.2864 484C68.2864 484 6.5579 478.419 84.1214 380C161.685 281.582 290.621 241 237.121 410L204.621 541C160.38 785.659 186.99 803.106 340.621 587C450.55 377.642 486.96 296.167 488.786 251L635.286 308C480.786 800.5 409.622 825.5 599.622 511C789.622 196.5 867.695 293.5 745.695 528C690.786 756 585.195 811 782.695 502C980.195 193 1059.62 262 903.622 567C872.72 706.267 867.294 777.012 953.286 762.5';

export function VmLogo({ size = 120, animate = true }: { size?: number; animate?: boolean }) {
  const maskId = `vm-mask-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" role="img" aria-label="Viral Markets">
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
          <rect x="0" y="0" width="1024" height="1024" fill="#000" />
          <path
            className={animate ? 'vm-logo-stroke' : undefined}
            d={STROKE}
            fill="none"
            stroke="#fff"
            strokeWidth="136"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="3976 3976"
            strokeDashoffset={animate ? 3976 : 0}
            transform="scale(0.97431 1)"
          />
        </mask>
      </defs>
      <image
        href="/brand/vm-logo.png"
        x="0"
        y="0"
        width="1024"
        height="1024"
        preserveAspectRatio="xMidYMid meet"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

export function Wordmark({ height = 28 }: { height?: number }) {
  return (
    <img
      src="/brand/vm-wordmark.png"
      alt="Viral Markets"
      height={height}
      style={{ height, width: 'auto', display: 'block' }}
      draggable={false}
    />
  );
}
