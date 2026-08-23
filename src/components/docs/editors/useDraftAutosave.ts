'use client';

import { useEffect, useRef, useState } from 'react';
import { createDraft, updateDraft } from '@/server/actions/documents';
import { useProfile } from '@/lib/useProfile';

/**
 * How long the editor waits after the last change before writing.
 *
 * Long enough that a sentence typed into a field is one write rather than
 * forty; short enough that closing the tab straight after an edit is still
 * covered by the unsaved-changes guard.
 */
export const AUTOSAVE_MS = 1000;

export type SaveState = 'idle' | 'saving' | 'saved';

export interface DraftAutosave {
  /** The draft's id once there is one — from the route, or from the first save. */
  docId: string | null;
  saveState: SaveState;
  /** When the last successful write landed, in epoch ms. Null until one has. */
  savedAt: number | null;
  /** The last refusal from the server, or null. */
  serverError: string | null;
  setServerError: (error: string | null) => void;
  /** True when there are changes not yet written. Drives the unsaved guard. */
  dirty: boolean;
  /**
   * Run a job behind every write already queued, and write once more first.
   * Finalize and delete both go through this — see `freeze`.
   */
  flush: () => Promise<boolean>;
  /**
   * Stop autosaving.
   *
   * Call it *before* finalizing or deleting. The document stops being a draft
   * at that moment, but this component stays mounted through the navigation
   * that follows, and a timer firing in the gap would send `updateDraft` at a
   * finalized document. The server refuses it (`updateDraft` checks status) and
   * the store refuses it again — so nothing can actually be overwritten. What
   * this prevents is the editor surfacing "Finalized documents cannot be
   * edited" as if the user had done something wrong.
   */
  freeze: () => void;
  /**
   * Resume after a refused finalize.
   *
   * Not optional politeness: finalize fails routinely and recoverably — a GST
   * document with no place of supply is the common one — and the user's next
   * act is to fix the field right here. An editor frozen by the attempt would
   * take that correction and never write it down.
   */
  thaw: () => void;
}

/**
 * A draft that saves itself.
 *
 * A Save button is a trap: the one time it is forgotten, the sitting's work is
 * gone. So a change schedules a write a second after the typing stops, rather
 * than one per keystroke, and there is no button to forget.
 *
 * Lifted from `ContractEditor`, which had this first and alone. The three other
 * editors had no autosave, no dirty state and no unsaved guard at all.
 *
 * Two things hold a write back. **Nothing saves before a recipient is chosen** —
 * `createDraft` refuses an empty client id, and for HR documents that slot
 * carries the employee id. And it must not fire on arrival: `lastSaved` is
 * seeded from the first render, so opening an existing document is not a change
 * to it.
 *
 * @param payload  The document body, rebuilt by the caller every render. It is
 *                 compared by value, so it may be a fresh object each time.
 */
export function useDraftAutosave({
  typeCode,
  initialDocId,
  recipientId,
  payload,
}: {
  typeCode: string;
  initialDocId?: string | null;
  /** Client id, or employee id for an HR document. Empty until one is picked. */
  recipientId: string;
  payload: unknown;
}): DraftAutosave {
  // Only used to keep the URL right when a first save mints an id — the editor
  // is always already on one profile's route.
  const profile = useProfile();
  const [docId, setDocId] = useState<string | null>(initialDocId ?? null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  /**
   * Everything a write depends on, as one comparable value.
   *
   * This replaces a hand-maintained `dirty` flag — which meant a `setDirty(true)`
   * beside every mutator, and one forgotten call is silently lost work. The
   * recipient is in the key because it is an argument to the write, not part of
   * the payload.
   */
  const key = JSON.stringify([recipientId, payload]);
  /** What is on the server. Seeded from the first render: arrival is not an edit. */
  const lastSaved = useRef(key);

  /**
   * The id, mirrored in a ref because writes are queued: a job sitting in the
   * queue was closed over before the create that precedes it returned, and
   * reading `docId` from that closure would create a second draft instead of
   * updating the first.
   */
  const docIdRef = useRef(initialDocId ?? null);
  const frozen = useRef(false);

  /**
   * Every write to this draft, in order.
   *
   * Autosave fires on a timer while the user keeps typing, so two writes can
   * easily be in flight at once — and two `updateDraft` calls landing out of
   * order would persist the older payload over the newer. Chaining them costs
   * one ref and removes the whole class of race; a rejected job never stalls
   * the queue because the chain recovers on both settlements.
   */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = <T,>(job: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(job, job);
    queue.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  /**
   * Writes the current state, creating the draft if this is the first write.
   * Always call through `enqueue` — never twice at once.
   */
  const save = async (): Promise<boolean> => {
    if (!recipientId) return false;
    const sending = key;
    const id = docIdRef.current;
    const result = id
      ? await updateDraft(id, recipientId, payload)
      : await createDraft(typeCode, recipientId, payload);

    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      return false;
    }
    if (!id && result.id) {
      // `history.replaceState`, not the router: a navigation here would remount
      // the editor and take the half-typed document with it.
      docIdRef.current = result.id;
      setDocId(result.id);
      window.history.replaceState(null, '', `/${profile}/docs/${result.id}`);
    }
    lastSaved.current = sending;
    setSavedAt(Date.now());
    return true;
  };

  const dirty = key !== lastSaved.current;

  useEffect(() => {
    if (frozen.current || !recipientId || key === lastSaved.current) return;
    const timer = setTimeout(() => {
      // Re-checked at fire time, not just at schedule time. A `flush` (finalize,
      // or "Save and leave") can land in the second between the two and write
      // exactly this payload, and the stale timer would then repeat the write
      // for nothing — or, right after a finalize, at a document that is no
      // longer a draft.
      if (frozen.current || key === lastSaved.current) return;
      setSaveState('saving');
      setServerError(null);
      enqueue(async () => {
        setSaveState((await save()) ? 'saved' : 'idle');
      });
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
    // `save` reads exactly what `key` encodes, plus `docIdRef`. Depending on
    // `save` itself would re-arm the timer on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, recipientId]);

  return {
    docId,
    saveState,
    savedAt,
    serverError,
    setServerError,
    dirty,
    flush: () => enqueue(save),
    freeze: () => {
      frozen.current = true;
    },
    thaw: () => {
      frozen.current = false;
    },
  };
}
