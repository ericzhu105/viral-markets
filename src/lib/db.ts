import { createStore, del, get, keys, set } from 'idb-keyval';
import { DEFAULT_SETTINGS, type Game, type Settings } from './types';

// Everything lives on this device: game metadata + the raw video files.
const store = createStore('vm-over-under', 'kv');

const GAMES = 'games';
const SETTINGS = 'settings';
const videoId = (key: string) => `video:${key}`;

export async function loadGames(): Promise<Game[] | undefined> {
  return get<Game[]>(GAMES, store);
}

export async function saveGames(games: Game[]): Promise<void> {
  await set(GAMES, games, store);
}

export async function loadSettings(): Promise<Settings> {
  const saved = await get<Partial<Settings>>(SETTINGS, store);
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await set(SETTINGS, settings, store);
}

export async function putVideo(key: string, blob: Blob): Promise<void> {
  await set(videoId(key), blob, store);
}

export async function getVideo(key: string): Promise<Blob | undefined> {
  return get<Blob>(videoId(key), store);
}

/** Keys of videos being written right now (uploads/imports) — never garbage-collect these. */
const inFlight = new Set<string>();

export function protectKey(key: string): () => void {
  inFlight.add(key);
  return () => inFlight.delete(key);
}

/** Delete stored videos that no game references anymore. */
export async function collectGarbage(games: Game[]): Promise<number> {
  const used = new Set<string>();
  for (const g of games) for (const c of g.clips) if (c.videoKey) used.add(c.videoKey);
  let removed = 0;
  for (const k of await keys(store)) {
    if (typeof k !== 'string' || !k.startsWith('video:')) continue;
    const key = k.slice('video:'.length);
    if (used.has(key) || inFlight.has(key)) continue;
    await del(k, store);
    removed++;
  }
  return removed;
}

/** Ask the browser not to evict our data (important on iPad). */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      await navigator.storage.persist?.();
    }
  } catch {
    // Not supported — fine.
  }
}

export async function storageUsage(): Promise<number | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    return est?.usage ?? null;
  } catch {
    return null;
  }
}
