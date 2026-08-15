import { TAX_ID_TYPES, taxIdError, taxIdType, taxIdTypeForCountry } from '../foreign';

describe('taxIdTypeForCountry', () => {
  it('picks the identifier a country actually issues', () => {
    expect(taxIdTypeForCountry('AE')).toBe('AE_TRN');
    expect(taxIdTypeForCountry('gb')).toBe('GB_VAT');
    expect(taxIdTypeForCountry('DE')).toBe('EU_VAT');
    expect(taxIdTypeForCountry('US')).toBe('US_EIN');
    expect(taxIdTypeForCountry('AU')).toBe('AU_ABN');
  });

  it('falls back to OTHER rather than guessing', () => {
    expect(taxIdTypeForCountry('BR')).toBe('OTHER');
    expect(taxIdTypeForCountry(undefined)).toBe('OTHER');
  });
});

describe('taxIdError', () => {
  it('treats an empty value as absent', () => {
    expect(taxIdError('AE_TRN', '')).toBeNull();
  });

  it('needs a type before it can judge a value', () => {
    expect(taxIdError(undefined, '100123456700003')).toMatch(/which kind of registration/i);
  });

  describe('UAE TRN', () => {
    it('accepts 15 digits', () => {
      expect(taxIdError('AE_TRN', '100123456700003')).toBeNull();
    });
    it('rejects anything else', () => {
      expect(taxIdError('AE_TRN', '10012345670000')).toMatch(/Expected TRN/i);
    });
  });

  describe('UK VAT (mod-97)', () => {
    it('accepts a number that satisfies the check', () => {
      expect(taxIdError('GB_VAT', 'GB123456782')).toBeNull();
    });
    it('rejects one that does not', () => {
      expect(taxIdError('GB_VAT', 'GB123456789')).toMatch(/check digit/i);
    });
    it('tolerates the missing GB prefix and spacing', () => {
      expect(taxIdError('GB_VAT', '123 456 782')).toBeNull();
    });
  });

  describe('Australian ABN (mod-89)', () => {
    it('accepts a real ABN', () => {
      // The ATO's own published example.
      expect(taxIdError('AU_ABN', '51824753556')).toBeNull();
    });
    it('rejects a mistyped one', () => {
      expect(taxIdError('AU_ABN', '51824753557')).toMatch(/check digit/i);
    });
    it('tolerates the usual spacing', () => {
      expect(taxIdError('AU_ABN', '51 824 753 556')).toBeNull();
    });
  });

  describe('US EIN', () => {
    it('accepts a valid campus prefix, with or without the dash', () => {
      expect(taxIdError('US_EIN', '12-3456789')).toBeNull();
      expect(taxIdError('US_EIN', '123456789')).toBeNull();
    });
    it('rejects a prefix the IRS does not issue', () => {
      expect(taxIdError('US_EIN', '19-3456789')).toMatch(/check digit/i);
    });
  });

  describe('OTHER', () => {
    it('accepts free text rather than inventing a rule', () => {
      expect(taxIdError('OTHER', 'CNPJ 12.345.678/0001-95')).toBeNull();
    });
    it('still caps the length', () => {
      expect(taxIdError('OTHER', 'x'.repeat(41))).toMatch(/Expected Other registration/i);
    });
  });
});

describe('the table itself', () => {
  it('has unique codes', () => {
    const codes = TAX_ID_TYPES.map((t) => t.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('gives every type a placeholder that passes its own regex', () => {
    for (const spec of TAX_ID_TYPES) {
      if (spec.code === 'OTHER') continue;
      const normalised = spec.placeholder.toUpperCase().replace(/[\s-]/g, '');
      expect(taxIdType(spec.code)?.re.test(normalised)).toBe(true);
    }
  });
});
