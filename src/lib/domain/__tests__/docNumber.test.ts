import { formatDocNumber } from '../docNumber';

describe('formatDocNumber', () => {
  it('formats with the FY code and a zero-padded 3-digit serial', () => {
    expect(formatDocNumber('INV', '2526', 3)).toBe('QS-INV-2526-003');
  });

  it('formats receipts', () => {
    expect(formatDocNumber('REC', '2627', 12)).toBe('QS-REC-2627-012');
  });

  it('grows past 999 without truncation', () => {
    expect(formatDocNumber('INV', '2526', 1000)).toBe('QS-INV-2526-1000');
  });

  it('throws on a non-positive serial', () => {
    expect(() => formatDocNumber('INV', '2526', 0)).toThrow();
    expect(() => formatDocNumber('INV', '2526', -1)).toThrow();
    expect(() => formatDocNumber('INV', '2526', 1.5)).toThrow();
  });

  it('throws on a malformed FY code', () => {
    expect(() => formatDocNumber('INV', '26', 1)).toThrow();
    expect(() => formatDocNumber('INV', 'abcd', 1)).toThrow();
  });
});
