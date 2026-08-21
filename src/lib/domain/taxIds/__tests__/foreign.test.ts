import {
  TAX_ID_TYPES,
  taxIdError,
  taxIdType,
  taxIdTypeForCountry,
  taxIdTypesForCountry,
} from '../foreign';

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

describe('taxIdTypesForCountry', () => {
  it('offers the country’s own type, then the fallback', () => {
    expect(taxIdTypesForCountry('AU').map((t) => t.code)).toEqual(['AU_ABN', 'OTHER']);
    expect(taxIdTypesForCountry('GB').map((t) => t.code)).toEqual(['GB_VAT', 'OTHER']);
  });

  // A half-listed union is a client in Greece being offered nothing but
  // "Other" for a number the EU issues in one documented format.
  it('covers every member state of the EU', () => {
    for (const iso2 of ['GR', 'CZ', 'RO', 'BG', 'HR', 'HU', 'SK', 'SI', 'LT', 'LV', 'EE', 'LU', 'MT', 'CY']) {
      expect(taxIdTypesForCountry(iso2).map((t) => t.code)).toContain('EU_VAT');
    }
  });

  it('falls back to the honest option for a country nobody has billed', () => {
    expect(taxIdTypesForCountry('BR').map((t) => t.code)).toEqual(['OTHER']);
    expect(taxIdTypesForCountry(undefined).map((t) => t.code)).toEqual(['OTHER']);
  });
});

/**
 * A field types the way the value is written (`AGENTS.md`, input rules). The
 * two properties that matter are that the format is **idempotent** (it runs on
 * every keystroke against a value it has already formatted) and that
 * `taxIdError` bares the value before checking, so a formatted number and a
 * pasted bare one are the same number.
 */
describe('taxIdType formats', () => {
  const format = (code: string, value: string) => taxIdType(code)!.format!(value);

  it('writes an EIN the way the IRS letter does', () => {
    expect(format('US_EIN', '830000000')).toBe('83-0000000');
    expect(format('US_EIN', '83')).toBe('83');
    expect(format('US_EIN', '8')).toBe('8');
  });

  it("writes an ABN in the ATO's 2-3-3-3", () => {
    expect(format('AU_ABN', '51824000370')).toBe('51 824 000 370');
  });

  it('groups a UK VAT number 3-4-2, keeping a typed GB prefix and never adding one', () => {
    expect(format('GB_VAT', '123400037')).toBe('123 4000 37');
    expect(format('GB_VAT', 'GB123400037')).toBe('GB 123 4000 37');
  });

  it('is idempotent, because it runs against its own output on every keystroke', () => {
    for (const [code, raw] of [
      ['US_EIN', '830000000'],
      ['AU_ABN', '51824000370'],
      ['GB_VAT', 'GB123400037'],
    ] as const) {
      const once = format(code, raw);
      expect(format(code, once)).toBe(once);
    }
  });

  it('leaves a formatted value valid, since the checks bare it first', () => {
    expect(taxIdError('US_EIN', format('US_EIN', '830000000'))).toBeNull();
    expect(taxIdError('AU_ABN', format('AU_ABN', '51824000370'))).toBeNull();
    expect(taxIdError('GB_VAT', format('GB_VAT', 'GB123400037'))).toBeNull();
  });

  /**
   * Sparse on purpose. Inventing a grouping is the same mistake as inventing a
   * check digit, and EU VAT would be wrong in 26 of 27 member states.
   */
  it('gives no format to the identifiers with no published grouping', () => {
    for (const code of ['AE_TRN', 'EU_VAT', 'SG_UEN', 'CA_BN', 'OTHER']) {
      expect(taxIdType(code)!.format).toBeUndefined();
    }
  });
});
