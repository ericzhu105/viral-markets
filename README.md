# Viral Markets — Over/Under

An iPad-first, offline-capable mini version of [Viral Markets](https://viralmarkets.com) for in-person events. Staff load 5 videos with a view line and the real view count. Players swipe each one over (right) or under (left). A perfect score wins the prize; anything less gets egged 🥚.

**Live:** https://vm-over-under.vercel.app

See [DECISIONS.md](DECISIONS.md) for the product/engineering Q&A and the event-day checklist.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # typecheck + production build with service worker
```

Requires Node 20+.

## Deploy

```bash
vercel deploy --prod --scope eric-zhus-projects-ed1d396e
```

## Where things live

- `src/components/Play.tsx`: the game (intro screen, swipe deck, Over/Under buttons)
- `src/components/Results.tsx`, `EggSplat.tsx`, `WinBurst.tsx`: the reveal, the egg, the money rain
- `src/components/Home.tsx`, `Editor.tsx`: the game library and the editor
- `src/lib/`: storage (IndexedDB), scoring, view parsing, export/import, sound effects
- `public/brand/`: Viral Markets logo, wordmark and QR code; `public/sample/`: placeholder clips for the sample game
