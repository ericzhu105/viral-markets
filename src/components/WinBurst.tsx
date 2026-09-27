import confetti from 'canvas-confetti';
import { useEffect, useRef } from 'react';
import { sfx } from '../lib/sfx';

const COLORS = ['#22c55e', '#4ade80', '#8257f5', '#b69cff', '#facc15', '#ffffff'];

/** Confetti cannons + raining cash. */
export function WinBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fire = confetti.create(canvas, { resize: true, useWorker: false });
    sfx.win();

    let cash: confetti.Shape[] = [];
    try {
      cash = ['💵', '💸', '🤑'].map((text) => confetti.shapeFromText({ text, scalar: 3 }));
    } catch {
      // Older browsers: plain confetti only.
    }

    const cannons = () => {
      void fire({ particleCount: 110, spread: 75, startVelocity: 62, angle: 60, origin: { x: 0, y: 0.85 }, colors: COLORS });
      void fire({ particleCount: 110, spread: 75, startVelocity: 62, angle: 120, origin: { x: 1, y: 0.85 }, colors: COLORS });
    };
    const rain = () => {
      if (!cash.length) return;
      void fire({
        particleCount: 10,
        spread: 180,
        startVelocity: 8,
        gravity: 0.55,
        ticks: 420,
        scalar: 3,
        flat: true,
        shapes: cash,
        origin: { x: Math.random(), y: -0.15 },
      });
    };

    cannons();
    const timers = [
      window.setTimeout(cannons, 800),
      ...Array.from({ length: 14 }, (_, i) => window.setTimeout(rain, 150 + i * 280)),
    ];
    return () => {
      timers.forEach(window.clearTimeout);
      fire.reset();
    };
  }, []);

  return <canvas ref={canvasRef} className="fx-canvas" aria-hidden />;
}
