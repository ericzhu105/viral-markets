import { useEffect, useRef, useState } from 'react';
import { exportGame, importGame, shareOrDownload } from '../lib/bundle';
import { storageUsage } from '../lib/db';
import { checkPlayable } from '../lib/game';
import { applyPendingUpdate } from '../lib/pwa';
import { go } from '../lib/router';
import { useStore } from '../lib/store';
import type { Game } from '../lib/types';
import { Copy, Download, Edit, Film, Lock, More, Play, Plus, Replace, Share, Trash, Trophy, Unlock, Users } from './Icons';
import { Modal } from './Modal';
import { useStaffGate } from './StaffLock';
import { toast } from './Toast';
import { Wordmark } from './VmLogo';

export function Home() {
  const { games, settings, staffUnlocked, createGame, addGame, updateSettings } = useStore();
  const { guard, openLockSettings } = useStaffGate();
  const importInput = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    applyPendingUpdate();
    void storageUsage().then(setUsage);
  }, [games.length]);

  const sorted = [...games].sort((a, b) => b.createdAt - a.createdAt);
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const touch = navigator.maxTouchPoints > 1;
  const showInstallHint = !standalone && touch && !settings.installHintDismissed;

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const game = await importGame(file);
      addGame(game);
      toast(`Imported “${game.name}”`);
    } catch (err) {
      toast((err as Error).message || 'Import failed');
    } finally {
      setImporting(false);
      if (importInput.current) importInput.current.value = '';
    }
  };

  return (
    <div className="home">
      <header className="home-top">
        <div className="brand">
          <Wordmark height={30} />
          <span className="brand-tag">Over / Under</span>
        </div>
        <div className="home-top-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => guard(() => importInput.current?.click())}
            disabled={importing}
          >
            <Download size={18} /> {importing ? 'Importing…' : 'Import'}
          </button>
          <button
            className={`icon-btn${settings.pin ? (staffUnlocked ? ' unlocked' : ' locked') : ''}`}
            onClick={openLockSettings}
            aria-label="Staff lock"
            title="Staff lock"
          >
            {settings.pin && !staffUnlocked ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
          <input
            ref={importInput}
            type="file"
            hidden
            onChange={(e) => void onImport(e.target.files?.[0])}
          />
        </div>
      </header>

      <main className="home-main">
        <div className="home-hero">
          <div>
            <h1>Your games</h1>
            <p>Pick a game, tap Play, hand over the iPad. A perfect score wins the prize — anything less gets egged 🥚</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() =>
              guard(() => {
                const g = createGame();
                go(`/edit/${g.id}`);
              })
            }
          >
            <Plus size={20} /> New game
          </button>
        </div>

        {showInstallHint && (
          <div className="install-hint">
            <Share size={22} />
            <div>
              <strong>Before the event: Share → Add to Home Screen.</strong>
              <p>
                It opens full-screen and keeps working with no wifi. Create your games <em>inside</em> the Home
                Screen app — iPad keeps Safari’s storage separate from it (or use Export/Import to move games).
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => updateSettings({ installHintDismissed: true })}>
              Got it
            </button>
          </div>
        )}

        <div className="game-grid">
          {sorted.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
          <button
            className="new-game-card"
            onClick={() =>
              guard(() => {
                const g = createGame();
                go(`/edit/${g.id}`);
              })
            }
          >
            <span className="new-game-plus">
              <Plus size={30} />
            </span>
            <strong>Create a new game</strong>
            <span>Upload videos, set the view lines, done.</span>
          </button>
        </div>

        <footer className="home-footer">
          <span>Everything is saved on this device{usage != null ? ` · ${formatBytes(usage)} used` : ''}.</span>
          <a href="https://viralmarkets.com" target="_blank" rel="noreferrer">
            viralmarkets.com
          </a>
        </footer>
      </main>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const { duplicateGame, deleteGame, resetStats } = useStore();
  const { guard } = useStaffGate();
  const [menu, setMenu] = useState(false);
  const [exportFile, setExportFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const check = checkPlayable(game);
  const posters = game.clips.map((c) => c.poster).filter(Boolean).slice(0, 3) as string[];

  const startExport = async () => {
    setMenu(false);
    setExporting(true);
    try {
      setExportFile(await exportGame(game));
    } catch {
      toast('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <article className="game-card">
      <button className="game-cover" onClick={() => check.playable && go(`/play/${game.id}`)} tabIndex={-1}>
        <div className="poster-fan">
          {posters.length === 0 ? (
            <div className="poster poster-empty">
              <Film size={30} />
            </div>
          ) : (
            posters.map((p, i) => (
              <img
                key={i}
                className="poster"
                src={p}
                alt=""
                draggable={false}
                style={{
                  transform: `translateX(${(i - (posters.length - 1) / 2) * 62}px) rotate(${(i - (posters.length - 1) / 2) * 7}deg)`,
                  zIndex: i === Math.floor(posters.length / 2) ? 3 : 1,
                }}
              />
            ))
          )}
        </div>
        {game.sample && <span className="tag tag-sample">Sample</span>}
      </button>
      <div className="game-body">
        <h3 className="game-name">{game.name || 'Untitled game'}</h3>
        <div className="game-meta">
          <span>
            <Film size={15} /> {game.clips.length} video{game.clips.length === 1 ? '' : 's'}
          </span>
          <span className="prize-chip">Prize {game.prize || '—'}</span>
        </div>
        <div className="game-stats">
          <span>
            <Users size={15} /> {game.stats.plays} played
          </span>
          <span>
            <Trophy size={15} /> {game.stats.wins} won
          </span>
        </div>
        {!check.playable && <p className="game-warn">{check.reason}</p>}
        <div className="game-actions">
          <button className="btn btn-primary" disabled={!check.playable} onClick={() => go(`/play/${game.id}`)}>
            <Play size={18} /> Play
          </button>
          <button className="btn btn-secondary" onClick={() => guard(() => go(`/edit/${game.id}`))}>
            <Edit size={18} /> Edit
          </button>
          <button className="icon-btn" aria-label="More options" onClick={() => guard(() => setMenu(true))}>
            <More size={20} />
          </button>
        </div>
      </div>

      <Modal open={menu} onClose={() => setMenu(false)} title={game.name}>
        <div className="sheet-list">
          <button
            onClick={() => {
              setMenu(false);
              const copy = duplicateGame(game.id);
              if (copy) toast(`Duplicated as “${copy.name}”`);
            }}
          >
            <Copy size={20} /> Duplicate
          </button>
          <button onClick={() => void startExport()}>
            <Share size={20} /> Export game file (AirDrop / Files)
          </button>
          <button
            onClick={() => {
              setMenu(false);
              resetStats(game.id);
              toast('Stats reset');
            }}
          >
            <Replace size={20} /> Reset play & win counts
          </button>
          <button
            className="danger-text"
            onClick={() => {
              if (window.confirm(`Delete “${game.name}”? Its videos are removed from this device.`)) {
                setMenu(false);
                deleteGame(game.id);
              }
            }}
          >
            <Trash size={20} /> Delete game
          </button>
        </div>
      </Modal>

      <Modal
        open={exporting || exportFile != null}
        onClose={() => {
          setExportFile(null);
        }}
        title="Export game"
      >
        {exporting || !exportFile ? (
          <p className="muted">Packing videos…</p>
        ) : (
          <div className="export-ready">
            <p className="muted">
              <strong>{exportFile.name}</strong> · {formatBytes(exportFile.size)}. AirDrop it to another iPad (or save
              it to Files), then open this app there and tap <strong>Import</strong>.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                const f = exportFile;
                void shareOrDownload(f).then((r) => {
                  if (r !== 'cancelled') setExportFile(null);
                });
              }}
            >
              <Share size={18} /> Share / Save file
            </button>
          </div>
        )}
      </Modal>
    </article>
  );
}

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
