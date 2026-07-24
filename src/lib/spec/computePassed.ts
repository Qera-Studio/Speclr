import type { ValidationResult } from './types';

/**
 * Reduce a ValidationResult to a slot's pass/fail/neutral outcome.
 *
 * - `false` — at least one check verifiably failed (wrong dimensions, wrong
 *   format, or a transparent image in a slot that must be opaque).
 * - `true`  — nothing failed AND the pixel-level dimensions check actually ran
 *   and passed.
 * - `null`  — nothing failed but the substantive check couldn't run (e.g. .ico,
 *   whose format we can confirm from the extension but whose embedded layers the
 *   browser can't inspect; or an SVG, which has no fixed pixel size). Format
 *   matching alone is too weak to call a slot "passed" — a correctly-named .ico
 *   with the wrong embedded sizes would still show green. `null` surfaces these
 *   as "review manually" instead of a false pass.
 */
export function computePassed(result: ValidationResult): boolean | null {
  const failed =
    result.dimensionsOk === false || result.formatOk === false || result.transparencyIsWarning;
  if (failed) return false;

  // A green requires the dimensions check to have actually run and passed.
  // Format-only confirmation (all we get for .ico/SVG) is not enough.
  return result.dimensionsOk === true ? true : null;
}
