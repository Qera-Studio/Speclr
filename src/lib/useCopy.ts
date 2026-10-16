'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Writes `value` to the clipboard and reports `copied` for `revertAfterMs`.
 * Nothing on the page changes when a value reaches the clipboard, so the
 * control that called this is the only thing that can say it worked.
 */
export function useCopy(value: string, revertAfterMs = 1500) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), revertAfterMs);
    } catch {
      // Clipboard unavailable (insecure context / denied): no state change.
    }
  };

  return { copied, copy };
}
