import {
  AnimatePresence,
  animate,
  motion,
  useIsPresent,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatViews } from '../lib/format';
import { checkPlayable, scoreRound, type Score } from '../lib/game';
import { playVideo, rebuildVideoSrc, resolveVideoSrc } from '../lib/media';
import { go } from '../lib/router';
import { setSfxMuted, sfx, unlockAudio } from '../lib/sfx';
import { useStore } from '../lib/store';
import type { Clip, Game, Pick } from '../lib/types';
import { useWakeLock } from '../lib/useWakeLock';
import { ArrowLeft, ArrowRight, ChevronLeft, InstagramLogo, Play, TikTokLogo, Volume, VolumeOff } from './Icons';
import { Results } from './Results';
import { VmLogo } from './VmLogo';

export function PlayScreen({ id }: { id: string }) {
  const { games, ready, setStaffUnlocked } = useStore();
  const game = games.find((g) => g.id === id);
  const [round, setRound] = useState(0);

  useWakeLock(true);
  // Starting a game re-locks the editor so players can't peek at answers via the back arrow.
  useEffect(() => setStaffUnlocked(false), [setStaffUnlocked]);

  if (!ready) return <div className="screen-center muted">Loading…</div>;
  if (!game) {
    return (
      <div className="screen-center">
        <p className="muted">That game doesn’t exist on this device.</p>
        <button className="btn btn-secondary" onClick={() => go('/')}>
          Back to games
        </button>
      </div>
    );
  }
  const check = checkPlayable(game);
  if (!check.playable) {
    return (
      <div className="screen-center">
        <p className="muted">This game isn’t ready yet: {check.reason}.</p>
        <button className="btn btn-secondary" onClick={() => go('/')}>
          Back to games
        </button>
      </div>
    );
  }
  return <Round key={`${game.id}-${round}`} game={game} onNextPlayer={() => setRound((r) => r + 1)} />;
}

type Phase = 'intro' | 'playing' | 'results';

