/**
 * Parse human view counts: "250k", "1.2M", "1,200,000", "3b", "900 views".
 * Returns null for anything that isn't a non-negative number.
 */
export function parseViews(input: string): number | null {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/views?$/, '')
    .replace(/[,\s_]/g, '');
  if (!s) return null;
  const m = s.match(/^(\d+(?:\.\d*)?|\.\d+)([kmb])?$/);
  if (!m) return null;
  const mult = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : m[2] === 'b' ? 1e9 : 1;
  const n = Math.round(parseFloat(m[1]) * mult);
  return Number.isFinite(n) ? n : null;
}

const UNITS: [number, string][] = [
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

const trimZero = (s: string) => s.replace(/\.0$/, '');

/** Compact display: 1234 → "1.2K", 250000 → "250K", 1840000 → "1.8M". */
export function formatViews(n: number): string {
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  for (let i = 0; i < UNITS.length; i++) {
    const [size, unit] = UNITS[i];
    if (abs < size) continue;
    const x = n / size;
    const decimals = Math.abs(x) < 100 ? 1 : 0;
    const rounded = Number(x.toFixed(decimals));
    // 999,999 would round to "1000K" — promote to the next unit instead.
    if (Math.abs(rounded) >= 1000 && i > 0) {
      const [bigSize, bigUnit] = UNITS[i - 1];
      return trimZero((n / bigSize).toFixed(1)) + bigUnit;
    }
    return trimZero(rounded.toFixed(decimals)) + unit;
  }
  return String(n);
}

/** Full display with separators: 1234567 → "1,234,567". */
export function formatFull(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/**
 * Text to put back into an input: compact when it round-trips exactly,
 * otherwise the full number so no precision is lost on re-parse.
 */
export function formatEditable(n: number | null): string {
  if (n == null) return '';
  const compact = formatViews(n);
  return parseViews(compact) === n ? compact : formatFull(n);
}

/** Round to two significant figures: 1,234,567 → 1,200,000. */
export function roundNice(n: number): number {
  if (n <= 0) return 0;
  if (n < 100) return Math.round(n);
  const step = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / step) * step;
}

/**
 * Suggest a line that makes the clip a fair coin flip for players:
 * half the time well below the real views (answer OVER), half the time well above (answer UNDER).
 */
export function suggestLine(views: number, rand: () => number = Math.random): number {
  const wantOver = rand() < 0.5;
  const factor = wantOver ? 0.35 + rand() * 0.45 : 1.25 + rand() * 1.25;
  let line = roundNice(views * factor);
  if (wantOver && line > views) line = roundNice(views * 0.5);
  if (!wantOver && line <= views) line = roundNice(views * 2);
  return Math.max(1, line);
}
