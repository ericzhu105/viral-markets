import type { Clip, Game, Pick } from './types';

/** OVER when the video reached the line (ties count as reaching it). */
export function correctPick(clip: { line: number; views: number }): Pick {
  return clip.views >= clip.line ? 'over' : 'under';
}

export type ClipIssue = 'video' | 'line' | 'views';

export function clipIssues(clip: Clip): ClipIssue[] {
  const issues: ClipIssue[] = [];
  if (!clip.videoKey && !clip.videoUrl) issues.push('video');
  if (clip.line == null || clip.line <= 0) issues.push('line');
  if (clip.views == null) issues.push('views');
  return issues;
}

export interface PlayableCheck {
  playable: boolean;
  /** Short human reason when not playable. */
  reason?: string;
}

export function checkPlayable(game: Game): PlayableCheck {
  if (game.clips.length === 0) return { playable: false, reason: 'Add at least one video' };
  const broken = game.clips.filter((c) => clipIssues(c).length > 0).length;
  if (broken > 0) {
    return {
      playable: false,
      reason: `${broken} video${broken === 1 ? '' : 's'} need${broken === 1 ? 's' : ''} views filled in`,
    };
  }
  return { playable: true };
}

export interface ClipResult {
  clip: Clip;
  pick: Pick;
  answer: Pick;
  correct: boolean;
}

export interface Score {
  results: ClipResult[];
  correct: number;
  total: number;
  perfect: boolean;
}

export function scoreRound(clips: Clip[], picks: Record<string, Pick>): Score {
  const results: ClipResult[] = clips.map((clip) => {
    const answer = correctPick({ line: clip.line ?? 0, views: clip.views ?? 0 });
    const pick = picks[clip.id];
    return { clip, pick, answer, correct: pick === answer };
  });
  const correct = results.filter((r) => r.correct).length;
  return { results, correct, total: clips.length, perfect: clips.length > 0 && correct === clips.length };
}

/** Roast line for the losing screen, by how close they got. */
export function eggLine(correct: number, total: number): string {
  const missed = total - correct;
  if (missed === 1) return 'SO close. Still egged.';
  if (correct === 0) return `0 for ${total}?! Inverse yourself and you'd be rich.`;
  if (correct / total >= 0.5) return 'Coin-flip energy. The market wins this one.';
  return 'The algorithm is laughing at you.';
}
