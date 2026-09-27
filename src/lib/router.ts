import { useSyncExternalStore } from 'react';

// Hash routes so a refresh (or a home-screen relaunch) lands on the same screen
// without any server rewrites: #/  #/edit/:id  #/play/:id
export type Route = { name: 'home' } | { name: 'edit'; id: string } | { name: 'play'; id: string };

export function parseRoute(hash: string): Route {
  const [page, id] = hash.replace(/^#\/?/, '').split('/');
  if (page === 'edit' && id) return { name: 'edit', id: decodeURIComponent(id) };
  if (page === 'play' && id) return { name: 'play', id: decodeURIComponent(id) };
  return { name: 'home' };
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseRoute(hash);
}

export function go(path: '/' | `/edit/${string}` | `/play/${string}`): void {
  const next = `#${path}`;
  if (window.location.hash !== next) window.location.hash = next;
}
