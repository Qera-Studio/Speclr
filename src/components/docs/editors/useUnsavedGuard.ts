'use client';

import { useEffect, useState } from 'react';

/**
 * Stops unsaved work being clicked away.
 *
 * Two exits, two mechanisms. Closing or refreshing the tab is the browser's own
 * prompt — nothing else can interrupt that. Clicking a link inside the app is
 * ours: a capture-phase listener on the document finds the anchor before React
 * or the router sees the event, cancels it, and hands the destination back so
 * the caller can ask what to do. That covers the sidebar and the breadcrumb,
 * which is where this actually happens.
 *
 * `ponytail:` the browser's own Back button is not trapped. Next 16 has no
 * route-change hook, and the usual workaround — pushing a decoy history entry
 * and catching `popstate` — corrupts the back stack in exchange. Leaving the app
 * entirely is still caught by `beforeunload`; Back within it loses edits made
 * since the last save. Revisit if it bites.
 */
export function useUnsavedGuard(dirty: boolean) {
  /** Where the cancelled click was going, or null when nothing is pending. */
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();

    const onClick = (e: MouseEvent) => {
      // Leave modified clicks alone: they open a new tab, so nothing is lost.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank') return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      // Another origin is the browser's problem, and beforeunload has it.
      if (new URL(anchor.href, location.href).origin !== location.origin) return;
      if (anchor.href === location.href) return;

      e.preventDefault();
      e.stopPropagation();
      setPending(anchor.href);
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);

  return {
    /** The href of a click held back, or null. */
    pending,
    /** Forget it and stay put. */
    dismiss: () => setPending(null),
    /** Go anyway. A full load, so the guard cannot fire a second time. */
    leave: () => {
      if (pending) location.href = pending;
    },
  };
}
