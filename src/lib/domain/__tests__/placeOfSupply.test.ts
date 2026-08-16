import {
  PLACE_OF_SUPPLY_EXPORT,
  isIntraState,
  placeOfSupplyOf,
  zeroRatingLabel,
} from '../placeOfSupply';

const UP = { state: 'Uttar Pradesh', country: 'IN' };

describe('placeOfSupplyOf', () => {
  it('takes a registered client’s state from their GSTIN', () => {
    const result = placeOfSupplyOf({ gstin: '09AABCQ2864Q1ZQ', addressParts: UP });
    expect(result).toMatchObject({ code: '09', source: 'gstin' });
  });

  it('derives Tamil Nadu for a Tamil Nadu client — the bug this replaces', () => {
    // The operator no longer gets to pick. A client registered in Tamil Nadu
    // has place of supply 33, and nothing about the studio's own state or the
    // last document edited can change that.
    expect(placeOfSupplyOf({ gstin: '33AABCQ2864Q1ZZ' }).code).toBe('33');
  });

  it('ignores a separate billing address, which is where the invoice is posted', () => {
    // A client registered in Karnataka whose accounts department sits in
    // Maharashtra is still a Karnataka supply: place of supply follows the
    // recipient's registration, not the envelope. `placeOfSupplyOf` is given
    // the registration facts and nothing else, and that signature is the
    // guard — the billing address has no way in.
    const result = placeOfSupplyOf({
      gstin: '29AABCQ2864Q1Z2',
      addressParts: { state: 'Karnataka', country: 'IN' },
    });
    expect(result.code).toBe('29');
  });

  it('falls back to the address state when the client is unregistered', () => {
    const result = placeOfSupplyOf({ addressParts: { state: 'Karnataka', country: 'IN' } });
    expect(result).toMatchObject({ code: '29', source: 'address' });
  });

  it('prefers the GSTIN over the address', () => {
    const result = placeOfSupplyOf({
      gstin: '33AABCQ2864Q1ZZ',
      addressParts: { state: 'Uttar Pradesh', country: 'IN' },
    });
    expect(result.source).toBe('gstin');
    expect(result.code).toBe('33');
  });

  it('ignores a malformed GSTIN rather than slicing garbage off it', () => {
    const result = placeOfSupplyOf({ gstin: 'nonsense', addressParts: UP });
    expect(result).toMatchObject({ code: '09', source: 'address' });
  });

  it('treats a recipient outside India as an export', () => {
    const result = placeOfSupplyOf({ addressParts: { state: 'Dubai', country: 'AE' } });
    expect(result).toMatchObject({ code: PLACE_OF_SUPPLY_EXPORT, source: 'export' });
  });

  it('defaults a missing country to India', () => {
    expect(placeOfSupplyOf({ addressParts: { state: 'Kerala' } }).code).toBe('32');
  });

  it('returns null rather than guessing when nothing establishes a state', () => {
    const result = placeOfSupplyOf({ addressParts: { state: '', country: 'IN' } });
    expect(result).toMatchObject({ code: null, source: 'unknown' });
  });

  it('always explains itself', () => {
    for (const client of [
      { gstin: '09AABCQ2864Q1ZQ' },
      { addressParts: UP },
      { addressParts: { country: 'AE' } },
      {},
    ]) {
      expect(placeOfSupplyOf(client).reason).toEqual(expect.any(String));
      expect(placeOfSupplyOf(client).reason.length).toBeGreaterThan(0);
    }
  });
});

describe('isIntraState', () => {
  it('is true only when the codes match', () => {
    expect(isIntraState('09', '09')).toBe(true);
    expect(isIntraState('33', '09')).toBe(false);
  });

  it('is false for an unknown place — not silently inter-state', () => {
    expect(isIntraState(null, '09')).toBe(false);
    expect(isIntraState(undefined, '09')).toBe(false);
  });
});

describe('zeroRatingLabel', () => {
  it('names the export case', () => {
    expect(zeroRatingLabel({ addressParts: { country: 'AE' } })).toMatch(/Export of services under LUT/);
  });

  it('names the SEZ case', () => {
    expect(zeroRatingLabel({ addressParts: { country: 'IN' }, sez: true })).toMatch(/SEZ unit under LUT/);
  });

  it('says nothing for an ordinary domestic client', () => {
    expect(zeroRatingLabel({ addressParts: { country: 'IN' } })).toBeNull();
    expect(zeroRatingLabel({})).toBeNull();
  });
});
