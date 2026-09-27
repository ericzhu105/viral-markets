import { describe, expect, it } from 'vitest';
import { checkPlayable, correctPick, scoreRound } from './game';
import { makeSampleGame } from './sample';
import type { Clip } from './types';

const clip = (id: string, line: number | null, views: number | null, extra: Partial<Clip> = {}): Clip => ({
  id,
  videoUrl: '/x.mp4',
  handle: '',
  platform: 'tiktok',
  caption: '',
  line,
  views,
  ...extra,
});

describe('correctPick', () => {
  it('over when views reach the line, ties included', () => {
    expect(correctPick({ line: 100, views: 101 })).toBe('over');
    expect(correctPick({ line: 100, views: 100 })).toBe('over');
    expect(correctPick({ line: 100, views: 99 })).toBe('under');
  });
});

describe('scoreRound', () => {
  const clips = [clip('a', 100, 500), clip('b', 100, 50), clip('c', 1000, 1000)];

  it('perfect only when every call is right', () => {
    const perfect = scoreRound(clips, { a: 'over', b: 'under', c: 'over' });
    expect(perfect.correct).toBe(3);
    expect(perfect.perfect).toBe(true);

    const oneMiss = scoreRound(clips, { a: 'over', b: 'over', c: 'over' });
    expect(oneMiss.correct).toBe(2);
    expect(oneMiss.perfect).toBe(false);
    expect(oneMiss.results[1]).toMatchObject({ pick: 'over', answer: 'under', correct: false });
  });

  it('a missing pick counts as wrong', () => {
    expect(scoreRound(clips, { a: 'over', b: 'under' }).perfect).toBe(false);
  });
});

describe('checkPlayable', () => {
  const base = makeSampleGame();

  it('the sample game is playable', () => {
    expect(checkPlayable(base).playable).toBe(true);
  });

  it('flags empty games and incomplete clips', () => {
    expect(checkPlayable({ ...base, clips: [] }).playable).toBe(false);
    const incomplete = { ...base, clips: [clip('a', 100, null), clip('b', null, 5), clip('c', 1, 2)] };
    expect(checkPlayable(incomplete)).toEqual({ playable: false, reason: '2 videos need views filled in' });
    const noVideo = { ...base, clips: [clip('a', 1, 2, { videoUrl: undefined })] };
    expect(checkPlayable(noVideo).playable).toBe(false);
  });

  it('sample answers are a mix of over and under', () => {
    const answers = base.clips.map((c) => correctPick({ line: c.line!, views: c.views! }));
    expect(new Set(answers)).toEqual(new Set(['over', 'under']));
  });
});
