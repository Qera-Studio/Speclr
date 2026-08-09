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
import type { ScheduleKey } from './schedules';

/** One addressable group of blanks — a clause, or a section of a Part. */
export interface BlankScope {
  scope: string;
  /** Where the editor files it: 'Master Agreement', 'Schedule A', 'Part A-1'. */
  group: string;
  /** What the editor calls it: 'Fees, Invoicing and Payment', 'Limits'. The
   * clause number is the document's own numbering and changes with what the
   * contract includes — the editor names things, it does not cite them. */
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

/**
 * The heading each Part section prints under.
 *
 * A Retainer Part is delivered per cycle rather than finished once, and its
 * headings say so: it is included "each cycle", it has no completion criteria
 * to meet, and it carries a recurring fee rather than a fee and a timeline.
 * Content §5 requires the distinction, and it is worth keeping honest — a
 * "Completion criteria" heading above "not applicable" is a heading that lies.
 *
 * One map, read by both the sheet and the editor, so the two cannot drift into
 * calling the same section different things.
 */
export function partSectionLabel(section: string, scheduleKey: ScheduleKey): string {
  const retainer = scheduleKey === 'retainer';
  switch (section) {
    case 'overview':
      return 'Overview';
    case 'included':
      return retainer ? 'What is included each cycle' : 'What is included';
    case 'account':
      return 'Account and ownership arrangement';
    case 'limits':
      return 'Limits';
    case 'limitsNotes':
      return 'How the limits are counted';
    case 'completion':
      return retainer ? 'How delivery is measured' : 'Completion criteria';
    case 'receives':
      return 'What the Client receives';
    case 'receivesNotes':
      return 'Handover notes';
    case 'exclusions':
      return 'What is not included';
    case 'clientInputs':
      return 'What the Client provides';
    case 'costs':
      return 'Costs the Client pays directly';
    case 'fee':
      return retainer ? 'Fee and cycle' : 'Fee and timeline';
    default:
      return section;
  }
}

/** The Part sections that can hold a blank, in the order the sheet prints them. */
function partScopes(part: ContractPart, group: string): BlankScope[] {
  const at = (section: string, texts: string[], rowLabels?: string[]) =>
    scopeOf(
      partScope(part.code, section),
      group,
      partSectionLabel(section, part.scheduleKey),
      texts,
      rowLabels,
    );

  return [
    at('overview', part.overview),
    at('included', part.included),
    at('account', part.accountTerms),
    at('limits', part.limits.map((r) => r.value), part.limits.map((r) => r.label)),
    at('limitsNotes', part.limitsNotes),
    at('completion', part.completion),
    at('receives', part.receives),
    at('receivesNotes', part.receivesNotes),
    at('costs', [part.thirdPartyCosts]),
    at('fee', part.fee.map((r) => r.value), part.fee.map((r) => r.label)),
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
      clause.heading,
      clause.body,
    ),
  );

  const assembled = assemble(contract.parts);

  const schedules = assembled.flatMap(({ schedule, letter }) =>
    schedule.clauses.map((clause) =>
      scopeOf(
        scheduleScope(schedule.key, clause.number),
        `Schedule ${letter} — ${schedule.name}`,
        clause.heading,
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
