import { computePassed } from '../computePassed';
import type { ValidationResult } from '../types';

function result(overrides: Partial<ValidationResult>): ValidationResult {
  return {
    dimensionsOk: 'unknown',
    formatOk: 'unknown',
    transparency: 'unknown',
    transparencyIsWarning: false,
    objectUrl: 'blob:mock',
    ...overrides,
  };
}

describe('computePassed', () => {
  it('passes when dimensions and format both pass and there is no transparency warning', () => {
    expect(computePassed(result({ dimensionsOk: true, formatOk: true, transparency: 'opaque' }))).toBe(true);
  });

  it('fails when dimensions are wrong', () => {
    expect(computePassed(result({ dimensionsOk: false, formatOk: true }))).toBe(false);
  });

  it('fails when the format is wrong', () => {
    expect(computePassed(result({ dimensionsOk: true, formatOk: false }))).toBe(false);
  });

  it('fails when a required-opaque slot got a transparent image', () => {
    expect(
      computePassed(result({ dimensionsOk: true, formatOk: true, transparency: 'transparent', transparencyIsWarning: true })),
    ).toBe(false);
  });

  it('returns null when nothing failed but dimensions could not be verified (.ico: format ok, dims unknown)', () => {
    // A correctly-named .ico confirms format but not its embedded 16/32/48 layers.
    expect(computePassed(result({ dimensionsOk: 'unknown', formatOk: true, transparency: 'unknown' }))).toBeNull();
  });

  it('returns null for an SVG (format verified, but no fixed pixel size to check)', () => {
    expect(computePassed(result({ dimensionsOk: 'unknown', formatOk: true, transparency: 'unknown' }))).toBeNull();
  });

  it('fails an SVG uploaded to a PNG slot (format known-bad) despite unknown dimensions', () => {
    expect(computePassed(result({ dimensionsOk: 'unknown', formatOk: false, transparency: 'unknown' }))).toBe(false);
  });

  it('passes a vector spec on format alone when dimensions/transparency are not applicable', () => {
    // A vector spec (SVG) checks only format. When the only applicable check
    // passes, the slot is a genuine pass — not "review manually".
    expect(
      computePassed(result({ dimensionsOk: 'unknown', formatOk: true, transparency: 'unknown' }), {
        dimensions: false,
        format: true,
        transparency: false,
      }),
    ).toBe(true);
  });

  it('still fails a vector spec when the one applicable check (format) fails', () => {
    expect(
      computePassed(result({ dimensionsOk: 'unknown', formatOk: false, transparency: 'unknown' }), {
        dimensions: false,
        format: true,
        transparency: false,
      }),
    ).toBe(false);
  });
});