function Round({ game, onNextPlayer }: { game: Game; onNextPlayer: () => void }) {
  const { settings, updateSettings, recordPlay } = useStore();
  // Snapshot the clips so edits elsewhere can't change a round in progress.
  const [clips] = useState<Clip[]>(() => game.clips);
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const [srcs, setSrcs] = useState<Record<string, string | undefined> | null>(null);
  const [muted, setMuted] = useState(settings.muted);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<{ score: Score; winNumber: number } | null>(null);

  const videos = useRef(new Map<string, HTMLVideoElement>());
  const mutedRef = useRef(muted);
  const lockUntil = useRef(0);
  const feedbackX = useMotionValue(0);

  useEffect(() => {
    let alive = true;
    void Promise.all(clips.map(async (c) => [c.id, await resolveVideoSrc(c)] as const)).then((entries) => {
      if (alive) setSrcs(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [clips]);

  useEffect(() => setSfxMuted(muted), [muted]);

  const onPlayOutcome = useCallback((outcome: 'sound' | 'muted' | 'blocked') => {
    if (outcome === 'blocked') setNeedsTap(true);
    else setNeedsTap(false);
    setSoundBlocked(outcome === 'muted' && !mutedRef.current);
  }, []);

  const playClip = useCallback(
    (clip: Clip | undefined, restart: boolean) => {
      if (!clip) return;
      const v = videos.current.get(clip.id);
      if (!v) return;
      if (restart) {
        try {
          v.currentTime = 0;
        } catch {
          // not seekable yet
        }
      }
      setPaused(false);
      void playVideo(v, !mutedRef.current).then(onPlayOutcome);
    },
    [onPlayOutcome],
  );

  const start = () => {
    unlockAudio();
    playClip(clips[0], true);
    setPhase('playing');
  };

  // Called straight from pointerup / click / keydown so the next video may start with sound on iOS.
  const commit = (pick: Pick) => {
    if (phase !== 'playing' || performance.now() < lockUntil.current) return;
    const clip = clips[index];
    if (!clip) return;
    lockUntil.current = performance.now() + 220;
    videos.current.get(clip.id)?.pause();
    sfx.swipe();
    feedbackX.set(0);
    const nextPicks = { ...picks, [clip.id]: pick };
    setPicks(nextPicks);
    setExitDir(pick === 'over' ? 1 : -1);
    setIndex(index + 1);
    const next = clips[index + 1];
    if (next) {
      playClip(next, true);
    } else {
      const score = scoreRound(clips, nextPicks);
      const winNumber = recordPlay(game.id, score.perfect);
      setResult({ score, winNumber });
      window.setTimeout(() => setPhase('results'), 420);
    }
  };
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    mutedRef.current = m;
    updateSettings({ muted: m });
    setSoundBlocked(false);
    const v = clips[index] && videos.current.get(clips[index].id);
    if (v) {
      v.muted = m;
      if (!m && phase === 'playing') void playVideo(v, true).then(onPlayOutcome);
    }
  };

  const tapCard = () => {
    const clip = clips[index];
    const v = clip && videos.current.get(clip.id);
    if (!v || phase !== 'playing') return;
    if (soundBlocked || needsTap) {
      playClip(clip, false);
      return;
    }
    if (v.paused) {
      playClip(clip, false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  // Keyboard: ← / → for laptops, space to pause, enter to start.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') commitRef.current('under');
      else if (e.key === 'ArrowRight') commitRef.current('over');
      else if (e.key === 'Enter' && phase === 'intro' && srcs) start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Pause when the iPad sleeps / app is backgrounded; pick back up when it wakes.
  const resumeRef = useRef(() => {});
  resumeRef.current = () => {
    if (phase === 'playing' && !paused) playClip(clips[index], false);
  };
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') videos.current.forEach((v) => v.pause());
      else resumeRef.current();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const exit = () => {
    videos.current.forEach((v) => v.pause());
    go('/');
  };

  const registerVideo = useCallback((clipId: string, el: HTMLVideoElement | null) => {
    if (el) videos.current.set(clipId, el);
    else videos.current.delete(clipId);
  }, []);

  const visible = phase === 'results' ? [] : clips.slice(index, index + 2);
  const current = Math.min(index, clips.length - 1);

  return (
    <div className={`play phase-${phase}`}>
      <div className="play-top">
        <button className="back-btn" onClick={exit} aria-label="Back to games">
          <ChevronLeft size={26} />
        </button>
        {phase !== 'intro' && (
          <div className="progress" aria-label={`Video ${current + 1} of ${clips.length}`}>
            <div className="progress-segments">
              {clips.map((c, i) => (
                <span key={c.id} className={i < index ? 'done' : i === index ? 'current' : ''} />
              ))}
            </div>
            <span className="progress-text">
              {Math.min(index + 1, clips.length)} / {clips.length}
            </span>
          </div>
        )}
        <button className="round-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeOff size={22} /> : <Volume size={22} />}
        </button>
      </div>

      <div className="play-stage">
        <PickButton pick="under" feedbackX={feedbackX} disabled={phase !== 'playing'} onPick={commit} />
        <div className="deck-wrap">
          <div className="deck">
            <AnimatePresence custom={exitDir}>
              {visible.map((clip, i) => (
                <SwipeCard
                  key={clip.id}
                  clip={clip}
                  src={srcs?.[clip.id]}
                  isTop={i === 0}
                  active={i === 0 && phase === 'playing'}
                  muted={muted}
                  paused={paused}
                  needsTap={needsTap}
                  feedbackX={feedbackX}
                  registerVideo={registerVideo}
                  onCommit={(p) => commitRef.current(p)}
                  onTap={tapCard}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
        <PickButton pick="over" feedbackX={feedbackX} disabled={phase !== 'playing'} onPick={commit} />
      </div>

      <AnimatePresence>
        {soundBlocked && phase === 'playing' && (
          <motion.button
            className="sound-chip"
            initial={{ opacity: 0, y: -8, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, x: '-50%' }}
            onClick={() => playClip(clips[index], false)}
          >
            <VolumeOff size={18} /> Tap for sound
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'intro' && <Intro game={game} clips={clips} ready={srcs != null} onStart={start} />}
      </AnimatePresence>

      {phase === 'results' && result && (
        <Results
          score={result.score}
          prize={game.prize}
          winNumber={result.winNumber}
          onNextPlayer={onNextPlayer}
          onHome={exit}
        />
      )}
    </div>
  );
}

function PickButton({
  pick,
  feedbackX,
  disabled,
  onPick,
}: {
  pick: Pick;
  feedbackX: MotionValue<number>;
  disabled: boolean;
  onPick: (p: Pick) => void;
}) {
  const scale = useTransform(feedbackX, pick === 'over' ? [0, 160] : [-160, 0], pick === 'over' ? [1, 1.1] : [1.1, 1]);
  return (
    <motion.button
      className={`pick-btn pick-${pick}`}
      style={{ scale }}
      disabled={disabled}
      onClick={() => onPick(pick)}
      aria-label={pick === 'over' ? 'Over' : 'Under'}
    >
      <span className="pick-main">
        {pick === 'under' && <ArrowLeft size={30} strokeWidth={3} />}
        <span className="pick-label">{pick === 'under' ? 'Under' : 'Over'}</span>
        {pick === 'over' && <ArrowRight size={30} strokeWidth={3} />}
      </span>
      <span className="pick-sub">{pick === 'under' ? 'swipe left' : 'swipe right'}</span>
    </motion.button>
  );
}

const SPRING = { type: 'spring' as const, stiffness: 520, damping: 34 };

function SwipeCard({
  clip,
  src,
  isTop,
  active,
  muted,
  paused,
  needsTap,
  feedbackX,
  registerVideo,
  onCommit,
  onTap,
}: {
  clip: Clip;
  src: string | undefined;
  isTop: boolean;
  active: boolean;
  muted: boolean;
  paused: boolean;
  needsTap: boolean;
  feedbackX: MotionValue<number>;
  registerVideo: (clipId: string, el: HTMLVideoElement | null) => void;
  onCommit: (p: Pick) => void;
  onTap: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-420, 0, 420], [-15, 0, 15]);
  const overOpacity = useTransform(x, [24, 130], [0, 1]);
  const underOpacity = useTransform(x, [-130, -24], [1, 0]);
  const isPresent = useIsPresent();
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [localSrc, setLocalSrc] = useState(src);
  const [contain, setContain] = useState(false);
  const retried = useRef(false);
  const handlers = useRef({ onCommit, onTap });
  handlers.current = { onCommit, onTap };

  useEffect(() => setLocalSrc(src), [src]);

  useMotionValueEvent(x, 'change', (v) => {
    if (isTop && isPresent) feedbackX.set(v);
  });

  // Swipe decisions happen on the native pointerup: framer's onDragEnd fires a frame later,
  // outside the gesture, and iOS would then refuse to start the next video with sound.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !isTop) return;
    let start: { x: number; y: number; t: number } | null = null;

    const onUp = (e: PointerEvent) => {
      cleanupWindow();
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      const quick = performance.now() - start.t < 450;
      start = null;
      const dx = x.get();
      const vx = x.getVelocity();
      const threshold = Math.min(150, el.offsetWidth * 0.26);
      if (dx > threshold || (vx > 650 && dx > 40)) handlers.current.onCommit('over');
      else if (dx < -threshold || (vx < -650 && dx < -40)) handlers.current.onCommit('under');
      else {
        animate(x, 0, SPRING);
        animate(y, 0, SPRING);
        if (moved < 10 && quick) handlers.current.onTap();
      }
    };
    const onCancel = () => {
      cleanupWindow();
      start = null;
      animate(x, 0, SPRING);
      animate(y, 0, SPRING);
    };
    const cleanupWindow = () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      start = { x: e.clientX, y: e.clientY, t: performance.now() };
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    };
    el.addEventListener('pointerdown', onDown);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      cleanupWindow();
    };
  }, [isTop, x, y]);

  // Keep playback in sync (covers cases where the gesture-time play() didn't happen).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (!active) {
      if (!isTop) v.pause();
      return;
    }
    if (v.paused && !paused && !needsTap) void playVideo(v, !muted);
  }, [active, isTop, muted, paused, needsTap, localSrc]);

  // Progress bar at the bottom of the card, like TikTok's.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      const bar = barRef.current;
      if (v && bar && v.duration > 0) bar.style.transform = `scaleX(${v.currentTime / v.duration})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  const setVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      registerVideo(clip.id, el);
    },
    [clip.id, registerVideo],
  );

  return (
    <motion.div
      ref={cardRef}
      className={`swipe-card${isTop ? ' top' : ''}`}
      style={{ x, y, rotate, zIndex: isPresent ? (isTop ? 3 : 2) : 5 }}
      drag={isTop && isPresent}
      dragMomentum={false}
      dragElastic={1}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={isTop ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.94, opacity: 1, y: 16 }}
      exit="exit"
      variants={{
        exit: (dir: number) => ({
          x: dir * (Math.max(window.innerWidth, 800) * 0.9 + 200),
          opacity: 0,
          transition: { duration: 0.42, ease: [0.32, 0.05, 0.66, 1] },
        }),
      }}
      transition={SPRING}
    >
      <div className="card-media">
        {contain && clip.poster && <div className="card-backdrop" style={{ backgroundImage: `url(${clip.poster})` }} />}
        <video
          ref={setVideo}
          className={`card-video${contain ? ' contain' : ''}`}
          src={localSrc}
          poster={clip.poster}
          playsInline
          loop
          muted={muted}
          preload="auto"
          disablePictureInPicture
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoWidth && v.videoHeight) setContain(v.videoWidth / v.videoHeight > 0.75);
          }}
          onError={() => {
            if (retried.current || !clip.videoKey) return;
            retried.current = true;
            void rebuildVideoSrc(clip).then((s) => s && setLocalSrc(s));
          }}
        />
        {!localSrc && <div className="card-missing">Video unavailable on this device</div>}
      </div>
      <div className="card-shade" />
      <motion.div className="card-tint tint-over" style={{ opacity: overOpacity }} />
      <motion.div className="card-tint tint-under" style={{ opacity: underOpacity }} />
      <motion.div className="stamp stamp-over" style={{ opacity: overOpacity }}>
        Over
      </motion.div>
      <motion.div className="stamp stamp-under" style={{ opacity: underOpacity }}>
        Under
      </motion.div>

      <div className="card-info">
        {clip.handle && (
          <div className="card-creator">
            {clip.platform === 'instagram' ? <InstagramLogo size={18} /> : <TikTokLogo size={18} />}
            <span>@{clip.handle}</span>
          </div>
        )}
        {clip.caption && <p className="card-caption">{clip.caption}</p>}
        <div className="card-question">
          <span className="q-kicker">Over or under</span>
          <span className="q-line">
            {formatViews(clip.line ?? 0)} <small>views?</small>
          </span>
        </div>
      </div>

      <div className="card-progress">
        <div ref={barRef} />
      </div>

      {isTop && active && (paused || needsTap) && (
        <div className="card-center-icon">
          <Play size={44} />
        </div>
      )}
    </motion.div>
  );
}

function Intro({ game, clips, ready, onStart }: { game: Game; clips: Clip[]; ready: boolean; onStart: () => void }) {
  const n = clips.length;
  const poster = clips[0]?.poster;
  return (
    <motion.div
      className="intro"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.28 } }}
    >
      <div className="intro-bg" style={poster ? { backgroundImage: `url(${poster})` } : undefined} />
      <div className="intro-glow" />
      <div className="intro-content">
        <VmLogo size={120} />
        <p className="intro-kicker">Viral Markets</p>
        <h1 className="intro-title">
          Over <span>or</span> Under?
        </h1>
        <p className="intro-sub">
          {n} video{n === 1 ? '' : 's'}. Did each one beat its view line?
        </p>
        <div className="intro-rules">
          <div className="rule rule-win">
            <span className="rule-emoji">💸</span>
            <div>
              <strong>Get all {n} right</strong>
              <span>win {game.prize.trim() || 'the prize'}</span>
            </div>
          </div>
          <div className="rule rule-egg">
            <span className="rule-emoji">🥚</span>
            <div>
              <strong>Miss even one</strong>
              <span>you get egged</span>
            </div>
          </div>
        </div>
        <div className="intro-howto" aria-hidden>
          <span className="howto-under">
            <ArrowLeft size={18} /> Under
          </span>
          <span className="howto-mid">swipe</span>
          <span className="howto-over">
            Over <ArrowRight size={18} />
          </span>
        </div>
        <button className="btn-start" onClick={onStart} disabled={!ready}>
          <Play size={22} /> {ready ? 'Tap to start' : 'Loading videos…'}
        </button>
      </div>
    </motion.div>
  );
}
