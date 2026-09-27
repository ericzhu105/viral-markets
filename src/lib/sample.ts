import type { Game } from './types';

export const SAMPLE_GAME_ID = 'sample-game';

/** Placeholder game so the app is playable out of the box. Swap in real TikToks/Reels via Edit. */
export function makeSampleGame(): Game {
  const now = Date.now();
  return {
    id: SAMPLE_GAME_ID,
    name: 'Sample game',
    prize: '$20',
    sample: true,
    createdAt: now,
    updatedAt: now,
    stats: { plays: 0, wins: 0 },
    clips: [
      {
        id: 'sample-1',
        videoUrl: '/sample/clip1.mp4',
        poster: '/sample/clip1.jpg',
        handle: 'fractal.frank',
        platform: 'tiktok',
        caption: 'POV: you fall into a fractal for 7 seconds 🌀',
        line: 500_000,
        views: 1_840_000,
      },
      {
        id: 'sample-2',
        videoUrl: '/sample/clip2.mp4',
        poster: '/sample/clip2.jpg',
        handle: 'pixel.petri',
        platform: 'instagram',
        caption: 'these pixels built a whole civilization 🧫',
        line: 250_000,
        views: 96_400,
      },
      {
        id: 'sample-3',
        videoUrl: '/sample/clip3.mp4',
        poster: '/sample/clip3.jpg',
        handle: 'satisfying.sam',
        platform: 'tiktok',
        caption: 'the most satisfying color loop on the internet 🌈',
        line: 1_000_000,
        views: 3_200_000,
      },
      {
        id: 'sample-4',
        videoUrl: '/sample/clip4.mp4',
        poster: '/sample/clip4.jpg',
        handle: 'triangle.tess',
        platform: 'tiktok',
        caption: 'infinite triangles. that is the video.',
        line: 150_000,
        views: 41_700,
      },
      {
        id: 'sample-5',
        videoUrl: '/sample/clip5.mp4',
        poster: '/sample/clip5.jpg',
        handle: 'rule110',
        platform: 'instagram',
        caption: 'a computer made entirely of pixels 🧬',
        line: 75_000,
        views: 212_000,
      },
    ],
  };
}
