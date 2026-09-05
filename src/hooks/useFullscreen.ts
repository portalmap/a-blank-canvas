import { useCallback, useEffect, useRef, useState } from 'react';

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface FullscreenDocument {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

export function useFullscreen<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const sync = useCallback(() => {
    const doc = document as unknown as FullscreenDocument;
    const current =
      document.fullscreenElement ??
      doc.webkitFullscreenElement ??
      doc.msFullscreenElement ??
      null;
    setIsFullscreen(current === ref.current);
  }, []);

  const enter = useCallback(async () => {
    const el = ref.current as unknown as FullscreenElement | null;
    if (!el) return;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
    } catch {
      // ignore blocked fullscreen attempts
    }
  }, []);

  const exit = useCallback(async () => {
    const doc = document as unknown as FullscreenDocument;
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) {
      void exit();
    } else {
      void enter();
    }
  }, [isFullscreen, enter, exit]);

  useEffect(() => {
    const handler = () => sync();
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    document.addEventListener('msfullscreenchange', handler);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
      document.removeEventListener('msfullscreenchange', handler);
    };
  }, [sync]);

  return { ref, isFullscreen, enter, exit, toggle };
}
