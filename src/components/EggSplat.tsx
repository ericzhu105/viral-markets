import { motion } from 'framer-motion';
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { sfx } from '../lib/sfx';

// An egg gets thrown at the screen, splats, drips, then slides off so the results stay readable.

const IMPACT = 0.42; // seconds
const TOTAL = 4.2;

type Pt = [number, number];

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Closed Catmull-Rom spline through the points → smooth, gooey blob. */
function blob(pts: Pt[]): string {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return `${d} Z`;
}

/** A gooey drip: wide where it leaves the splat, thin neck, round bulb at the end. */
function dripPath(x: number, top: number, w: number, len: number): string {
  const bot = top + len;
  const wTop = w * 1.9;
  const neck = w * 0.62;
  const bulb = w * 0.62;
  const f = (n: number) => n.toFixed(1);
  return [
    `M${f(x - wTop / 2)},${f(top)}`,
    `C${f(x - wTop / 2)},${f(top + len * 0.22)} ${f(x - neck / 2)},${f(top + len * 0.3)} ${f(x - neck / 2)},${f(top + len * 0.55)}`,
    `L${f(x - neck / 2)},${f(bot - bulb * 0.9)}`,
    `A${f(bulb)},${f(bulb)} 0 1 0 ${f(x + neck / 2)},${f(bot - bulb * 0.9)}`,
    `L${f(x + neck / 2)},${f(top + len * 0.55)}`,
    `C${f(x + neck / 2)},${f(top + len * 0.3)} ${f(x + wTop / 2)},${f(top + len * 0.22)} ${f(x + wTop / 2)},${f(top)}`,
    'Z',
  ].join(' ');
}

function makeSplat(seed: number) {
  const rand = rng(seed);
  const cx = 500;
  const cy = 440;
  const r = 250;
  const n = 28;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.12;
    const finger = rand() < 0.3;
    const rr = r * (finger ? 1.22 + rand() * 0.5 : 0.8 + rand() * 0.2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9]);
  }
  const drops = Array.from({ length: 13 }, () => {
    const a = rand() * Math.PI * 2;
    const dist = r * (1.45 + rand() * 0.6);
    return { x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist * 0.9, r: 6 + rand() * 18 };
  });
  const drips = Array.from({ length: 5 }, (_, i) => {
    const x = cx - r * 0.5 + (i / 4) * r + (rand() - 0.5) * 30;
    const w = 14 + rand() * 14;
    const len = 170 + rand() * 260;
    // Start well inside the white so the drip's top edge is hidden under it.
    return { d: dripPath(x, cy + r * 0.22, w, len), delay: 0.1 + rand() * 0.5 };
  });
  const shells = Array.from({ length: 11 }, () => {
    const a = rand() * Math.PI * 2;
    const size = 16 + rand() * 26;
    const shape: Pt[] = [
      [0, -size],
      [size * (0.6 + rand() * 0.5), size * (0.2 + rand() * 0.6)],
      [-size * (0.5 + rand() * 0.5), size * (0.3 + rand() * 0.5)],
    ];
    return {
      d: `M${shape.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L')} Z`,
      dx: Math.cos(a) * (220 + rand() * 260),
      dy: Math.sin(a) * (160 + rand() * 200) - 120,
      rot: (rand() - 0.5) * 720,
    };
  });
  return {
    cx,
    cy,
    r,
    white: blob(pts),
    drops,
    drips,
    shells,
    yolk: { x: cx + r * 0.07, y: cy - r * 0.04, r: r * 0.36 },
  };
}

// Dev-only: sessionStorage['vm-hold-fx'] = '1' freezes the splat on screen for inspection.
const HOLD = import.meta.env.DEV && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('vm-hold-fx') === '1';

