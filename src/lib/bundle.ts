// Export/import a game (metadata + video files) as one ".vmgame" file so it can be
// AirDropped to another iPad or kept as a backup.
//
// Layout: "VMGAME1\n" | uint32 LE header length | header JSON | video bytes back to back.
// Blobs are sliced, never copied into one big buffer, so 100MB+ games stay cheap.

import { getVideo, protectKey, putVideo } from './db';
import type { Game } from './types';
import { uid } from './uid';

const MAGIC = 'VMGAME1\n';

interface Header {
  version: 1;
  game: Game;
  blobs: { key: string; type: string; size: number }[];
}

export async function exportGame(game: Game): Promise<File> {
  const blobs: Header['blobs'] = [];
  const parts: Blob[] = [];
  const seen = new Set<string>();
  for (const clip of game.clips) {
    if (!clip.videoKey || seen.has(clip.videoKey)) continue;
    const blob = await getVideo(clip.videoKey);
    if (!blob) continue;
    seen.add(clip.videoKey);
    blobs.push({ key: clip.videoKey, type: blob.type, size: blob.size });
    parts.push(blob);
  }
  const header: Header = { version: 1, game, blobs };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, headerBytes.length, true);
  const name = `${slugify(game.name) || 'game'}.vmgame`;
  return new File([MAGIC, len, headerBytes, ...parts], name, { type: 'application/octet-stream' });
}

export async function importGame(file: Blob): Promise<Game> {
  const prefix = new Uint8Array(await file.slice(0, MAGIC.length + 4).arrayBuffer());
  const magic = new TextDecoder().decode(prefix.slice(0, MAGIC.length));
  if (magic !== MAGIC) throw new Error("That file isn't a Viral Markets game export (.vmgame).");
  const headerLen = new DataView(prefix.buffer, prefix.byteOffset + MAGIC.length, 4).getUint32(0, true);
  let offset = MAGIC.length + 4;
  const header = JSON.parse(
    new TextDecoder().decode(await file.slice(offset, offset + headerLen).arrayBuffer()),
  ) as Header;
  offset += headerLen;
  if (header.version !== 1 || !header.game || !Array.isArray(header.game.clips)) {
    throw new Error('This game file is from an unsupported version.');
  }

  const keyMap = new Map<string, string>();
  const releases: (() => void)[] = [];
  try {
    for (const b of header.blobs) {
      const newKey = uid();
      releases.push(protectKey(newKey));
      await putVideo(newKey, file.slice(offset, offset + b.size, b.type));
      offset += b.size;
      keyMap.set(b.key, newKey);
    }
  } catch (err) {
    releases.forEach((r) => r());
    throw err;
  }

  const now = Date.now();
  const game: Game = {
    ...header.game,
    id: uid(),
    createdAt: now,
    updatedAt: now,
    stats: { plays: 0, wins: 0 },
    clips: header.game.clips.map((c) => ({
      ...c,
      id: uid(),
      videoKey: c.videoKey ? keyMap.get(c.videoKey) : undefined,
    })),
  };
  // Keys stay protected a moment longer so the caller can save the game first.
  setTimeout(() => releases.forEach((r) => r()), 10_000);
  return game;
}

/** Share sheet (AirDrop / Save to Files) when available, plain download otherwise. Call from a tap. */
export async function shareOrDownload(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
