import { outcomeCounts, summarize } from '../outcomeCounts';
import type { ValidationResult } from '../types';

const ALL = { dimensions: true, format: true, transparency: true };

const base: ValidationResult = {
  dimensionsOk: true,
  formatOk: true,
  transparency: 'opaque',
  transparencyIsWarning: false,
  objectUrl: 'blob:mock',
};

describe('outcomeCounts', () => {
  it('counts three passes when everything applicable passes', () => {
    expect(outcomeCounts(base, ALL)).toEqual({ passed: 3, failed: 0, warnings: 0 });
  });

  it('counts a failed dimensions check', () => {
    expect(outcomeCounts({ ...base, dimensionsOk: false }, ALL)).toEqual({ passed: 2, failed: 1, warnings: 0 });
  });

  it('treats a transparency warning as a warning, not a pass or fail', () => {
    const r = { ...base, transparency: 'transparent' as const, transparencyIsWarning: true };
    // dimensions + format pass; transparency is a warning (not counted pass/fail).
    expect(outcomeCounts(r, ALL)).toEqual({ passed: 2, failed: 0, warnings: 1 });
  });

  it('adds advisory quality warnings to the warning count', () => {
    const r = { ...base, warnings: [{ kind: 'aspect-ratio' as const, message: 'x' }] };
    expect(outcomeCounts(r, ALL)).toEqual({ passed: 3, failed: 0, warnings: 1 });
  });

  it('only counts applicable criteria (vector: format only)', () => {
    const r = { ...base, dimensionsOk: 'unknown' as const, transparency: 'unknown' as const };
    expect(outcomeCounts(r, { dimensions: false, format: true, transparency: false })).toEqual({
      passed: 1,
      failed: 0,
      warnings: 0,
    });
  });
});

describe('summarize', () => {
  it('reads "All checks passed" when everything passes with no warnings', () => {
    expect(summarize({ passed: 3, failed: 0, warnings: 0 })).toBe('All checks passed');
  });

  it('shows passed + failed counts', () => {
    expect(summarize({ passed: 2, failed: 1, warnings: 0 })).toBe('2 passed · 1 failed');
  });

  it('appends a warning count', () => {
    expect(summarize({ passed: 3, failed: 0, warnings: 1 })).toBe('3 passed · 1 warning');
  });

  it('pluralises and combines failed + warnings', () => {
    expect(summarize({ passed: 1, failed: 2, warnings: 2 })).toBe('1 passed · 2 failed · 2 warnings');
  });
});
