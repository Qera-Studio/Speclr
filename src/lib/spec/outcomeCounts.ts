import type { ValidationResult } from './types';
import type { ApplicableCriteria } from './applicableCriteria';

export interface OutcomeCounts {
  passed: number;
  failed: number;
  warnings: number;
}

/**
 * Tally a validation result into passed / failed / warning counts over the
 * spec's *applicable* criteria, plus any advisory quality warnings.
 *
 * - dimensions / format: pass when true, fail when false (skipped if the check
 *   isn't applicable or its state is 'unknown').
 * - transparency: a required-opaque slot that got a transparent image is a
 *   *warning* (not a fail); otherwise a known transparency state is a pass.
 * - advisory quality warnings (aspect-ratio, file-weight, safe-zone, svg-*)
 *   each add one to the warning count.
 */
export function outcomeCounts(result: ValidationResult, criteria: ApplicableCriteria): OutcomeCounts {
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  if (criteria.dimensions) {
    if (result.dimensionsOk === true) passed++;
    else if (result.dimensionsOk === false) failed++;
  }
  if (criteria.format) {
    if (result.formatOk === true) passed++;
    else if (result.formatOk === false) failed++;
  }
  if (criteria.transparency) {
    if (result.transparencyIsWarning) warnings++;
    else if (result.transparency !== 'unknown') passed++;
  }

  warnings += result.warnings?.length ?? 0;

  return { passed, failed, warnings };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Render the collapsed-row summary, e.g. "All checks passed" or "2 passed · 1 failed · 1 warning". */
export function summarize({ passed, failed, warnings }: OutcomeCounts): string {
  if (failed === 0 && warnings === 0) return 'All checks passed';

  const parts = [`${passed} passed`];
  if (failed > 0) parts.push(`${failed} failed`); // "failed" is invariant, not pluralised
  if (warnings > 0) parts.push(plural(warnings, 'warning'));
  return parts.join(' · ');
}
