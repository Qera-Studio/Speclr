import type { ValidationResult } from './types';
import type { ApplicableCriteria } from './applicableCriteria';

/**
 * Reduce a ValidationResult to a slot's pass/fail/neutral outcome.
 *
 * - `false` — at least one check verifiably failed (wrong dimensions, wrong
 *   format, or a transparent image in a slot that must be opaque).
 * - `true`  — nothing failed AND either the pixel-level dimensions check ran and
 *   passed, or dimensions don't apply (a vector spec) and the one applicable
 *   check — format — passed.
 * - `null`  — nothing failed but the substantive check couldn't run for a spec
 *   that *does* expect it (e.g. an .ico whose dimensions somehow read as
 *   unknown). Format matching alone is too weak to call such a slot "passed",
 *   so `null` surfaces it as "review manually" instead of a false pass.
 *
 * Pass `criteria` so a vector spec (dimensions not applicable) can pass on its
 * one real check; without it the historical dimensions-required rule holds.
 */
export function computePassed(result: ValidationResult, criteria?: ApplicableCriteria): boolean | null {
  const failed =
    result.dimensionsOk === false || result.formatOk === false || result.transparencyIsWarning;
  if (failed) return false;

  // A green normally requires the dimensions check to have actually run and
  // passed — format-only confirmation is too weak.
  if (result.dimensionsOk === true) return true;

  // …unless the spec genuinely doesn't check dimensions (a vector). Then the one
  // applicable check, format, having passed is a real pass.
  if (criteria && !criteria.dimensions && result.formatOk === true) return true;

  return null;
}
