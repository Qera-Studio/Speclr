'use client';

import { useEffect, useRef } from 'react';
import type { FieldValues, UseFormReset, UseFormWatch } from 'react-hook-form';

/**
 * Keeps what has been typed but not yet saved, so a refresh does not empty the
 * form.
 *
 * **`sessionStorage`, not `localStorage`, and that is a deliberate downgrade.**
 * These forms hold a third party's PAN, GSTIN, CIN, registered address and the
 * names, emails and phone numbers of their staff. `localStorage` writes all of
 * that to disk in plain text, keeps it after sign-out, keeps it on a shared or
 * borrowed machine, keeps it after the client is deleted (so the DPDP Act 2023
 * erasure that `deleteClient` performs would leave a copy behind), and hands it
 * to any XSS that ever lands on this origin. `sessionStorage` survives a
 * refresh, a back button and a profile switch, which is the whole of what is
 * being asked for, and then dies with the tab.
 *
 * Nothing here is a substitute for saving. A draft is cleared the moment its
 * step saves, because from then on the record is the truth and a surviving
 * draft would restore itself over the top of it.
 *
 * Every access is wrapped: Safari in private mode throws on write, and a
 * convenience that can break a form is not a convenience.
 */

const PREFIX = 'speclr:draft:';

/**
 * Long enough that a fast typist is not writing on every keystroke, short
 * enough that the reflex "type, then hit refresh" still catches it.
 */
const DEBOUNCE_MS = 300;

/** `speclr:draft:<clientId or new>:<section>`. */
export function draftKey(clientId: string | undefined, section: string): string {
  return `${PREFIX}${clientId ?? 'new'}:${section}`;
}

export function clearDraft(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Unavailable, which means there was nothing stored to clear.
  }
}

function readDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Malformed or unavailable. A bad draft must never block a form.
    return null;
  }
}

function writeDraft(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private mode. The in-memory form is unaffected.
  }
}

/**
 * Restore a react-hook-form on mount, and keep its draft current after.
 *
 * Subscribes through `watch(callback)` rather than reading `watch()` in render:
 * these forms are `register`-based and uncontrolled on purpose, and the render
 * form of `watch` would re-render the whole step on every keystroke to save a
 * value nothing is displaying.
 *
 * `reset` and `watch` are stable across renders in react-hook-form, so this
 * runs once per key.
 */
export function useFormDraft<T extends FieldValues>(
  key: string,
  watch: UseFormWatch<T>,
  reset: UseFormReset<T>,
): void {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const saved = readDraft<T>(key);
    // `keepDefaultValues` so a later `reset()` still returns to what the record
    // said, not to what happened to be half-typed when the tab was refreshed.
    if (saved) reset(saved, { keepDefaultValues: true });

    const subscription = watch((values) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => writeDraft(key, values), DEBOUNCE_MS);
    });

    return () => {
      clearTimeout(timer.current);
      subscription.unsubscribe();
    };
  }, [key, reset, watch]);
}

/**
 * The same thing for a step that holds its own state rather than a form.
 *
 * `restore` is called at most once, on mount, and only if there is a draft.
 * The first render never writes: it would store the initial value over a draft
 * that the restore above is in the middle of applying.
 */
export function useDraft<T>(key: string, value: T, restore: (saved: T) => void): void {
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const first = useRef(true);

  useEffect(() => {
    const saved = readDraft<T>(key);
    if (saved !== null) restoreRef.current(saved);
  }, [key]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => writeDraft(key, value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [key, value]);
}
