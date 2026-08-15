import {
  CIN_RE,
  GSTIN_RE,
  PAN_RE,
  TAN_RE,
  cinError,
  cinStateHint,
  gstinCheckCharacter,
  gstinError,
  gstinPan,
  gstinStateCode,
  panHolderTypeError,
  panKindOfEntityType,
  panSurnameMismatch,
  tanError,
} from '../india';

/**
 * Qera's own GSTIN. Using a real one as the fixture is the point: a checksum
 * implementation that only passes numbers it generated itself proves nothing.
 */
const QERA_GSTIN = '09AABCQ2864Q1ZQ';

describe('GSTIN', () => {
  it('accepts a real GSTIN', () => {
    expect(GSTIN_RE.test(QERA_GSTIN)).toBe(true);
    expect(gstinError(QERA_GSTIN)).toBeNull();
  });

  it('computes the published check character', () => {
    expect(gstinCheckCharacter(QERA_GSTIN.slice(0, 14))).toBe('Q');
  });

  it('catches a transposition the regex accepts', () => {
    // 'AABCQ' → 'AACBQ': still a valid shape, wrong number.
    const transposed = '09AACBQ2864Q1ZQ';
    expect(GSTIN_RE.test(transposed)).toBe(true);
    expect(gstinError(transposed)).toMatch(/check character/i);
  });

  it('rejects a state code that is not a GST state', () => {
    expect(gstinError('25AABCQ2864Q1ZQ')).toMatch(/not a GST state code/i);
  });

  it('rejects a GSTIN whose state disagrees with the address', () => {
    // A Tamil Nadu GSTIN on a client whose address says Uttar Pradesh — the
    // exact shape of the bug this whole derivation exists to prevent.
    const tamilNadu = `33${QERA_GSTIN.slice(2)}`;
    const withGoodChecksum = tamilNadu.slice(0, 14) + gstinCheckCharacter(tamilNadu.slice(0, 14));
    expect(gstinError(withGoodChecksum, { addressState: 'Uttar Pradesh' })).toMatch(
      /registered in Tamil Nadu, but the address says Uttar Pradesh/i,
    );
  });

  it('matches the address state through spelling differences', () => {
    // India Post returns 'Jammu and Kashmir'; GST_STATES says 'Jammu & Kashmir'.
    const jk = `01${QERA_GSTIN.slice(2, 14)}`;
    const valid = jk + gstinCheckCharacter(jk);
    expect(gstinError(valid, { addressState: 'Jammu and Kashmir' })).toBeNull();
  });

  it('rejects a GSTIN whose embedded PAN is not the record’s PAN', () => {
    expect(gstinError(QERA_GSTIN, { pan: 'AAAAA1111A' })).toMatch(/is not the PAN on this record/i);
    expect(gstinError(QERA_GSTIN, { pan: 'AABCQ2864Q' })).toBeNull();
  });

  it('rejects the wrong shape outright', () => {
    expect(gstinError('09AABCQ2864Q1Z')).toMatch(/15-character/i);
    expect(gstinError('hello')).toMatch(/15-character/i);
  });

  it('treats an empty value as absent, not invalid', () => {
    expect(gstinError('')).toBeNull();
    expect(gstinError('   ')).toBeNull();
  });

  it('exposes the state code and embedded PAN', () => {
    expect(gstinStateCode(QERA_GSTIN)).toBe('09');
    expect(gstinPan(QERA_GSTIN)).toBe('AABCQ2864Q');
  });
});

describe('PAN', () => {
  it('keeps the employee meaning by default', () => {
    expect(PAN_RE.test('ABCPE1234F')).toBe(true);
    expect(panHolderTypeError('ABCPE1234F')).toBeNull();
    expect(panHolderTypeError('ABCCE1234F')).toMatch(/a company, not an individual/i);
  });

  it('accepts a company PAN when a company is what is expected', () => {
    expect(panHolderTypeError('AABCQ2864Q', ['C'])).toBeNull();
    expect(panHolderTypeError('AABPQ2864Q', ['C'])).toMatch(/an individual, not a company/i);
  });

  it('refuses an unrecognisable holder type whatever is expected', () => {
    expect(panHolderTypeError('AABXQ2864Q', ['C', 'F'])).toMatch(/not a recognisable PAN/i);
  });

  it('maps an entity type to its PAN kind', () => {
    expect(panKindOfEntityType('pvt_ltd')).toBe('C');
    expect(panKindOfEntityType('llp')).toBe('F');
    expect(panKindOfEntityType('proprietorship')).toBe('P');
    expect(panKindOfEntityType('llc')).toBeNull();
    expect(panKindOfEntityType(undefined)).toBeNull();
  });

  it('flags a surname mismatch as a hint only', () => {
    expect(panSurnameMismatch('ABCPP1234F', 'Shivanshu Pareek')).toBe(false);
    expect(panSurnameMismatch('ABCPZ1234F', 'Shivanshu Pareek')).toBe(true);
    expect(panSurnameMismatch('ABCPZ1234F', 'Shivanshu')).toBe(false);
  });
});

describe('TAN', () => {
  it('accepts a well-formed TAN', () => {
    expect(TAN_RE.test('DELQ12345F')).toBe(true);
    expect(tanError('DELQ12345F')).toBeNull();
  });

  it('rejects the wrong shape', () => {
    expect(tanError('DEL12345F')).toMatch(/Expected a TAN/i);
  });

  it('treats an empty value as absent', () => {
    expect(tanError('')).toBeNull();
  });
});

describe('CIN', () => {
  it('accepts Qera’s own CIN', () => {
    // The 'UW' registrar pair is why the state check is a hint, not a block.
    expect(CIN_RE.test('U62099UW2026PTC254312')).toBe(true);
    expect(cinError('U62099UW2026PTC254312')).toBeNull();
  });

  it('rejects an unknown ownership code', () => {
    expect(cinError('U62099UP2026XXX254312')).toMatch(/not an MCA ownership code/i);
  });

  it('rejects an implausible year', () => {
    expect(cinError('U62099UP9999PTC254312')).toMatch(/not a plausible year/i);
  });

  it('rejects the wrong shape', () => {
    expect(cinError('U62099UP2026PTC25431')).toMatch(/21-character/i);
  });

  it('hints at a registrar mismatch without blocking', () => {
    expect(cinStateHint('U62099TN2026PTC254312', 'Uttar Pradesh')).toMatch(/TN registrar, not UP/i);
    expect(cinStateHint('U62099UP2026PTC254312', 'Uttar Pradesh')).toBeNull();
    expect(cinStateHint('U62099UP2026PTC254312', undefined)).toBeNull();
  });
});
