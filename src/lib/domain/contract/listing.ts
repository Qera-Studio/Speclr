/**
 * What the documents list reads off a contract: the fee it states. (Which
 * Schedules it runs under is `documentSchedules`, one answer for every type.)
 *
 * **The fee is read from the blank, never stored beside it.** A contract's
 * money is the figure printed under "Fee" or "Monthly fee" in each Part, which
 * lives in `contract.blanks` as the text the operator sees ('₹45,000'). A
 * second copy kept as a number would be one fact in two places, and the copy
 * that drifts is always the one nothing prints (`PRINCIPLES.md` rule 3). So
 * this parses the blank back, which is safe because a money blank only ever
 * holds what `sanitiseBlank('money')` wrote: a rupee sign, digits grouped the
 * Indian way, at most two decimals. Anything else reads as no fee, and so does
 * an empty blank: a contract whose fee is not filled in has no figure yet,
 * which is a truer answer than zero.
 *
 * **The first fee row's first blank is the fee.** That is the target
 * `feeBlanks` seeds from the client's agreed rate, and for the same reason: a
 * Part's fee rows are a fee, a payment split, a timeline and a support window,
 * and only the first is the money. Where a Service names several frames the
 * rows run end to end, and the later ones stay the terms phase's to answer.
 *
 * **A retainer's fee is a month's, and it is never quietly added to a one-off.**
 * `contractFees` keeps the two apart so a list can say '₹ 45,000.00 /mo'
 * rather than print a month's fee under a column called Total.
 * `contractTotalPaise` adds them only where one number is needed to rank or
 * compare (sorting, the amount filter, the `total_paise` column).
 */

import { partScope, type ContractPart } from './assembly';
import { blankKind, parseScope, type Blank, type BlankValues } from './blanks';
import { FEE_SECTION } from './ledger';
import { rupeesToPaise } from '../money';
import type { ContractData } from '../types';

/**
 * The blank that holds a Part's fee, or nothing where the Part states no
 * figure (a fee row with no blank is a stated figure rather than a question,
 * and a first row that is not money is not a fee).
 *
 * Parsed as one scope across every row, because that is how the ordinals are
 * numbered and therefore how the keys are formed (`parseScope`).
 */
export function feeBlankOf(part: ContractPart): Blank | undefined {
  const rows = part.fee ?? [];
  if (rows.length === 0) return undefined;
  const parsed = parseScope(
    partScope(part.code, FEE_SECTION),
    rows.map((row) => row.value),
  );
  const target = parsed[0]?.blanks[0];
  if (!target || blankKind(target, rows[0]?.label) !== 'money') return undefined;
  return target;
}

/** What a Part's fee blank holds, in paise, or nothing where it is empty. */
export function feePaiseOf(part: ContractPart, blanks: BlankValues): number | undefined {
  const blank = feeBlankOf(part);
  const text = blank ? blanks[blank.key] : undefined;
  if (!text) return undefined;
  return rupeesToPaise(text.replace(/[₹,\s]/g, '')) ?? undefined;
}

export interface ContractFees {
  /** The one-off fees, summed: every Part that is not a Retainer. */
  oncePaise?: number;
  /** The monthly fees, summed: the Retainer Parts. */
  monthlyPaise?: number;
}

/** The fees a contract states, one-off and monthly kept apart. */
export function contractFees(
  contract: Pick<ContractData, 'parts' | 'blanks'> | undefined,
): ContractFees {
  const fees: ContractFees = {};
  for (const part of contract?.parts ?? []) {
    const paise = feePaiseOf(part, contract?.blanks ?? {});
    if (paise === undefined) continue;
    // The same test `rateUnitOf` makes: a Retainer is the Schedule under which
    // work recurs monthly, so its fee is per month.
    const key = part.scheduleKey === 'retainer' ? 'monthlyPaise' : 'oncePaise';
    fees[key] = (fees[key] ?? 0) + paise;
  }
  return fees;
}

/** One number to rank or compare by, or null where no fee is filled in. */
export function contractTotalPaise(
  contract: Pick<ContractData, 'parts' | 'blanks'> | undefined,
): number | null {
  const { oncePaise, monthlyPaise } = contractFees(contract);
  if (oncePaise === undefined && monthlyPaise === undefined) return null;
  return (oncePaise ?? 0) + (monthlyPaise ?? 0);
}
