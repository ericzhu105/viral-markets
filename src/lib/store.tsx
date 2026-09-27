import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  collectGarbage,
  loadGames,
  loadSettings,
  protectKey,
  putVideo,
  requestPersistence,
  saveGames,
  saveSettings,
} from './db';
import { makeSampleGame } from './sample';
import { DEFAULT_SETTINGS, type Game, type Settings } from './types';
import { uid } from './uid';

interface StoreValue {
  ready: boolean;
  games: Game[];
  settings: Settings;
  /** Staff PIN entered this session (resets whenever a game starts). */
  staffUnlocked: boolean;
  createGame(): Game;
  addGame(game: Game): void;
  updateGame(id: string, fn: (g: Game) => Game): void;
  deleteGame(id: string): void;
  duplicateGame(id: string): Game | undefined;
  /** Records a finished round; returns the winner number when won. */
  recordPlay(id: string, won: boolean): number;
  resetStats(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  setStaffUnlocked(value: boolean): void;
  /** Delete video files no game uses anymore (after removing/replacing clips). */
  cleanUpVideosSoon(): void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [staffUnlocked, setStaffUnlocked] = useState(false);
  const gamesRef = useRef<Game[]>([]);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);

  const commit = useCallback((fn: (games: Game[]) => Game[]) => {
    setGames((prev) => {
      const next = fn(prev);
      gamesRef.current = next;
      return next;
    });
  }, []);

  const updateGame = useCallback(
    (id: string, fn: (g: Game) => Game) => {
      commit((gs) => gs.map((g) => (g.id === id ? { ...fn(g), updatedAt: Date.now() } : g)));
    },
    [commit],
  );

  // Copy bundled sample clips into IndexedDB so the sample game also works offline.
  const cacheSampleVideos = useCallback(
    async (game: Game) => {
      for (const clip of game.clips) {
        if (clip.videoKey || !clip.videoUrl) continue;
        const key = uid();
        const release = protectKey(key);
        try {
          const res = await fetch(clip.videoUrl);
          if (!res.ok) continue;
          await putVideo(key, await res.blob());
          updateGame(game.id, (g) => ({
            ...g,
            clips: g.clips.map((c) => (c.id === clip.id && !c.videoKey ? { ...c, videoKey: key } : c)),
          }));
        } catch {
          // Offline on first launch: the clip keeps streaming from its URL.
        } finally {
          setTimeout(release, 5000);
        }
      }
    },
    [updateGame],
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [saved, savedSettings] = await Promise.all([
        loadGames().catch(() => undefined),
        loadSettings().catch(() => DEFAULT_SETTINGS),
      ]);
      if (!alive) return;
      const initial = saved ?? [makeSampleGame()];
      gamesRef.current = initial;
      settingsRef.current = savedSettings;
      setGames(initial);
      setSettings(savedSettings);
      setReady(true);
      void requestPersistence();
      if (!saved) void saveGames(initial);
      else void collectGarbage(initial).catch(() => {});
      for (const g of initial) if (g.sample) void cacheSampleVideos(g);
    })();
    return () => {
      alive = false;
    };
  }, [cacheSampleVideos]);

  // Persist (debounced) whenever games change.
  const saveTimer = useRef<number | undefined>(undefined);
  const dirty = useRef(false);
  useEffect(() => {
    if (!ready) return;
    dirty.current = true;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      dirty.current = false;
      void saveGames(gamesRef.current);
    }, 250);
  }, [games, ready]);

  useEffect(() => {
    const flush = () => {
      if (!dirty.current) return;
      dirty.current = false;
      window.clearTimeout(saveTimer.current);
      void saveGames(gamesRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const gcTimer = useRef<number | undefined>(undefined);
  const cleanUpVideosSoon = useCallback(() => {
    window.clearTimeout(gcTimer.current);
    gcTimer.current = window.setTimeout(() => {
      void collectGarbage(gamesRef.current).catch(() => {});
    }, 1500);
  }, []);

  const createGame = useCallback((): Game => {
    const now = Date.now();
    const game: Game = {
      id: uid(),
      name: 'New game',
      prize: '$20',
      clips: [],
      createdAt: now,
      updatedAt: now,
      stats: { plays: 0, wins: 0 },
    };
    commit((gs) => [...gs, game]);
    return game;
  }, [commit]);

  const addGame = useCallback((game: Game) => commit((gs) => [...gs, game]), [commit]);

  const deleteGame = useCallback(
    (id: string) => {
      commit((gs) => gs.filter((g) => g.id !== id));
      cleanUpVideosSoon();
    },
    [commit, cleanUpVideosSoon],
  );

  const duplicateGame = useCallback(
    (id: string): Game | undefined => {
      const src = gamesRef.current.find((g) => g.id === id);
      if (!src) return undefined;
      const now = Date.now();
      // Video files are shared by key; garbage collection only removes unreferenced ones.
      const copy: Game = {
        ...src,
        id: uid(),
        name: `${src.name} (copy)`,
        sample: false,
        createdAt: now,
        updatedAt: now,
        stats: { plays: 0, wins: 0 },
        clips: src.clips.map((c) => ({ ...c, id: uid() })),
      };
      commit((gs) => [...gs, copy]);
      return copy;
    },
    [commit],
  );

  const recordPlay = useCallback(
    (id: string, won: boolean): number => {
      const current = gamesRef.current.find((g) => g.id === id);
      const winNumber = (current?.stats.wins ?? 0) + (won ? 1 : 0);
      commit((gs) =>
        gs.map((g) =>
          g.id === id
            ? { ...g, stats: { plays: g.stats.plays + 1, wins: g.stats.wins + (won ? 1 : 0) } }
            : g,
        ),
      );
      return winNumber;
    },
    [commit],
  );

  const resetStats = useCallback(
    (id: string) => commit((gs) => gs.map((g) => (g.id === id ? { ...g, stats: { plays: 0, wins: 0 } } : g))),
    [commit],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    void saveSettings(next);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      games,
      settings,
      staffUnlocked,
      createGame,
      addGame,
      updateGame,
      deleteGame,
      duplicateGame,
      recordPlay,
      resetStats,
      updateSettings,
      setStaffUnlocked,
      cleanUpVideosSoon,
    }),
    [
      ready,
      games,
      settings,
      staffUnlocked,
      createGame,
      addGame,
      updateGame,
      deleteGame,
      duplicateGame,
      recordPlay,
      resetStats,
      updateSettings,
      cleanUpVideosSoon,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside <StoreProvider>');
  return value;
}
