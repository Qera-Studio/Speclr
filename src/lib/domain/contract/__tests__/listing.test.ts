import { contractFees, contractTotalPaise, feeBlankOf, feePaiseOf } from '../listing';
import { contractDoc, serviceByCode } from './fixture';

// One seeded Part per Schedule that has a fee blank: 01–04 are Setup, 05–14
// Build, 15 on Retainer.
const SETUP = '01';
const BUILD = '05';
const RETAINER = '15';

const feeKey = (code: string) => {
  const blank = feeBlankOf(serviceByCode(code));
  if (!blank) throw new Error(`Part ${code} has no fee blank`);
  return blank.key;
};

describe('feeBlankOf', () => {
  it('names the first blank of the first fee row, keyed as the sheet keys it', () => {
    expect(feeKey(SETUP)).toBe('part.01.fee#0');
  });

  it('names nothing for a Part with no fee rows', () => {
    expect(feeBlankOf({ ...serviceByCode(SETUP), fee: [] })).toBeUndefined();
  });
});

describe('feePaiseOf', () => {
  const part = serviceByCode(RETAINER);
  const key = feeKey(RETAINER);

  it('reads back what the money input wrote', () => {
    expect(feePaiseOf(part, { [key]: '₹45,000' })).toBe(4_500_000);
    expect(feePaiseOf(part, { [key]: '₹1,20,000.50' })).toBe(12_000_050);
  });

  /** Zero is a stated fee (the work is given away); empty is no answer yet. */
  it('reads zero as a fee, and an empty or missing blank as none', () => {
    expect(feePaiseOf(part, { [key]: '₹0' })).toBe(0);
    expect(feePaiseOf(part, { [key]: '' })).toBeUndefined();
    expect(feePaiseOf(part, {})).toBeUndefined();
  });

  it('reads nothing from text that is not a figure', () => {
    expect(feePaiseOf(part, { [key]: 'TBC' })).toBeUndefined();
  });
});

describe('contractFees', () => {
  it("keeps a retainer's month apart from a one-off fee", () => {
    const doc = contractDoc({
      codes: [BUILD, RETAINER],
      blanks: { [feeKey(BUILD)]: '₹1,20,000', [feeKey(RETAINER)]: '₹45,000' },
    });
    expect(contractFees(doc.contract)).toEqual({ oncePaise: 12_000_000, monthlyPaise: 4_500_000 });
    expect(contractTotalPaise(doc.contract)).toBe(16_500_000);
  });

  it('sums fees of the same kind', () => {
    const doc = contractDoc({
      codes: [SETUP, BUILD],
      blanks: { [feeKey(SETUP)]: '₹5,000', [feeKey(BUILD)]: '₹1,20,000' },
    });
    expect(contractFees(doc.contract)).toEqual({ oncePaise: 12_500_000 });
  });

  it('has no figure until a fee is filled in', () => {
    expect(contractFees(contractDoc().contract)).toEqual({});
    expect(contractTotalPaise(contractDoc().contract)).toBeNull();
    expect(contractTotalPaise(undefined)).toBeNull();
  });
});
