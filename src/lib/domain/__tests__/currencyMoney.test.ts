import { amountInWords } from '../amountInWords';
import { formatINR, formatMoney } from '../money';

/**
 * The currency-aware paths, added when stipend slips became payable in a
 * currency other than INR.
 *
 * These live in their own file so `money.test.ts` and `amountInWords.test.ts`
 * stay exactly as they were lifted from the source project — those prove the
 * rupee core survived, and must not be edited.
 */

describe('formatMoney', () => {
  it('is byte-identical to formatINR for rupees', () => {
    for (const paise of [0, 1, 99, 100, 12345678, 1_00_00_00_000]) {
      expect(formatMoney(paise, 'INR')).toBe(formatINR(paise));
    }
  });

  it('defaults to INR when no currency is given', () => {
    expect(formatMoney(250000)).toBe(formatINR(250000));
  });

  it('uses the currency symbol and international grouping', () => {
    expect(formatMoney(250000, 'USD')).toBe('$ 2,500.00');
    expect(formatMoney(123456789, 'GBP')).toBe('£ 1,234,567.89');
    expect(formatMoney(5, 'EUR')).toBe('€ 0.05');
  });

  /** Indian grouping is INR-only — a dollar amount must not read as lakhs. */
  it('does not apply lakh grouping to non-INR', () => {
    expect(formatMoney(12345678, 'INR')).toBe('₹ 1,23,456.78');
    expect(formatMoney(12345678, 'USD')).toBe('$ 123,456.78');
  });

  it('rejects a non-integer or negative minor amount', () => {
    expect(() => formatMoney(1.5, 'USD')).toThrow();
    expect(() => formatMoney(-1, 'USD')).toThrow();
  });
});

describe('amountInWords with a currency', () => {
  it('leaves the INR wording untouched', () => {
    expect(amountInWords(12345678)).toBe(amountInWords(12345678, 'INR'));
    expect(amountInWords(250000, 'INR')).toBe('Two Thousand Five Hundred Rupees Only');
  });

  it('uses the currency unit words', () => {
    expect(amountInWords(250000, 'USD')).toBe('Two Thousand Five Hundred Dollars Only');
    expect(amountInWords(100, 'USD')).toBe('One Dollar Only');
    expect(amountInWords(101, 'USD')).toBe('One Dollar and One Cent Only');
    expect(amountInWords(0, 'USD')).toBe('Zero Dollars Only');
  });

  it('uses irregular minor-unit plurals', () => {
    expect(amountInWords(105, 'GBP')).toBe('One Pound and Five Pence Only');
    expect(amountInWords(101, 'GBP')).toBe('One Pound and One Penny Only');
  });

  /** The grouping system is the substantive difference, not just the noun. */
  it('groups non-INR in thousands/millions, not lakhs/crores', () => {
    expect(amountInWords(12345600, 'INR')).toContain('Lakh');
    const usd = amountInWords(12345600, 'USD');
    expect(usd).toContain('Thousand');
    expect(usd).not.toContain('Lakh');
    expect(amountInWords(500000000, 'USD')).toBe('Five Million Dollars Only');
    expect(amountInWords(200000000000, 'USD')).toBe('Two Billion Dollars Only');
  });

  it('rejects a non-integer or negative minor amount', () => {
    expect(() => amountInWords(1.5, 'USD')).toThrow();
    expect(() => amountInWords(-1, 'USD')).toThrow();
  });
});
