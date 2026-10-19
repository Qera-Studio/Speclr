/**
 * A multi-step flow, as data.
 *
 * One array drives the step row, the URL slug and the completeness ticks, so a
 * step cannot exist in the nav and not in the count — the failure every
 * hand-wired wizard eventually has.
 *
 * Generic over the record the flow is building, because there are two of them
 * now: onboarding walks a `ClientRecord`, the contract builder walks a draft.
 * They were one concrete implementation inside `onboarding/` until the second
 * one needed it, which is `PRINCIPLES.md` rule 1 firing on presentation rather
 * than on data (`CONTEXT.md` §5e).
 *
 * **Completeness is derived, never stored.** `isComplete` reads the record, so
 * there is no column recording which step somebody stopped on and no way for
 * that column to disagree with the record the first time a step is revisited
 * and left empty (rule 3).
 */

export interface FlowStep<R> {
  /** The `?step=` / `?phase=` slug. Part of a URL people paste, so it does not change. */
  key: string;
  /**
   * The one-word label in the step row, and the name of the button that walks
   * to it — "Save and continue" tells you nothing about where continuing goes.
   * Separate from `title` because the row has to stay on one line while the
   * page heading can say more.
   */
  short: string;
  title: string;
  description?: string;
  /**
   * Whether this step needs a saved record first.
   *
   * In onboarding only identity does not: it is what creates the row every
   * other step then updates. In the contract builder the first phase mints the
   * draft the same way.
   */
  needsRecord: boolean;
  /** Whether the record carries anything for this step yet. */
  isComplete: (record: R) => boolean;
}

/**
 * Where a slug sits in a list. An unknown slug is the first step, which is also
 * how a step this record does not have resolves: an individual sent
 * `?step=contacts` lands on Identity rather than on nothing.
 */
export function stepIndex<R>(
  steps: readonly FlowStep<R>[],
  key: string | null | undefined,
): number {
  const found = steps.findIndex((s) => s.key === key);
  return found === -1 ? 0 : found;
}

/**
 * How many steps the record carries something for.
 *
 * Counted against *these* steps, so a flow with a conditional step is never
 * "6 of 7" with a seventh that was never shown.
 */
export function completedSteps<R>(steps: readonly FlowStep<R>[], record: R): number {
  return steps.filter((s) => s.isComplete(record)).length;
}

/**
 * The step to open a saved record on: the first one it carries nothing for.
 *
 * Not "the step after the count", because the count is how many steps are
 * complete and not how far along the record is — a record can have the last
 * step filled and the second empty. The first gap is the one worth landing on,
 * and a record with no gaps opens on its last step rather than on nothing.
 */
export function resumeStep<R>(steps: readonly FlowStep<R>[], record: R): string {
  const next = steps.find((s) => !s.isComplete(record));
  return (next ?? steps[steps.length - 1]).key;
}
