import { getVideo } from './db';
import type { Clip } from './types';

const urlCache = new Map<string, string>();

/**
 * Chrome can't play `video/quicktime` even when the .mov holds plain H.264,
 * which is what iPhones export. Relabel so desktop testing works too; Safari plays either.
 */
function playableBlob(blob: Blob): Blob {
  if (blob.type === 'video/quicktime' && typeof document !== 'undefined') {
    const probe = document.createElement('video');
    if (!probe.canPlayType('video/quicktime')) return new Blob([blob], { type: 'video/mp4' });
  }
  return blob;
}

/** Resolve a playable URL for a clip (object URL for on-device videos). */
export async function resolveVideoSrc(clip: Clip): Promise<string | undefined> {
  if (clip.videoKey) {
    const cached = urlCache.get(clip.videoKey);
    if (cached) return cached;
    const blob = await getVideo(clip.videoKey);
    if (blob) {
      const url = URL.createObjectURL(playableBlob(blob));
      urlCache.set(clip.videoKey, url);
      return url;
    }
  }
  return clip.videoUrl;
}

/**
 * Fallback when an object URL straight from IndexedDB refuses to play (seen on some
 * older iPadOS builds): copy the bytes into a fresh in-memory blob and try again.
 */
export async function rebuildVideoSrc(clip: Clip): Promise<string | undefined> {
  if (!clip.videoKey) return clip.videoUrl;
  const blob = await getVideo(clip.videoKey);
  if (!blob) return clip.videoUrl;
  const copy = new Blob([await blob.arrayBuffer()], { type: playableBlob(blob).type || 'video/mp4' });
  const old = urlCache.get(clip.videoKey);
  if (old) URL.revokeObjectURL(old);
  const url = URL.createObjectURL(copy);
  urlCache.set(clip.videoKey, url);
  return url;
}

export function releaseVideoSrc(key: string): void {
  const url = urlCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(key);
  }
}

export interface VideoInfo {
  poster?: string;
  width?: number;
  height?: number;
  duration?: number;
}

/** Grab a JPEG thumbnail (as a data URL) from a video file. Never throws. */
export function captureVideoInfo(blob: Blob): Promise<VideoInfo> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(playableBlob(blob));
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');

    let finished = false;
    const grab = (): string | undefined => {
      try {
        const w = v.videoWidth;
        const h = v.videoHeight;
        if (!w || !h) return undefined;
        const scale = Math.min(1, 640 / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.72);
      } catch {
        return undefined;
      }
    };
    const finish = (poster?: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const info: VideoInfo = {
        poster,
        width: v.videoWidth || undefined,
        height: v.videoHeight || undefined,
        duration: Number.isFinite(v.duration) ? v.duration : undefined,
      };
      v.pause();
      v.removeAttribute('src');
      v.load();
      URL.revokeObjectURL(url);
      resolve(info);
    };
    const timer = window.setTimeout(() => finish(grab()), 7000);

    v.addEventListener(
      'loadedmetadata',
      () => {
        const target = Math.min(1.2, (Number.isFinite(v.duration) ? v.duration : 3) * 0.3);
        try {
          v.currentTime = target;
        } catch {
          finish(grab());
        }
      },
      { once: true },
    );
    v.addEventListener(
      'seeked',
      () => {
        // Give iOS a beat to actually decode the seeked frame before drawing it.
        let done = false;
        const go = () => {
          if (done) return;
          done = true;
          finish(grab());
        };
        const rvfc = (v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number })
          .requestVideoFrameCallback;
        if (rvfc) rvfc.call(v, go);
        window.setTimeout(go, 250);
      },
      { once: true },
    );
    v.addEventListener('error', () => finish(undefined), { once: true });

    v.src = url;
    v.load();
    // iOS won't decode frames until playback has been attempted.
    v.play()
      .then(() => v.pause())
      .catch(() => {});
  });
}

/** Play a video, falling back to muted when the browser blocks sound. */
export async function playVideo(
  v: HTMLVideoElement,
  wantSound: boolean,
): Promise<'sound' | 'muted' | 'blocked'> {
  v.muted = !wantSound;
  try {
    await v.play();
    return wantSound ? 'sound' : 'muted';
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return wantSound ? 'sound' : 'muted';
    if (!v.muted) {
      v.muted = true;
      try {
        await v.play();
        return 'muted';
      } catch {
        return 'blocked';
      }
    }
    return 'blocked';
  }
}
