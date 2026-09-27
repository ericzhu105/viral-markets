import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { exportGame, importGame } from './bundle';
import { getVideo, putVideo } from './db';
import type { Game } from './types';

describe('game export/import', () => {
  it('round-trips metadata and video bytes under fresh ids', async () => {
    await putVideo('k1', new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'video/mp4' }));
    await putVideo('k2', new Blob([new Uint8Array([9, 8, 7])], { type: 'video/quicktime' }));
    const game: Game = {
      id: 'g1',
      name: 'Demo Day!',
      prize: '$50',
      createdAt: 1,
      updatedAt: 1,
      stats: { plays: 12, wins: 3 },
      clips: [
        { id: 'c1', videoKey: 'k1', handle: 'a', platform: 'tiktok', caption: 'one', line: 100, views: 200 },
        { id: 'c2', videoKey: 'k2', handle: 'b', platform: 'instagram', caption: '', line: 50, views: 10 },
        { id: 'c3', videoKey: 'k1', handle: 'c', platform: 'tiktok', caption: 'dupe key', line: 1, views: 1 },
      ],
    };

    const file = await exportGame(game);
    expect(file.name).toBe('demo-day.vmgame');

    const imported = await importGame(file);
    expect(imported.id).not.toBe('g1');
    expect(imported.name).toBe('Demo Day!');
    expect(imported.stats).toEqual({ plays: 0, wins: 0 });
    expect(imported.clips.map((c) => [c.handle, c.line, c.views])).toEqual([
      ['a', 100, 200],
      ['b', 50, 10],
      ['c', 1, 1],
    ]);
    // Shared keys stay shared; every key is new.
    expect(imported.clips[0].videoKey).toBe(imported.clips[2].videoKey);
    expect(imported.clips[0].videoKey).not.toBe('k1');

    const v1 = await getVideo(imported.clips[0].videoKey!);
    const v2 = await getVideo(imported.clips[1].videoKey!);
    expect(new Uint8Array(await v1!.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(new Uint8Array(await v2!.arrayBuffer())).toEqual(new Uint8Array([9, 8, 7]));
    expect(v2!.type).toBe('video/quicktime');
  });

  it('rejects files that are not game exports', async () => {
    await expect(importGame(new Blob(['hello world, not a game']))).rejects.toThrow(/isn't a Viral Markets game/);
  });
});