export function EggSplat({ shakeTarget }: { shakeTarget?: RefObject<HTMLElement | null> }) {
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const s = useMemo(() => makeSplat(seed), [seed]);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    sfx.throwEgg();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const impact = window.setTimeout(() => {
      sfx.splat();
      if (!reduce) {
        shakeTarget?.current?.animate(
          [
            { transform: 'translate(0,0)' },
            { transform: 'translate(-16px, 10px)' },
            { transform: 'translate(14px, -8px)' },
            { transform: 'translate(-8px, 6px)' },
            { transform: 'translate(4px, -2px)' },
            { transform: 'translate(0,0)' },
          ],
          { duration: 420, easing: 'ease-out' },
        );
      }
    }, IMPACT * 1000);
    const done = HOLD ? undefined : window.setTimeout(() => setGone(true), TOTAL * 1000);
    return () => {
      window.clearTimeout(impact);
      window.clearTimeout(done);
    };
  }, [shakeTarget]);

  if (gone) return null;

  const fillBox = { transformBox: 'fill-box' as const, transformOrigin: 'center' };

  return (
    <motion.div
      className="egg-layer"
      aria-hidden
      initial={{ opacity: 1, y: 0 }}
      animate={HOLD ? { opacity: 1, y: 0 } : { opacity: [1, 1, 0], y: [0, 0, 220] }}
      transition={{ duration: TOTAL, times: [0, 0.74, 1], ease: 'easeIn' }}
    >
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="egg-svg">
        <defs>
          <radialGradient id="egg-white" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.97" />
            <stop offset="70%" stopColor="#fbf6e6" stopOpacity="0.94" />
            <stop offset="100%" stopColor="#efe4c4" stopOpacity="0.92" />
          </radialGradient>
          <linearGradient id="egg-drip" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#efe4c4" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#e9dcb6" stopOpacity="0.93" />
          </linearGradient>
          <radialGradient id="egg-yolk" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fff1a8" />
            <stop offset="35%" stopColor="#ffcc2e" />
            <stop offset="100%" stopColor="#ef8f00" />
          </radialGradient>
          <radialGradient id="egg-shell" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fffaf1" />
            <stop offset="100%" stopColor="#e2cba8" />
          </radialGradient>
        </defs>

        {/* The throw */}
        <motion.g
          style={fillBox}
          initial={{ x: 0, y: 620, scale: 0.18, rotate: -50, opacity: 1 }}
          animate={{ x: 0, y: 0, scale: 1.3, rotate: 250, opacity: [1, 1, 0] }}
          transition={{ duration: IMPACT, ease: [0.5, 0, 1, 1], opacity: { duration: IMPACT + 0.02, times: [0, 0.97, 1] } }}
        >
          <ellipse cx={s.cx} cy={s.cy} rx="62" ry="80" fill="url(#egg-shell)" stroke="#d6bd96" strokeWidth="3" />
          <ellipse cx={s.cx - 20} cy={s.cy - 30} rx="14" ry="22" fill="#fff" opacity="0.7" />
        </motion.g>

        {/* The splat */}
        <motion.g
          style={fillBox}
          initial={{ scale: 0.15, opacity: 0 }}
          animate={{ scale: [0.15, 1.08, 1], opacity: 1 }}
          transition={{ delay: IMPACT, duration: 0.38, times: [0, 0.6, 1], ease: 'easeOut' }}
        >
          {s.drips.map((d, i) => (
            <motion.g
              key={i}
              style={{ transformBox: 'fill-box', transformOrigin: 'top' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: IMPACT + 0.35 + d.delay, duration: 2.4, ease: [0.2, 0.7, 0.3, 1] }}
            >
              <path d={d.d} fill="url(#egg-drip)" />
            </motion.g>
          ))}
          <path d={s.white} fill="url(#egg-white)" stroke="rgba(214,196,150,0.55)" strokeWidth="3" />
          {s.drops.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="url(#egg-white)" />
          ))}
          <circle cx={s.yolk.x} cy={s.yolk.y} r={s.yolk.r} fill="url(#egg-yolk)" stroke="rgba(190,100,0,0.35)" strokeWidth="3" />
          <ellipse
            cx={s.yolk.x - s.yolk.r * 0.35}
            cy={s.yolk.y - s.yolk.r * 0.4}
            rx={s.yolk.r * 0.3}
            ry={s.yolk.r * 0.17}
            fill="#fff"
            opacity="0.75"
            transform={`rotate(-30 ${s.yolk.x - s.yolk.r * 0.35} ${s.yolk.y - s.yolk.r * 0.4})`}
          />
        </motion.g>

        {/* Shell shrapnel */}
        {s.shells.map((sh, i) => (
          <motion.path
            key={i}
            d={sh.d}
            fill="url(#egg-shell)"
            stroke="#cdb48c"
            strokeWidth="2"
            style={fillBox}
            initial={{ x: s.cx, y: s.cy, opacity: 0, rotate: 0 }}
            animate={{
              x: [s.cx, s.cx + sh.dx, s.cx + sh.dx * 1.15],
              y: [s.cy, s.cy + sh.dy, s.cy + sh.dy + 520],
              rotate: sh.rot,
              opacity: [1, 1, 0],
            }}
            transition={{ delay: IMPACT, duration: 1.3, times: [0, 0.3, 1], ease: 'easeOut' }}
          />
        ))}
      </svg>
      <motion.div
        className="egg-stamp"
        initial={{ opacity: 0, scale: 2.4, rotate: -14 }}
        animate={{ opacity: 1, scale: 1, rotate: -8 }}
        transition={{ delay: IMPACT + 0.2, type: 'spring', stiffness: 420, damping: 16 }}
      >
        EGGED
      </motion.div>
    </motion.div>
  );
}
