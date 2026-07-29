import {
  addressPartsSchema,
  composeAddress,
  emptyAddressParts,
  isEmptyAddressParts,
  isIndianPincode,
  type AddressParts,
} from '../address';

const full: AddressParts = {
  line1: 'C-204',
  line2: 'MGI Gharaunda, Raj Nagar Extension',
  city: 'Ghaziabad',
  state: 'Uttar Pradesh',
  pincode: '201017',
  country: 'IN',
};

describe('composeAddress', () => {
  it('matches the format the studio address already uses', () => {
    // STUDIO_INFO.address is the reference the document sheets were designed
    // around; a composed address has to sit in the same block without looking
    // out of place.
    expect(composeAddress({ ...full, state: '' })).toBe(
      'C-204,\nMGI Gharaunda, Raj Nagar Extension,\nGhaziabad - 201017',
    );
  });

  it('includes the state when given', () => {
    expect(composeAddress(full)).toBe(
      'C-204,\nMGI Gharaunda, Raj Nagar Extension,\nGhaziabad - 201017\nUttar Pradesh',
    );
  });

  it('drops the optional street line without leaving a stray comma', () => {
    expect(composeAddress({ ...full, line2: '', state: '' })).toBe(
      'C-204,\nGhaziabad - 201017',
    );
  });

  it('handles a city with no pincode and a pincode with no city', () => {
    expect(composeAddress({ ...emptyAddressParts, city: 'Pune' })).toBe('Pune');
    expect(composeAddress({ ...emptyAddressParts, pincode: '411001' })).toBe('411001');
  });

  it('prints the country only when it is not India', () => {
    expect(composeAddress({ ...full, country: 'IN' })).not.toContain('IN');
    expect(composeAddress({ ...full, country: 'us' })).toContain('US');
  });

  it('returns an empty string when there is nothing to compose', () => {
    expect(composeAddress(emptyAddressParts)).toBe('');
  });

  it('trims stray whitespace rather than baking it into a document', () => {
    expect(composeAddress({ ...emptyAddressParts, line1: '  C-204  ', city: ' Pune ' })).toBe(
      'C-204,\nPune',
    );
  });
});

describe('isEmptyAddressParts', () => {
  it('treats undefined and blank parts as empty', () => {
    expect(isEmptyAddressParts(undefined)).toBe(true);
    expect(isEmptyAddressParts(emptyAddressParts)).toBe(true);
  });

  it('is false as soon as any part carries content', () => {
    expect(isEmptyAddressParts({ ...emptyAddressParts, city: 'Pune' })).toBe(false);
  });
});

describe('isIndianPincode', () => {
  it('accepts exactly six digits', () => {
    expect(isIndianPincode('201017')).toBe(true);
    expect(isIndianPincode(' 411001 ')).toBe(true);
  });

  it('rejects anything else', () => {
    for (const bad of ['', '20101', '2010177', 'ABC123', '20-1017']) {
      expect(isIndianPincode(bad)).toBe(false);
    }
  });
});

describe('addressPartsSchema', () => {
  it('never blocks a save on a half-filled address', () => {
    // Structured parts are additive metadata. The flat `address` string carries
    // the real requirement, so blank parts must parse cleanly.
    const parsed = addressPartsSchema.safeParse({
      ...emptyAddressParts,
      city: 'Pune',
    });
    expect(parsed.success).toBe(true);
  });

  it('has matching input and output types so RHF resolvers stay happy', () => {
    // A zod `.default()` would make these diverge and break the form resolver.
    const parsed = addressPartsSchema.parse(emptyAddressParts);
    expect(parsed).toEqual(emptyAddressParts);
  });

  it('accepts a fully specified address', () => {
    expect(addressPartsSchema.safeParse(full).success).toBe(true);
  });

  it('rejects absurdly long values', () => {
    expect(addressPartsSchema.safeParse({ line1: 'x'.repeat(500) }).success).toBe(false);
  });
});
