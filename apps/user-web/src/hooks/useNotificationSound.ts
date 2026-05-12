import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Centralised "ding + buzz + remember the user's preference" hook.
 *
 * Used by `usePushNotifications` whenever a foreground FCM message or a
 * Socket.io `notification` event arrives. Page-specific code can also
 * call `play()` for in-page events (status change, queue advance, …).
 *
 * Behaviour:
 *   - Pre-loads `/sounds/notification.mp3` once and reuses the element so
 *     iOS / Safari don't refuse playback because of a "user gesture
 *     required" race on cold start.
 *   - Vibrates on devices that support it (Android, most browsers — iOS
 *     Safari ignores this, which is the platform's choice).
 *   - Persists a `notification-sound` boolean in `localStorage` so the
 *     user can mute the UI without hunting through OS settings.
 */
const STORAGE_KEY = 'notification-sound';
const SOUND_SRC = '/sounds/notification.mp3';

function readPref(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Hydrate on mount only — the SSR pass uses the safe default (sound on).
  useEffect(() => {
    setIsMuted(!readPref());

    if (typeof window === 'undefined') return;
    if (!audioRef.current) {
      const el = new Audio(SOUND_SRC);
      el.preload = 'auto';
      el.volume = 0.7;
      audioRef.current = el;
    }
  }, []);

  const play = useCallback(() => {
    const enabled = readPref();
    if (!enabled) return;

    // Sound — best-effort. Browsers may reject if no user gesture has
    // happened yet on this tab; that's fine, we just skip silently.
    try {
      const el = audioRef.current;
      if (el) {
        el.currentTime = 0;
        const result = el.play();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {
            /* autoplay blocked — ignore */
          });
        }
      }
    } catch {
      /* ignore */
    }

    // Vibration — soft double pulse, matches the tone length.
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        (navigator as Navigator).vibrate?.([120, 60, 120]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '0' : '1');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { play, isMuted, toggleMute };
}
