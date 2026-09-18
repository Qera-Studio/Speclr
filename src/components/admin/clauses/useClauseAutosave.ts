'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateClause } from '@/server/actions/clauses';
import type { ClauseInput } from '@/lib/domain/contract/msa';

/**
 * How long the drawer waits after the last change before writing.
 *
 * **The debounce is the safety mechanism here, not a performance tweak**, and
 * that is the difference from `useDraftAutosave`. A document draft belongs to
 * one document and the worst case of a mid-word write is a half-typed word in
 * something not yet issued. A clause is the source text for every contract
 * drafted after it (`CONTEXT.md` §5c), so a write that lands mid-sentence puts
 * a half-typed legal clause in the library. Waiting for the typing to stop is
 * what makes saving without a button acceptable on this table.
 *
 * Slightly shorter than the editors' 1000ms because a clause is a smaller edit
 * made in a drawer somebody closes straight afterwards.
 */
export const CLAUSE_AUTOSAVE_MS = 800;

export type ClauseSaveState = 'idle' | 'unsaved' | 'saving' | 'saved';

export interface ClauseAutosave {
  state: ClauseSaveState;
  /** The last refusal from the server, or null. */
  error: string | null;
  setError: (error: string | null) => void;
  /**
   * Write anything pending now, and stop scheduling.
   *
   * Archiving and deleting both call it first. A debounce still in flight would
   * otherwise fire at a row that is no longer there, and the reader would see a
   * failure they did not cause.
   */
  flush: () => Promise<void>;
}

/**
 * A clause that saves itself.
 *
 * The Save button is gone, so the two things it used to provide have to come
 * from somewhere: a moment the write happens (the debounce above) and a way to
 * see that it did (`state`, which the drawer renders as a status line).
 *
 * Three of its rules are lifted from `useDraftAutosave`, because they were
 * learned the expensive way there and none of them are specific to documents:
 *
 * - **The baseline is seeded during the first render**, so opening a clause is
 *   not an edit to it. Seeding it in an effect instead writes every clause back
 *   to itself the moment its drawer opens.
 * - **Writes are serialised.** Two can be in flight while somebody keeps
 *   typing, and two landing out of order persist the older text over the newer.
 * - **Freezing is explicit**, for the irreversible actions.
 */
export function useClauseAutosave({
  clause,
  draft,
  /** Other clauses that must be written alongside this one. See `alsoWrite`. */
  alsoWrite = [],
}: {
  /** The clause as the server last sent it. */
  clause: ClauseInput;
  /** The clause as it would be saved. */
  draft: ClauseInput;
  alsoWrite?: ClauseInput[];
}): ClauseAutosave {
  const router = useRouter();
  const [state, setState] = useState<ClauseSaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  /** Everything a write depends on, as one comparable value. */
  const key = JSON.stringify([draft, alsoWrite]);
  /** What is on the server. Seeded from the first render: arrival is not an edit. */
  const lastSaved = useRef(key);
  /** The newest payload, so a queued write sends the latest rather than its own closure. */
  const latest = useRef({ draft, alsoWrite });
  latest.current = { draft, alsoWrite };

  const frozen = useRef(false);

  /** Every write to this clause, in order. See the note above. */
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = (job: () => Promise<void>): Promise<void> => {
    const next = queue.current.then(job, job);
    queue.current = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };

  const write = async () => {
    const sending = latest.current;
    const sendingKey = JSON.stringify([sending.draft, sending.alsoWrite]);
    setState('saving');
    for (const one of [sending.draft, ...sending.alsoWrite]) {
      const result = await updateClause(one);
      if (!result.success) {
        setError(result.error ?? 'Failed to save.');
        // Deliberately left as unsaved rather than 'saved': a refused write
        // that reported success is how an edit is silently lost.
        setState('unsaved');
        return;
      }
    }
    lastSaved.current = sendingKey;
    setError(null);
    setState('saved');
    router.refresh();
  };

  useEffect(() => {
    if (frozen.current) return;
    if (key === lastSaved.current) return;
    setState('unsaved');
    const timer = setTimeout(() => void enqueue(write), CLAUSE_AUTOSAVE_MS);
    return () => clearTimeout(timer);
    // `key` is the whole payload by value, which is what should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const flush = async () => {
    frozen.current = true;
    if (key === lastSaved.current) {
      await queue.current;
      return;
    }
    await enqueue(write);
  };

  return { state, error, setError, flush };
}
