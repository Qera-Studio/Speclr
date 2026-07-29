'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorPanel } from './EditorPanel';

/**
 * Shared open/edit state for the record managers (clients, employees, services).
 *
 * These used to open a screen-darkening modal that blocked the table behind it.
 * They now fill the app's editor rail, which is non-blocking — the table stays
 * visible and clickable while a form is open, so the user can click straight
 * from one record to another. That convenience is also the hazard: switching
 * mid-edit would silently discard whatever was typed. `guardedSelect` routes
 * every switch through a confirmation when the open form is dirty.
 *
 * Callers must keep `key={editing?.id ?? 'new'}` on the form: react-hook-form
 * reads `defaultValues` only on mount, so the remount is what resets fields
 * between records. Without it, editing record A then B shows A's values in B.
 */
export function useRecordPanel<T extends { id: string }>() {
  const router = useRouter();
  const panel = useEditorPanel();
  const [editing, setEditing] = useState<T | null>(null);
  // A held-back action, awaiting confirmation. `switch` carries the record to
  // open next (null = a new one); `close` collapses the rail entirely. Modelled
  // explicitly so "switch to new record" and "close the panel" stay distinct —
  // both would otherwise look like a null target.
  const [pendingDiscard, setPendingDiscard] = useState<
    { kind: 'switch'; next: T | null } | { kind: 'close' } | null
  >(null);
  // Set by the mounted form; read at switch/close time.
  const isDirty = useRef(false);

  const setDirty = useCallback((dirty: boolean) => {
    isDirty.current = dirty;
  }, []);

  /**
   * Marks the panel dirty on the first edit inside it. Spread onto the wrapper
   * around the form: `<div {...dirtyProps}>`.
   *
   * Deliberately DOM-level rather than reading `formState.isDirty`. The three
   * record forms don't expose their form state, and threading it out of each
   * would mean touching all three (one of which has no resolver at all) purely
   * to service the rail. An `input` event anywhere in the subtree is a reliable
   * enough signal for "the user typed something", and keeps the forms untouched.
   */
  const dirtyProps = {
    onInput: () => {
      isDirty.current = true;
    },
  };

  /**
   * Whether *this manager* has been asked to show a form.
   *
   * Deliberately not derived from `panel.open`: the rail's open state is shared
   * across the whole app, so reading it directly would make the form appear the
   * moment anything expanded the rail — landing on Clients would pop an empty
   * "Add client" form nobody asked for. The rail can be open for someone else's
   * content; only an explicit `guardedSelect` opens ours.
   */
  const [requested, setRequested] = useState(false);
  const railOpen = panel?.open ?? false;
  // Collapsing the rail from its own button also dismisses our form.
  const open = requested && (railOpen || !panel);
  const setOpen = panel?.setOpen;
  const setDirtyGuard = panel?.setDirtyGuard;

  useEffect(() => {
    if (!railOpen) setRequested(false);
  }, [railOpen]);

  // Let the rail's own collapse button run through the same confirmation.
  useEffect(() => {
    if (!setDirtyGuard) return;
    setDirtyGuard(() => {
      if (!isDirty.current) return true;
      setPendingDiscard({ kind: 'close' });
      return false;
    });
    return () => setDirtyGuard(null);
  }, [setDirtyGuard]);

  /** Open the panel for `record` (null = a new one), confirming if dirty. */
  const guardedSelect = useCallback(
    (record: T | null) => {
      if (isDirty.current && open) {
        setPendingDiscard({ kind: 'switch', next: record });
        return;
      }
      setEditing(record);
      setRequested(true);
      setOpen?.(true);
    },
    [open, setOpen],
  );

  /** User confirmed the discard — apply the action that was held back. */
  const confirmDiscard = useCallback(() => {
    const action = pendingDiscard;
    isDirty.current = false;
    setPendingDiscard(null);
    if (!action) return;
    if (action.kind === 'close') {
      setRequested(false);
      setOpen?.(false);
      setEditing(null);
      return;
    }
    setEditing(action.next);
    setRequested(true);
    setOpen?.(true);
  }, [pendingDiscard, setOpen]);

  const cancelDiscard = useCallback(() => setPendingDiscard(null), []);

  const onDone = useCallback(() => {
    isDirty.current = false;
    setRequested(false);
    setOpen?.(false);
    setEditing(null);
    router.refresh();
  }, [router, setOpen]);

  return {
    editing,
    open,
    guardedSelect,
    onDone,
    setDirty,
    dirtyProps,
    pendingDiscard: pendingDiscard !== null,
    confirmDiscard,
    cancelDiscard,
  };
}
