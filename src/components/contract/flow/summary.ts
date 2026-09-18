/**
 * What the contract says about itself so far, derived from the draft.
 *
 * Every line here is computed from `ContractDraft` on each render and nothing
 * is stored (`PRINCIPLES.md` rule 3). That is not incidental: a rail that
 * summarises the document while holding its own copy of the summary is two
 * places for the same fact to live, and the one the reader is looking at is
 * the one that goes stale.
 *
 * It is separate from `phases.ts` because the two answer different questions.
 * `isComplete` decides whether a phase may be left; this decides what the
 * reader is told has been decided. A phase can be complete and have nothing
 * worth saying, and it can be incomplete and still have three facts settled.
 *
 * **Nothing is reported as missing.** A group with nothing decided is omitted
 * rather than printed as "None yet", so the rail holds only facts and grows as
 * the flow does. The step row above already says which phases are outstanding,
 * and it says so without a column of placeholders restating it: on phase 1
 * there is one group, and the rail is otherwise empty.
 */

import { addMonths, formatDisplayDate, isoToLocalDate } from '@/lib/domain/dates';
import { FEE_SECTION, unfilledByPart } from '@/lib/domain/contract/ledger';
import type { ContractDraft } from './phases';

/** One line of the rail: a label for assistive tech, and the value to print. */
export interface SummaryLine {
  label: string;
  value: string;
}

export interface SummaryGroup {
  /** The phase this group belongs to, so the rail can mark where the reader is. */
  phase: string;
  title: string;
  lines: SummaryLine[];
}

/**
 * The engagement's dates as one phrase: '17 Sep 2026 → 17 Sep 2027 (12 months)'.
 *
 * The end is derived from the start and the term rather than being a third
 * field, which is the same rule that makes an invoice's due date derived
 * (rule 3). It is **the effective date that starts the term, not the agreement
 * date**, and the two genuinely differ: work often begins on a handshake and
 * the paperwork catches up, which is exactly what `effectiveDate` records.
 *
 * With no term there is no end, so it prints the start alone rather than
 * inventing a duration.
 */
export function termPhrase(
  issueDate: string,
  effectiveDate?: string,
  termMonths?: number,
): string {
  /*
    `isoToLocalDate`, not `isISODate`, and the difference is a real bug rather
    than a preference. `isISODate` is a *shape* check: '2026-02-31' passes it,
    because February has the right number of digits. `formatDisplayDate` then
    happily prints '31 Feb 2026', which is a date that does not exist, on the
    rail summarising a contract. The parser is what knows a month's length, and
    it answers null for exactly these. Caught by this function's own test.
  */
  const usable = (value?: string) => Boolean(value && isoToLocalDate(value));
  const start = usable(effectiveDate) ? (effectiveDate as string) : issueDate;
  if (!usable(start)) return '';

  const from = formatDisplayDate(start);
  if (!termMonths || termMonths <= 0) return from;

  const end = addMonths(start, termMonths);
  const months = `${termMonths} month${termMonths === 1 ? '' : 's'}`;
  // `addMonths` answers '' for anything it cannot parse, and a half-built
  // phrase is worse than the start alone.
  return end ? `${from} → ${formatDisplayDate(end)} (${months})` : `${from} (${months})`;
}

/**
 * The whole rail, as data.
 *
 * A group appears once it has something to say and not before, so the rail is
 * a record of what is settled rather than a checklist of what is not. Empty
 * groups are dropped at the end, which keeps each block below free to describe
 * only the case where it has content.
 */
export function contractSummary(
  draft: ContractDraft,
  clientName?: string,
): SummaryGroup[] {
  const { contract } = draft;
  const dates = termPhrase(draft.issueDate, contract.effectiveDate, contract.termMonths);

  const parts = contract.parts;
  const reviewed = new Set(contract.reviewed ?? []);

  // The fee section only, which is the terms phase's half of the ledger. The
  // scope phase owns everything else, and a single count spanning both would
  // send the reader to the wrong screen (`ledger.ts`, `FEE_SECTION`).
  const feeUnfilled = [...unfilledByPart(contract).values()].reduce((a, b) => a + b, 0);
  const scopeUnfilled = [
    ...unfilledByPart(contract, { except: FEE_SECTION }).values(),
  ].reduce((a, b) => a + b, 0);
  const feeOnly = feeUnfilled - scopeUnfilled;

  const groups: SummaryGroup[] = [
    {
      phase: 'client',
      title: 'Engagement',
      lines: [
        ...(clientName ? [{ label: 'Client', value: clientName }] : []),
        ...(dates ? [{ label: 'Dates', value: dates }] : []),
      ],
    },
    /*
      One group, since Scope merged into Services (`phases.ts`). It was two
      while they were two phases; a rail group pointing at a phase that no
      longer exists would never be the current one, and its count belongs
      beside the list it counts.
    */
    {
      phase: 'services',
      title: 'Services',
      lines: [
        ...parts.map((part) => ({ label: part.code, value: part.name })),
        ...(parts.length === 0
          ? []
          : [
              {
                label: 'Reviewed',
                value: `${parts.filter((p) => reviewed.has(p.code)).length} of ${parts.length}`,
              },
            ]),
        /*
          "N blank(s) left", never "N to fill". The services ledger owns that
          second phrase, and the rail sits beside it: two different counts
          (scope's and the fee's, below) wearing one wording on one screen is
          how a reader comes to trust the wrong number. Pinned by
          `contract-flow.spec.ts`, which asserts the ledger's phrase is absent
          when nothing is missing and went red when the rail borrowed it.
        */
        ...(scopeUnfilled > 0 ? [{ label: 'Blanks', value: `${scopeUnfilled} left` }] : []),
      ],
    },
    {
      phase: 'terms',
      title: 'Terms',
      lines:
        parts.length === 0
          ? []
          : [{ label: 'Fees', value: feeOnly > 0 ? `${feeOnly} left` : 'Set' }],
    },
  ];

  return groups.filter((group) => group.lines.length > 0);
}
