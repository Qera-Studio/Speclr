'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * A quiet bar across the top of the shell while the browser has no network.
 *
 * This is load-bearing rather than polite, and the reason is where unsaved work
 * lives. Onboarding keeps what has been typed but not saved in `sessionStorage`
 * (`CONTEXT.md` §5d), which dies with the tab; the document editors hold the
 * last second of typing in memory behind the autosave debounce. Both of those
 * are fine right up until a write starts failing silently, at which point the
 * operator keeps typing into a form that is no longer recording anything and
 * finds out when they close the tab.
 *
 * `navigator.onLine` is the cheap half of the answer and it is honest about its
 * limits: false is reliable (the OS says there is no interface), true only
 * means there is *a* network, not that Neon is reachable. So this bar claims
 * exactly what it knows, and the thing that catches a reachable-but-broken
 * server is the per-write error the editors already surface.
 *
 * Not a toast. A toast is an event; this is a condition, and it has to stay on
 * screen for as long as it is true.
 */
export function OfflineBar() {
  // Starts online in every case, including the server render: assuming offline
  // would flash the bar on first paint for everybody.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-center gap-2 bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
    >
      <WifiOff className="size-3.5" aria-hidden="true" />
      No connection. Changes are not being saved.
    </div>
  );
}
