import {
  addressPartsSchema,
  composeAddress,
  emptyAddressParts,
  flattenAddress,
  formatPostcode,
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

describe('formatPostcode', () => {
  it('puts the UK space three from the end, wherever it was typed', () => {
    for (const typed of ['PH28AL', 'ph2 8al', 'PH2  8AL', ' PH28AL ']) {
      expect(formatPostcode(typed, 'GB')).toBe('PH2 8AL');
    }
    expect(formatPostcode('EC1A1BB', 'GB')).toBe('EC1A 1BB');
  });

  it('leaves a half-typed UK postcode alone', () => {
    // Nothing to split yet, and inserting a space would fight the typist.
    expect(formatPostcode('PH2', 'GB')).toBe('PH2');
    expect(formatPostcode('PH28', 'GB')).toBe('PH28');
  });

  it('inserts nothing anywhere else', () => {
    expect(formatPostcode('201017', 'IN')).toBe('201017');
    expect(formatPostcode('10115', 'DE')).toBe('10115');
    expect(formatPostcode('k1a 0b1', 'CA')).toBe('K1A 0B1');
  });
});

describe('flattenAddress', () => {
  it('collapses a composed address onto one line', () => {
    expect(flattenAddress(composeAddress(full))).toBe(
      'C-204, MGI Gharaunda, Raj Nagar Extension, Ghaziabad - 201017, Uttar Pradesh, India',
    );
  });

  it('does not double up the separators composeAddress already wrote', () => {
    // `composeAddress` ends its street lines with a comma; joining with ', '
    // would otherwise print 'C-204,, MGI Gharaunda'.
    expect(flattenAddress('C-204,\nGhaziabad - 201017')).toBe('C-204, Ghaziabad - 201017');
  });

  it('survives blank lines and stray whitespace', () => {
    // The studio address is free text in the settings form.
    expect(flattenAddress('  C-204,  \n\n Ghaziabad \n')).toBe('C-204, Ghaziabad');
    expect(flattenAddress('')).toBe('');
  });
});

describe('composeAddress', () => {
  it('matches the format the studio address already uses', () => {
    // STUDIO_INFO.address is the reference the document sheets were designed
    // around; a composed address has to sit in the same block without looking
    // out of place.
    expect(composeAddress({ ...full, state: '', country: '' })).toBe(
      'C-204,\nMGI Gharaunda, Raj Nagar Extension,\nGhaziabad - 201017',
    );
  });

  it('puts the state and the country on one line', () => {
    // They used to take a line each, spending two of an address block's few
    // lines on its least specific part.
    expect(composeAddress(full)).toBe(
      'C-204,\nMGI Gharaunda, Raj Nagar Extension,\nGhaziabad - 201017\nUttar Pradesh, India',
    );
  });

  it('drops the separator when only one of state/country is present', () => {
    // A stray leading or trailing comma on a printed address is exactly the
    // kind of thing nobody notices until it is on a client's invoice.
    expect(composeAddress({ ...full, country: '' })).toContain('Uttar Pradesh');
    expect(composeAddress({ ...full, country: '' })).not.toContain('Uttar Pradesh,');
    expect(composeAddress({ ...full, state: '' })).toContain('\nIndia');
    expect(composeAddress({ ...full, state: '' })).not.toContain(', India');
  });

  /**
   * A state with no street or city still has to bring its country with it —
   * the country used to be pushed by a `lines.length > 0` check that the state
   * itself satisfied.
   */
  it('keeps the country when the state is the only other part', () => {
    expect(composeAddress({ ...emptyAddressParts, state: 'Goa' })).toBe('Goa, India');
  });

  it('drops the optional street line without leaving a stray comma', () => {
    expect(composeAddress({ ...full, line2: '', state: '', country: '' })).toBe(
      'C-204,\nGhaziabad - 201017',
    );
  });

  it('handles a city with no pincode and a pincode with no city', () => {
    expect(composeAddress({ ...emptyAddressParts, city: 'Pune' })).toBe('Pune\nIndia');
    expect(composeAddress({ ...emptyAddressParts, pincode: '411001' })).toBe('411001\nIndia');
  });

  // The hyphen between town and postcode is India's own convention. 'Rouse
  // Hill - 2155' is not how an Australian writes their address, and this line
  // prints on an export invoice.
  it('separates town and postcode the way the country writes it', () => {
    expect(composeAddress({ ...full, country: 'AU', city: 'Rouse Hill', pincode: '2155' })).toContain(
      'Rouse Hill 2155',
    );
    expect(composeAddress({ ...full, country: 'GB', city: 'Windermere', pincode: 'LA23 1AB' })).toContain(
      'Windermere LA23 1AB',
    );
    // Blank reads as India, which is what an untouched record means.
    expect(composeAddress({ ...full, country: '' })).toContain('Ghaziabad - 201017');
  });

  it('prints the full country name, not the ISO code', () => {
    // An invoice line reading 'AU' is not an address.
    expect(composeAddress({ ...full, country: 'AU' })).toContain('Australia');
    expect(composeAddress({ ...full, country: 'us' })).toContain('United States');
    expect(composeAddress({ ...full, country: 'IN' })).toContain('India');
  });

  it('falls back to the raw code for an unlisted country', () => {
    // Better a code on the document than the country silently vanishing.
    expect(composeAddress({ ...full, country: 'ZZ' })).toContain('ZZ');
  });

  it('returns an empty string when there is nothing to compose', () => {
    // `country` defaults to 'IN' on an untouched form, so this also guards
    // against a blank address composing to the single word "India".
    expect(composeAddress(emptyAddressParts)).toBe('');
  });

  it('trims stray whitespace rather than baking it into a document', () => {
    expect(composeAddress({ ...emptyAddressParts, line1: '  C-204  ', city: ' Pune ' })).toBe(
      'C-204,\nPune\nIndia',
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
