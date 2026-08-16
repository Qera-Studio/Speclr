/**
 * The one thing an identifier says about itself, once it has passed its check.
 *
 * Every one of these is already decoded somewhere in `india.ts` in order to
 * *reject* something. This reads the same characters back instead, which is the
 * difference between a tick that asserts and a tick that shows its working: a
 * GSTIN that resolves to "Uttar Pradesh" is checkable against the letterhead by
 * the person who just copied it, and a bare tick is not.
 *
 * **As much as the field can spare, and no more.** This renders beside the tick
 * on the trailing edge, so it competes with the value for width, and what is
 * affordable is a property of the field rather than of the identifier. Anything
 * the reader can already see elsewhere is still cut — the GSTIN's embedded PAN
 * is not named here because it fills the PAN field below it. CIN is the one
 * that carries two, because it has a full row to itself; see the branch.
 *
 * **The bound, and it governs the copy.** Every fact is derived from the
 * characters in the field. Nothing is fetched, nothing is looked up, and no
 * fact may be phrased so a reader concludes otherwise — so this returns what
 * the number *is*, never who holds it or whether they are active.
 *
 * TAN returns nothing, deliberately. It carries no check digit and its city
 * prefix has no published table, so there is nothing true to say about one
 * beyond its shape, and inventing a line for symmetry would be exactly the
 * reassurance-without-substance this exists to avoid.
 */

import { GST_STATES } from '../gstStates';
import { entityTypeLabel } from '../entityType';
import {
  PAN_HOLDER_LABELS,
  PAN_RE,
  cinError,
  entityTypeOfCin,
  gstinError,
  gstinStateCode,
  tanError,
} from './india';

export type IdentifierKind = 'gstin' | 'pan' | 'tan' | 'cin';

/**
 * Does this value pass everything the characters alone can decide?
 *
 * Exists so the tick does not have to wait for react-hook-form to have recorded
 * an error, which under `mode: 'onTouched'` does not happen until the field has
 * been left once. That lag is what made a field show nothing at all while it
 * was being typed into, and show nothing again after a reload until it was
 * touched — the value was right both times and the form simply had not looked.
 *
 * **Deliberately blind to the cross-record rules.** A GSTIN whose state
 * disagrees with the address, or whose embedded PAN disagrees with the record's,
 * passes here and is still refused by the resolver. The caller keeps the
 * form's error as a veto over this answer; this only ever brings the tick
 * *earlier*, never over the top of a known failure.
 */
export function identifierPasses(kind: IdentifierKind, raw: string): boolean {
  const value = raw.trim().toUpperCase();
  if (!value) return false;

  switch (kind) {
    case 'gstin':
      return !gstinError(value);
    case 'pan':
      return PAN_RE.test(value);
    case 'tan':
      return !tanError(value);
    case 'cin':
      return !cinError(value);
  }
}

/**
 * What this identifier says, or null if it does not hold up.
 *
 * Returning nothing for an invalid value rather than a partial reading is the
 * point: half a decoding of a mistyped GSTIN is a wrong state name displayed
 * with confidence.
 */
export function identifierFact(kind: IdentifierKind, raw: string): string | null {
  const value = raw.trim().toUpperCase();
  if (!value) return null;

  if (kind === 'gstin') {
    if (gstinError(value)) return null;
    return GST_STATES.find((s) => s.code === gstinStateCode(value))?.name ?? null;
  }

  if (kind === 'pan') {
    if (!PAN_RE.test(value)) return null;
    return PAN_HOLDER_LABELS[value[3]] ?? null;
  }

  if (kind === 'cin') {
    if (cinError(value)) return null;
    /**
     * Two facts here rather than one, and CIN is the only kind that gets two.
     *
     * The rule at the top of this file is that a fact competing with the value
     * for width has to earn the space. CIN now has a row to itself (21
     * characters would not share one), so the constraint that kept this to the
     * year alone is gone, and the ownership triple is the *more* useful of the
     * two: `PTC` against `PLC` is the difference between a private and a public
     * company, and it is read off the certificate rather than remembered.
     *
     * It stays a *reading*, not a check. `cinEntityTypeError` is what compares
     * it against the record and blocks the save, and the warning below the
     * field is what offers the fix. This only says what the characters mean, so
     * a triple with no row here (`FTC`, `GOI`, `NPL`) shows the year alone
     * rather than a guess.
     */
    const kindLabel = entityTypeLabel(entityTypeOfCin(value) ?? undefined);
    const year = `INC ${value.slice(8, 12)}`;
    return kindLabel ? `${kindLabel} · ${year}` : year;
  }

  // TAN, and anything added later without a decoding: say nothing.
  return null;
}
