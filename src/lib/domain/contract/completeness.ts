/**
 * Every piece of blank-bearing text in a contract, enumerated once.
 *
 * This is the single list the sheet renders from, the editor builds its fields
 * from, and finalize validates against. One source, because three lists would
 * eventually disagree — and the way they would disagree is a blank the editor
 * never offers, the guard never checks, and the contract prints as `[ ]`.
 *
 * Pure and client-safe. Takes its contract structurally rather than importing
 * `ContractData`, so `types.ts` can depend on this module's siblings without a
 * cycle.
 */

import {
  blanksOf,
  isUnfilled,
  parseScope,
  type Blank,
  type BlankValues,
  type ParsedText,
} from './blanks';
import { assemble, msaScope, partScope, scheduleScope, type ContractPart } from './assembly';
import { MSA_CLAUSES } from './msa';

/** One addressable group of blanks — a clause, or a section of a Part. */
export interface BlankScope {
  scope: string;
  /** Where the editor files it: 'Master Agreement', 'Schedule A', 'Part A-1'. */
  group: string;
  /** What the editor calls it: '8. Fees, Invoicing and Payment', 'Limits'. */
  label: string;
  /** The source paragraphs, in order. */
  texts: string[];
  /**
   * Row labels for table sections (Limits, Fee), aligned to `texts` by index.
   * Absent for prose, where a blank has no label of its own.
   */
  rowLabels?: string[];
  parsed: ParsedText[];
}

interface ContractShape {
  parts: ContractPart[];
  blanks: BlankValues;
}

function scopeOf(
  scope: string,
  group: string,
  label: string,
  texts: string[],
  rowLabels?: string[],
): BlankScope {
  return { scope, group, label, texts, rowLabels, parsed: parseScope(scope, texts) };
}

/** The Part sections that can hold a blank, in the order the sheet prints them. */
function partScopes(part: ContractPart, group: string): BlankScope[] {
  const at = (section: string, label: string, texts: string[], rowLabels?: string[]) =>
    scopeOf(partScope(part.code, section), group, label, texts, rowLabels);

  return [
    at('overview', 'Overview', part.overview),
    at('included', 'What is included', part.included),
    at('account', 'Account and ownership', part.accountTerms),
    at('limits', 'Limits', part.limits.map((r) => r.value), part.limits.map((r) => r.label)),
    at('limitsNotes', 'How the limits are counted', part.limitsNotes),
    at('completion', 'Completion criteria', part.completion),
    at('receives', 'What the Client receives', part.receives),
    at('receivesNotes', 'Handover notes', part.receivesNotes),
    at('costs', 'Costs the Client pays directly', [part.thirdPartyCosts]),
    at('fee', 'Fee and timeline', part.fee.map((r) => r.value), part.fee.map((r) => r.label)),
  ].filter((s) => s.texts.length > 0);
}

/**
 * Every scope in a contract: the Master Agreement, each Schedule it actually
 * includes, and each Part.
 *
 * Only the Schedules with a Part appear, which is the same rule the document
 * itself follows — a blank inside a Schedule that is not being rendered is not
 * a blank this contract has, and demanding it at finalize would be nonsense.
 */
export function contractScopes(contract: ContractShape): BlankScope[] {
  const msa = MSA_CLAUSES.map((clause) =>
    scopeOf(
      msaScope(clause.number),
      'Master Agreement',
      `${clause.number}. ${clause.heading}`,
      clause.body,
    ),
  );

  const assembled = assemble(contract.parts);

  const schedules = assembled.flatMap(({ schedule, letter }) =>
    schedule.clauses.map((clause) =>
      scopeOf(
        scheduleScope(schedule.key, clause.number),
        `Schedule ${letter} — ${schedule.name}`,
        `${letter}${clause.number}. ${clause.heading}`,
        clause.body,
      ),
    ),
  );

  const parts = assembled.flatMap(({ parts: assembledParts }) =>
    assembledParts.flatMap(({ part, label }) =>
      partScopes(part, `Part ${label} — ${part.name}`),
    ),
  );

  return [...msa, ...schedules, ...parts].filter((s) => blanksOf(s.parsed).length > 0);
}

/**
 * The blanks a contract still has nothing in — what blocks finalize.
 *
 * A blank counts as unfilled when it resolves to empty: either drafted `[ ]`
 * and never touched, or filled and then cleared. Clearing is an override, not a
 * reset (CONTEXT.md §5b), so it leaves the contract unissuable rather than
 * quietly restoring a default nobody chose.
 */
export function contractComplete(contract: ContractShape): { scope: BlankScope; blank: Blank }[] {
  return contractScopes(contract).flatMap((scope) =>
    blanksOf(scope.parsed)
      .filter((blank) => isUnfilled(contract.blanks, blank))
      .map((blank) => ({ scope, blank })),
  );
}
