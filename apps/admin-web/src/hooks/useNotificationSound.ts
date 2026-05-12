import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Owner / staff-side notification chime. Identical contract to the
 * user-web hook of the same name — duplicated rather than extracted into
 * a shared package because the two apps don't share a build pipeline.
 *
 * See `apps/user-web/src/hooks/useNotificationSound.ts` for design notes.
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

  useEffect(() => {
    setIsMuted(!readPref());

    if (typeof window === 'undefined') return;
    if (!audioRef.current) {
      const el = new Audio(SOUND_SRC);
      el.preload = 'auto';
      el.volume = 0.8; // staff are usually busy — slightly louder than user-side
      audioRef.current = el;
    }
  }, []);

  const play = useCallback(() => {
    if (!readPref()) return;
    try {
      const el = audioRef.current;
      if (el) {
        el.currentTime = 0;
        const result = el.play();
        if (result && typeof result.catch === 'function') {
          result.catch(() => {});
        }
      }
    } catch {
      /* ignore */
    }
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        (navigator as Navigator).vibrate?.([180, 80, 180]);
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
      } catch {}
      return next;
    });
  }, []);

  return { play, isMuted, toggleMute };
}
