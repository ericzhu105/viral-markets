import { registerSW } from 'virtual:pwa-register';

let applyUpdate: ((reload?: boolean) => Promise<void>) | null = null;
let updateWaiting = false;

/** Cache the app for offline use. Updates wait until we're on a calm screen. */
export function initServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateWaiting = true;
    },
  });
}

/** Only call from the home screen — never reload mid-game. */
export function applyPendingUpdate(): void {
  if (updateWaiting && applyUpdate) {
    updateWaiting = false;
    void applyUpdate(true);
  }
}
