import { useEffect, useRef, useState, type ReactNode } from 'react';
import { protectKey, putVideo } from '../lib/db';
import { formatEditable, formatFull, parseViews, suggestLine } from '../lib/format';
import { checkPlayable, clipIssues, correctPick } from '../lib/game';
import { captureVideoInfo, releaseVideoSrc, resolveVideoSrc } from '../lib/media';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import type { Clip, Game, Platform } from '../lib/types';
import { uid } from '../lib/uid';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Dice,
  Film,
  InstagramLogo,
  Play,
  Plus,
  Replace,
  TikTokLogo,
  Trash,
} from './Icons';
import { Modal } from './Modal';
import { toast } from './Toast';

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp)$/i;

export function Editor({ id }: { id: string }) {
  const { games, ready, updateGame, deleteGame, cleanUpVideosSoon } = useStore();
  const game = games.find((g) => g.id === id);
  const addInput = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Clip | null>(null);

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
  const patchGame = (fn: (g: Game) => Game) => updateGame(game.id, fn);
  const patchClip = (clipId: string, patch: Partial<Clip>) =>
    patchGame((g) => ({ ...g, clips: g.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)) }));
  const markBusy = (clipId: string, busy: boolean) =>
    setProcessing((prev) => {
      const next = new Set(prev);
      if (busy) next.add(clipId);
      else next.delete(clipId);
      return next;
    });

  const storeVideo = async (clipId: string, file: File, isNew: boolean) => {
    const key = uid();
    const release = protectKey(key);
    markBusy(clipId, true);
    const previousKey = game.clips.find((c) => c.id === clipId)?.videoKey;
    try {
      await putVideo(key, file);
      const info = await captureVideoInfo(file);
      patchGame((g) => ({
        ...g,
        sample: false,
        clips: g.clips.map((c) =>
          c.id === clipId ? { ...c, videoKey: key, videoUrl: undefined, poster: info.poster } : c,
        ),
      }));
      if (previousKey && !isNew) {
        releaseVideoSrc(previousKey);
        cleanUpVideosSoon();
      }
    } catch {
      toast(`Couldn’t save ${file.name}. Is the iPad out of storage?`);
      if (isNew) patchGame((g) => ({ ...g, clips: g.clips.filter((c) => c.id !== clipId) }));
    } finally {
      markBusy(clipId, false);
      setTimeout(release, 3000);
    }
  };

  const addFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (addInput.current) addInput.current.value = '';
    const videos = files.filter((f) => f.type.startsWith('video/') || VIDEO_EXT.test(f.name));
    if (videos.length < files.length) toast('Skipped files that aren’t videos');
    const fresh = videos.map((file) => {
      const clip: Clip = { id: uid(), handle: '', platform: 'tiktok', caption: '', line: null, views: null };
      return { file, clip };
    });
    if (fresh.length === 0) return;
    fresh.forEach(({ clip }) => markBusy(clip.id, true));
    patchGame((g) => ({ ...g, sample: false, clips: [...g.clips, ...fresh.map((f) => f.clip)] }));
    // One at a time keeps memory low on the iPad.
    for (const { file, clip } of fresh) await storeVideo(clip.id, file, true);
  };

  const move = (index: number, dir: -1 | 1) =>
    patchGame((g) => {
      const clips = [...g.clips];
      const j = index + dir;
      if (j < 0 || j >= clips.length) return g;
      [clips[index], clips[j]] = [clips[j], clips[index]];
      return { ...g, clips };
    });

  const remove = (clip: Clip) => {
    if (!window.confirm('Remove this video from the game?')) return;
    patchGame((g) => ({ ...g, clips: g.clips.filter((c) => c.id !== clip.id) }));
    if (clip.videoKey) releaseVideoSrc(clip.videoKey);
    cleanUpVideosSoon();
  };

  return (
    <div className="editor">
      <header className="editor-top">
        <button className="btn btn-ghost btn-sm" onClick={() => go('/')}>
          <ChevronLeft size={20} /> Games
        </button>
        <h1 className="editor-title">Edit game</h1>
        <div className="editor-top-actions">
          <button className="btn btn-secondary btn-sm" disabled={!check.playable} onClick={() => go(`/play/${game.id}`)}>
            <Play size={16} /> Play
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => go('/')}>
            Done
          </button>
        </div>
      </header>

      <main className="editor-main">
        <section className="panel">
          <div className="field-grid two">
            <label className="field">
              <span className="field-label">Game name</span>
              <input
                className="input"
                value={game.name}
                maxLength={60}
                placeholder="e.g. Demo Day Challenge"
                onChange={(e) => patchGame((g) => ({ ...g, name: e.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field-label">Prize for a perfect score</span>
              <input
                className="input"
                value={game.prize}
                maxLength={30}
                placeholder="$20"
                onChange={(e) => patchGame((g) => ({ ...g, prize: e.target.value }))}
              />
            </label>
          </div>
        </section>

        <section>
          <div className="section-head">
            <div>
              <h2>
                Videos <span className="count">{game.clips.length}</span>
              </h2>
              <p className="muted small">
                Players must call every one right to win. Five is the sweet spot. Order here = order in the game.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => addInput.current?.click()}>
              <Plus size={18} /> Add videos
            </button>
          </div>

          <div className="clip-list">
            {game.clips.map((clip, i) => (
              <ClipRow
                key={clip.id}
                clip={clip}
                index={i}
                total={game.clips.length}
                busy={processing.has(clip.id)}
                onPatch={(p) => patchClip(clip.id, p)}
                onMove={(dir) => move(i, dir)}
                onRemove={() => remove(clip)}
                onReplace={(file) => void storeVideo(clip.id, file, false)}
                onPreview={() => setPreview(clip)}
              />
            ))}
          </div>

          <button className="add-videos" onClick={() => addInput.current?.click()}>
            <Film size={28} />
            <strong>{game.clips.length ? 'Add more videos' : 'Add your videos'}</strong>
            <span>From Photos or Files — you can pick several at once. MP4 or MOV.</span>
          </button>
          <input
            ref={addInput}
            type="file"
            accept="video/*,.mp4,.mov,.m4v"
            multiple
            hidden
            onChange={(e) => void addFiles(e.target.files)}
          />
        </section>

        <section className="panel tips">
          <h3>Tips</h3>
          <ul>
            <li>Use clean downloads — if the like or view count is visible in the video, players can cheat.</li>
            <li>
              Tap <Dice size={14} /> to auto-pick a tricky line from the real views (random, sometimes above, sometimes
              below).
            </li>
            <li>A tie counts as OVER (“did it reach 250K?”).</li>
          </ul>
        </section>

        <section className="danger-zone">
          <button
            className="btn btn-ghost danger-text"
            onClick={() => {
              if (window.confirm(`Delete “${game.name}”? Its videos are removed from this device.`)) {
                go('/');
                deleteGame(game.id);
              }
            }}
          >
            <Trash size={18} /> Delete game
          </button>
        </section>
      </main>

      <PreviewModal clip={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function ClipRow({
  clip,
  index,
  total,
  busy,
  onPatch,
  onMove,
  onRemove,
  onReplace,
  onPreview,
}: {
  clip: Clip;
  index: number;
  total: number;
  busy: boolean;
  onPatch: (p: Partial<Clip>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onReplace: (file: File) => void;
  onPreview: () => void;
}) {
  const replaceInput = useRef<HTMLInputElement>(null);
  const issues = clipIssues(clip);
  const answer = clip.line != null && clip.views != null ? correctPick({ line: clip.line, views: clip.views }) : null;

  return (
    <div className={`clip-row${issues.length && !busy ? ' has-issues' : ''}`}>
      <button className="clip-thumb" onClick={onPreview} disabled={busy || issues.includes('video')}>
        {clip.poster ? <img src={clip.poster} alt="" draggable={false} /> : <Film size={26} />}
        <span className="clip-index">{index + 1}</span>
        {busy ? <span className="spinner" /> : !issues.includes('video') && <span className="thumb-play"><Play size={18} /></span>}
      </button>

      <div className="clip-fields">
        <div className="field-grid handle-row">
          <label className="field">
            <span className="field-label">Creator</span>
            <div className="input-affix">
              <span>@</span>
              <input
                className="input"
                value={clip.handle}
                placeholder="handle"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={40}
                onChange={(e) => onPatch({ handle: e.target.value.replace(/^@+/, '').trim() })}
              />
            </div>
          </label>
          <div className="field">
            <span className="field-label">Platform</span>
            <div className="segmented">
              {(['tiktok', 'instagram'] as Platform[]).map((p) => (
                <button
                  key={p}
                  className={clip.platform === p ? 'active' : ''}
                  onClick={() => onPatch({ platform: p })}
                  type="button"
                >
                  {p === 'tiktok' ? <TikTokLogo size={15} /> : <InstagramLogo size={15} />}
                  {p === 'tiktok' ? 'TikTok' : 'Reels'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Caption (optional)</span>
          <input
            className="input"
            value={clip.caption}
            placeholder="What players see under the handle"
            maxLength={120}
            onChange={(e) => onPatch({ caption: e.target.value })}
          />
        </label>

        <div className="field-grid numbers-row">
          <ViewsInput
            label="Over / under line"
            value={clip.line}
            placeholder="e.g. 250K"
            onChange={(line) => onPatch({ line })}
            action={
              <button
                type="button"
                className="dice-btn"
                disabled={clip.views == null || clip.views <= 0}
                onClick={() => clip.views && onPatch({ line: suggestLine(clip.views) })}
                aria-label="Suggest a line"
                title="Suggest a line from the real views"
              >
                <Dice size={20} />
              </button>
            }
          />
          <ViewsInput
            label="Real views"
            value={clip.views}
            placeholder="e.g. 1.2M"
            onChange={(views) => onPatch({ views })}
          />
          <div className="field answer-field">
            <span className="field-label">Correct call</span>
            {answer ? (
              <span className={`answer-pill ${answer}`}>
                {answer === 'over' ? 'OVER →' : '← UNDER'}
              </span>
            ) : (
              <span className="answer-pill pending">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="clip-tools">
        <button className="icon-btn sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">
          <ArrowUp size={18} />
        </button>
        <button className="icon-btn sm" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move down">
          <ArrowDown size={18} />
        </button>
        <button
          className="icon-btn sm"
          onClick={() => replaceInput.current?.click()}
          disabled={busy}
          aria-label="Replace video"
          title="Replace video"
        >
          <Replace size={18} />
        </button>
        <button className="icon-btn sm danger" onClick={onRemove} disabled={busy} aria-label="Remove video">
          <Trash size={18} />
        </button>
        <input
          ref={replaceInput}
          type="file"
          accept="video/*,.mp4,.mov,.m4v"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onReplace(f);
          }}
        />
      </div>
    </div>
  );
}

function ViewsInput({
  label,
  value,
  placeholder,
  onChange,
  action,
}: {
  label: string;
  value: number | null;
  placeholder: string;
  onChange: (v: number | null) => void;
  action?: ReactNode;
}) {
  const [text, setText] = useState(() => formatEditable(value));
  const lastSent = useRef<number | null>(value);

  // Pick up changes made outside this input (e.g. the dice button).
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value;
      setText(formatEditable(value));
    }
  }, [value]);

  const parsed = parseViews(text);
  const invalid = text.trim() !== '' && parsed == null;

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className={`input-with-action${invalid ? ' invalid' : ''}`}>
        <input
          className="input"
          value={text}
          placeholder={placeholder}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          onChange={(e) => {
            const t = e.target.value;
            setText(t);
            const p = parseViews(t);
            lastSent.current = p;
            onChange(p);
          }}
          onBlur={() => parsed != null && setText(formatEditable(parsed))}
        />
        {action}
      </div>
      <span className={`field-hint${invalid ? ' error' : ''}`}>
        {invalid ? 'Try 250K, 1.2M or 1,200,000' : parsed != null ? `${formatFull(parsed)} views` : ' '}
      </span>
    </label>
  );
}

function PreviewModal({ clip, onClose }: { clip: Clip | null; onClose: () => void }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let alive = true;
    setSrc(undefined);
    if (clip) void resolveVideoSrc(clip).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [clip]);
  return (
    <Modal open={clip != null} onClose={onClose} title={clip?.handle ? `@${clip.handle}` : 'Preview'}>
      <div className="preview-wrap">
        {src ? <video src={src} controls autoPlay playsInline className="preview-video" /> : <span className="spinner" />}
      </div>
      <button className="btn btn-secondary full" onClick={onClose}>
        Close
      </button>
    </Modal>
  );
}
