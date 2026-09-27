export type Platform = 'tiktok' | 'instagram';
export type Pick = 'over' | 'under';

export interface Clip {
  id: string;
  /** IndexedDB key of an uploaded video blob (see lib/db.ts). */
  videoKey?: string;
  /** Static URL, used by the bundled sample clips until they are copied into IndexedDB. */
  videoUrl?: string;
  /** Small JPEG data URL (uploads) or static URL (samples). */
  poster?: string;
  handle: string;
  platform: Platform;
  caption: string;
  /** The over/under line. OVER is correct when views >= line. */
  line: number | null;
  /** The real view count. */
  views: number | null;
}

export interface GameStats {
  plays: number;
  wins: number;
}

export interface Game {
  id: string;
  name: string;
  /** Free text shown to players, e.g. "$20". */
  prize: string;
  clips: Clip[];
  createdAt: number;
  updatedAt: number;
  stats: GameStats;
  sample?: boolean;
}

export interface Settings {
  /** 4-digit staff PIN that locks editing. null = no lock. */
  pin: string | null;
  muted: boolean;
  installHintDismissed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  pin: null,
  muted: false,
  installHintDismissed: false,
};
