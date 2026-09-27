import { AnimatePresence, animate, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatViews } from '../lib/format';
import { eggLine, type ClipResult, type Score } from '../lib/game';
import { sfx } from '../lib/sfx';
import { EggSplat } from './EggSplat';
import { Check, Cross, Film, InstagramLogo, TikTokLogo } from './Icons';
import { WinBurst } from './WinBurst';

const FIRST_DELAY = 450;
const STEP = 520;

export function Results({
  score,
  prize,
  winNumber,
  onNextPlayer,
  onHome,
}: {
  score: Score;
  prize: string;
  winNumber: number;
  onNextPlayer: () => void;
  onHome: () => void;
}) {
  const [revealed, setRevealed] = useState(0);
  const [verdict, setVerdict] = useState(false);
  const shakeRef = useRef<HTMLDivElement>(null);
  const [claimTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  );
  const total = score.total;

  // Reveal rows one by one, then the verdict.
  useEffect(() => {
    if (revealed < total) {
      const t = window.setTimeout(() => {
        sfx.reveal(score.results[revealed].correct);
        setRevealed((r) => r + 1);
      }, revealed === 0 ? FIRST_DELAY : STEP);
      return () => window.clearTimeout(t);
    }
    if (!verdict) {
      const t = window.setTimeout(() => setVerdict(true), 420);
      return () => window.clearTimeout(t);
    }
  }, [revealed, verdict, total, score.results]);

  const skip = () => {
    if (revealed < total || !verdict) {
      setRevealed(total);
      setVerdict(true);
    }
  };

  const correctSoFar = score.results.slice(0, revealed).filter((r) => r.correct).length;
  const prizeText = prize.trim() || 'the prize';

  return (
    <motion.div
      className={`results${verdict ? (score.perfect ? ' won' : ' lost') : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      onClick={skip}
    >
      <div className="results-inner" ref={shakeRef}>
        <section className="results-hero">
          <div className={`score-badge${verdict ? (score.perfect ? ' win' : ' lose') : ''}`}>
            <span className="score-num">{correctSoFar}</span>
            <span className="score-den">/{total}</span>
          </div>
          <AnimatePresence mode="wait">
            {!verdict ? (
              <motion.div
                key="tally"
                className="verdict pending"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="verdict-title">Checking the numbers…</span>
                <span className="verdict-sub">Tap to skip</span>
              </motion.div>
            ) : score.perfect ? (
              <motion.div
                key="win"
                className="verdict win"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              >
                <span className="verdict-title">You beat the market 💸</span>
                <span className="prize-amount">{prizeText}</span>
                <span className="verdict-sub">Show this screen to a Viral Markets team member to claim it.</span>
                <span className="winner-stamp">
                  Winner #{winNumber} · {claimTime}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="lose"
                className="verdict lose"
                initial={{ opacity: 0, scale: 1.4, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: -3 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.55 }}
              >
                <span className="verdict-title egged">EGGED 🥚</span>
                <span className="verdict-sub">{eggLine(score.correct, total)}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="results-list" aria-label="Your calls">
          {score.results.map((r, i) => (
            <ResultRow key={r.clip.id} result={r} index={i} revealed={i < revealed} />
          ))}
        </section>

        <section className="results-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={(e) => {
              e.stopPropagation();
              onNextPlayer();
            }}
          >
            Next player
          </button>
          <button
            className="btn btn-secondary btn-lg"
            onClick={(e) => {
              e.stopPropagation();
              onHome();
            }}
          >
            Home
          </button>
        </section>

        <section className="promo">
          <img src="/brand/qr-viralmarkets.svg" alt="QR code to viralmarkets.com" className="promo-qr" />
          <div>
            <strong>Think you can call it for real?</strong>
            <span>Trade on how videos perform at viralmarkets.com</span>
          </div>
        </section>
      </div>

      {verdict && (score.perfect ? <WinBurst /> : <EggSplat shakeTarget={shakeRef} />)}
    </motion.div>
  );
}

function ResultRow({ result, index, revealed }: { result: ClipResult; index: number; revealed: boolean }) {
  const { clip, pick, correct, answer } = result;
  return (
    <motion.div
      className={`rrow${revealed ? (correct ? ' ok' : ' bad') : ''}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
    >
      <div className="rrow-thumb">{clip.poster ? <img src={clip.poster} alt="" /> : <Film size={20} />}</div>
      <div className="rrow-main">
        <div className="rrow-handle">
          {clip.platform === 'instagram' ? <InstagramLogo size={14} /> : <TikTokLogo size={14} />}
          <span>{clip.handle ? `@${clip.handle}` : `Video ${index + 1}`}</span>
        </div>
        <div className="rrow-line">
          Line {formatViews(clip.line ?? 0)} · you said <b className={`said-${pick}`}>{pick === 'over' ? 'OVER' : 'UNDER'}</b>
        </div>
      </div>
      <div className="rrow-actual">
        <span className="rrow-actual-label">{revealed ? `Real views · ${answer === 'over' ? 'over' : 'under'}` : 'Real views'}</span>
        <span className="rrow-actual-num">{revealed ? <CountUp value={clip.views ?? 0} /> : '???'}</span>
      </div>
      <div className="rrow-badge">
        {revealed && (
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.3 }}
          >
            {correct ? <Check size={22} /> : <Cross size={20} />}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.45,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = formatViews(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value]);
  return <span ref={ref}>0</span>;
}
