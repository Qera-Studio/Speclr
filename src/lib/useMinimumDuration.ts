'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Holds a flag true for at least `ms` after it goes true.
 *
 * A pincode lookup that returns in 80ms flickers a spinner for four frames,
 * which reads as nothing having happened — and if the field then fills itself
 * in, it looks like magic rather than a lookup. Holding the busy state for half
 * a second makes the cause visible.
 *
 * Deliberately one-way: it never *delays* the flag going true, only its going
 * false again. The real work is never held up.
 */
export function useMinimumDuration(active: boolean, ms = 500): boolean {
  const [held, setHeld] = useState(active);
  const since = useRef(0);

  useEffect(() => {
    if (active) {
      since.current = Date.now();
      setHeld(true);
      return;
    }

    const elapsed = Date.now() - since.current;
    if (elapsed >= ms) {
      setHeld(false);
      return;
    }

    const timer = setTimeout(() => setHeld(false), ms - elapsed);
    return () => clearTimeout(timer);
  }, [active, ms]);

  return held;
}

/**
 * A busy flag that can be pulsed on for `ms`.
 *
 * For the fills that are *not* a network call — picking an employee seeds the
 * letter body and the stipend line item, picking an invoice fills a receipt.
 * Those are instant, and instant is the problem: several fields change at once
 * with nothing to say why. The pulse is feedback, not waiting.
 */
export function usePulse(ms = 500): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const pulse = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOn(true);
    timer.current = setTimeout(() => setOn(false), ms);
  }, [ms]);

  return [on, pulse];
}
