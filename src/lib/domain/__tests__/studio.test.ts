import { STUDIO_INFO, studioInputSchema, studioOf, type StudioInfo } from '../studio';

const validInput = {
  brandMark: 'qera studio',
  legalName: 'Qera Private Limited',
  address: 'C-204,\nGhaziabad - 201017\nIndia',
  phone: '+91 72001 24605',
  email: 'sales@qera.studio',
  thanksLine: 'Thank you for partnering with Qera Studio',
  gstin: '09AABCQ2864Q1ZQ',
  cin: 'U62099UW2026PTC254312',
  queryEmailHr: 'admin@qera.studio',
  stateCode: '09',
  bank: {
    bankName: 'Kotak Mahindra Bank',
    accountNo: '4056067000',
    ifsc: 'KKBK0000677',
    upiId: 'qera.studio@kotak',
  },
};

describe('studioOf', () => {
  it('prefers the document’s own frozen snapshot', () => {
    const snapshot: StudioInfo = { ...STUDIO_INFO, address: 'Old office\nIndia' };

    // The whole point of snapshotting: an issued document keeps the supplier
    // address it carried at issue, whatever the settings say now.
    expect(studioOf({ studioSnapshot: snapshot }).address).toBe('Old office\nIndia');
  });

  it('falls back to the constant for a document with no snapshot', () => {
    // Documents issued before snapshots existed printed exactly this, so the
    // fallback must not change what they show.
    expect(studioOf({})).toBe(STUDIO_INFO);
  });
});

describe('studioInputSchema', () => {
  it('accepts the studio’s own details', () => {
    expect(studioInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('requires every identity field', () => {
    // These print on a tax invoice. A blank GSTIN or legal name would produce a
    // legally incomplete document with no visible sign anything was wrong.
    for (const key of ['legalName', 'brandMark', 'address', 'gstin', 'cin', 'phone'] as const) {
      expect(studioInputSchema.safeParse({ ...validInput, [key]: '' }).success).toBe(false);
    }
  });

  it('requires every bank field', () => {
    for (const key of ['bankName', 'accountNo', 'ifsc', 'upiId'] as const) {
      const bank = { ...validInput.bank, [key]: '' };
      expect(studioInputSchema.safeParse({ ...validInput, bank }).success).toBe(false);
    }
  });

  it('rejects a state code that is not two digits', () => {
    // The code decides CGST+SGST vs IGST, so a malformed one would silently
    // mis-split the tax on every invoice.
    for (const stateCode of ['9', 'UP', '099', '']) {
      expect(studioInputSchema.safeParse({ ...validInput, stateCode }).success).toBe(false);
    }
  });

  it('does not accept a submitted stateName', () => {
    const parsed = studioInputSchema.parse({ ...validInput, stateName: 'Kerala' });

    // Derived server-side from the code, never taken from the client — the two
    // must not be able to disagree.
    expect(parsed).not.toHaveProperty('stateName');
  });

  it('rejects a malformed email', () => {
    expect(studioInputSchema.safeParse({ ...validInput, email: 'nope' }).success).toBe(false);
    expect(studioInputSchema.safeParse({ ...validInput, queryEmailHr: 'nope' }).success).toBe(false);
  });
});
