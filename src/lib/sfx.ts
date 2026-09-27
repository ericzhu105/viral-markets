// Tiny synthesized sound effects — no audio files, works offline.

type Ctx = AudioContext;
let ctx: Ctx | null = null;
let muted = false;

export function setSfxMuted(value: boolean): void {
  muted = value;
}

/** Must be called from a tap/click so iOS lets us make noise later. */
export function unlockAudio(): void {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    // Play through the iPad's silent switch like the videos do.
    if (nav.audioSession) nav.audioSession.type = 'playback';
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // Sound is decoration; never break the game over it.
  }
}

function ready(): Ctx | null {
  if (muted || !ctx) return null;
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  c: Ctx,
  freq: number,
  start: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {},
) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.2, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(
  c: Ctx,
  start: number,
  dur: number,
  opts: { gain?: number; type?: BiquadFilterType; from?: number; to?: number; q?: number } = {},
) {
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? 'lowpass';
  filter.Q.value = opts.q ?? 1;
  filter.frequency.setValueAtTime(opts.from ?? 2000, t0);
  if (opts.to) filter.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain ?? 0.3, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

export const sfx = {
  swipe() {
    const c = ready();
    if (!c) return;
    noise(c, 0, 0.18, { type: 'bandpass', from: 700, to: 2600, q: 0.8, gain: 0.14 });
  },
  reveal(correct: boolean) {
    const c = ready();
    if (!c) return;
    if (correct) {
      tone(c, 880, 0, 0.09, { gain: 0.16 });
      tone(c, 1320, 0.07, 0.16, { gain: 0.16 });
    } else {
      tone(c, 220, 0, 0.22, { type: 'square', gain: 0.07, slideTo: 150 });
    }
  },
  win() {
    const c = ready();
    if (!c) return;
    // "Cha-ching": register bell + coins shimmer + a victory arpeggio.
    tone(c, 1568, 0, 0.12, { type: 'triangle', gain: 0.22 });
    tone(c, 2093, 0.09, 0.5, { type: 'triangle', gain: 0.22 });
    noise(c, 0.09, 0.45, { type: 'highpass', from: 6000, gain: 0.08 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, 0.55 + i * 0.1, 0.35, { type: 'square', gain: 0.06 }));
  },
  throwEgg() {
    const c = ready();
    if (!c) return;
    noise(c, 0, 0.4, { type: 'bandpass', from: 300, to: 1800, q: 1.2, gain: 0.12 });
  },
  splat() {
    const c = ready();
    if (!c) return;
    noise(c, 0, 0.45, { type: 'lowpass', from: 1800, to: 180, gain: 0.55 });
    tone(c, 140, 0, 0.3, { gain: 0.45, slideTo: 45 });
    noise(c, 0.05, 0.25, { type: 'bandpass', from: 3500, to: 900, q: 2, gain: 0.12 });
  },
};
