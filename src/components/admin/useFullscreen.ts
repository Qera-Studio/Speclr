'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Real browser fullscreen for the whole app, and whether it is on.
 *
 * **Not an in-app "expand".** The ask was for what Dia does when you
 * double-tap a tab: the browser's own chrome and the URL bar go away, not just
 * the app's padding. That is `requestFullscreen()` on the document element, and
 * the distinguishing symptom is the one that was noticed: on macOS this is a
 * Space, so a three-finger swipe to another app leaves the Space and the
 * browser drops fullscreen. An in-app expand would have survived the swipe. If
 * that behaviour is ever unwanted, this is the wrong primitive, not a bug in
 * it.
 *
 * `document.fullscreenElement` is the only source of truth for the state, read
 * on the `fullscreenchange` event. Tracking it in our own boolean instead would
 * go stale every time fullscreen ends by a route this code did not call:
 * Escape, F11, the swipe above, or the browser's own control.
 *
 * Safari still ships the `webkit` spelling of all four names, so both are
 * tried. Everything is feature-detected rather than assumed, because the API
 * is absent in jsdom and refused outright inside a cross-origin iframe.
 */

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface FullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

function elementNow(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** Whether this browser offers the API at all. False in jsdom. */
export function fullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement as FullscreenElement;
  return typeof (root.requestFullscreen ?? root.webkitRequestFullscreen) === 'function';
}

export function useFullscreen(): {
  active: boolean;
  supported: boolean;
  toggle: () => void;
} {
  const [active, setActive] = useState(false);
  /*
    Read after mount, never during render. The server has no `document`, so
    deriving the initial state from it would render one thing on the server and
    another on the client. Fullscreen is also never on at first paint: it needs
    a user gesture, which has not happened yet.
  */
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(fullscreenSupported());
    setActive(elementNow() !== null);

    const sync = () => setActive(elementNow() !== null);
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const doc = document as FullscreenDocument;

    if (elementNow()) {
      const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
      // `.call`, because both are methods on `document` and a bare reference
      // loses the receiver.
      void Promise.resolve(exit?.call(doc)).catch(() => {});
      return;
    }

    const root = document.documentElement as FullscreenElement;
    const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
    /*
      Swallowed, and deliberately. The request rejects when the browser has not
      seen a user gesture or the document is in an iframe that was not granted
      `allow="fullscreen"`, and neither is something the operator can act on.
      Nothing has changed, `fullscreenchange` does not fire, and the app stays
      as it was.
    */
    void Promise.resolve(request?.call(root)).catch(() => {});
  }, []);

  return { active, supported, toggle };
}
