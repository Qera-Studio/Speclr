import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  countryByIso2,
  formatPhoneForDisplay,
  isValidPhone,
  maxNationalDigits,
  parsePhone,
  phoneHintFor,
  toE164,
} from '../phone';

describe('COUNTRIES', () => {
  it('defaults to India and lists it first', () => {
    expect(DEFAULT_COUNTRY).toBe('IN');
    expect(COUNTRIES[0].iso2).toBe('IN');
    expect(COUNTRIES[0].dialCode).toBe('91');
  });

  it('resolves the dial code for every listed country', () => {
    for (const country of COUNTRIES) {
      expect(country.dialCode).toMatch(/^\d+$/);
      expect(country.name).not.toHaveLength(0);
    }
  });

  it('looks a country up by code', () => {
    expect(countryByIso2('GB')?.dialCode).toBe('44');
    expect(countryByIso2('ZZ')).toBeUndefined();
  });
});

describe('isValidPhone — India', () => {
  it('requires exactly 10 digits starting 6-9', () => {
    for (const good of ['9876543210', '6123456789', '7000000000', '8888888888']) {
      expect(isValidPhone(good, 'IN')).toBe(true);
    }
  });

  it('rejects the wrong length', () => {
    for (const bad of ['987654321', '98765432101', '9', '']) {
      expect(isValidPhone(bad, 'IN')).toBe(false);
    }
  });

  it('rejects non-mobile leading digits', () => {
    // libphonenumber alone accepts some of these because India's numbering
    // plan allocates them, but every number entered here is a mobile.
    for (const bad of ['1234567210', '5000000000', '0123456789']) {
      expect(isValidPhone(bad, 'IN')).toBe(false);
    }
  });

  it('ignores spaces and punctuation the user types', () => {
    expect(isValidPhone('98765 43210', 'IN')).toBe(true);
    expect(isValidPhone('98765-43210', 'IN')).toBe(true);
  });
});

describe('isValidPhone — other countries', () => {
  it('validates per country, not with one global rule', () => {
    expect(isValidPhone('2015550123', 'US')).toBe(true);
    expect(isValidPhone('7911123456', 'GB')).toBe(true);
    // A 10-digit Indian mobile is not a valid UK number.
    expect(isValidPhone('9876543210', 'GB')).toBe(false);
  });
});

describe('toE164', () => {
  it('produces the stored form', () => {
    expect(toE164('9876543210', 'IN')).toBe('+919876543210');
    expect(toE164('98765 43210', 'IN')).toBe('+919876543210');
    expect(toE164('2015550123', 'US')).toBe('+12015550123');
  });

  it('returns null rather than storing an invalid number', () => {
    expect(toE164('123', 'IN')).toBeNull();
    expect(toE164('1234567210', 'IN')).toBeNull();
    expect(toE164('', 'IN')).toBeNull();
  });
});

describe('parsePhone', () => {
  it('round-trips a stored E.164 value', () => {
    expect(parsePhone('+919876543210')).toEqual({ iso2: 'IN', national: '9876543210' });
    expect(parsePhone('+12015550123')).toEqual({ iso2: 'US', national: '2015550123' });
  });

  it('keeps legacy junk editable instead of throwing', () => {
    // Existing records predate this field's structure — fixtures literally
    // contain phone: '9'. A legacy value must load into the form so it can be
    // corrected in place, never crash it.
    expect(parsePhone('9')).toEqual({ iso2: 'IN', national: '9' });
    expect(parsePhone('not a number')).toEqual({ iso2: 'IN', national: '' });
    expect(parsePhone('')).toEqual({ iso2: 'IN', national: '' });
  });

  it('assumes India for a bare 10-digit number', () => {
    expect(parsePhone('9876543210')).toEqual({ iso2: 'IN', national: '9876543210' });
  });
});

describe('formatPhoneForDisplay', () => {
  it('spaces a valid number for reading', () => {
    expect(formatPhoneForDisplay('+919876543210')).toBe('+91 98765 43210');
  });

  it('passes anything it cannot parse straight through', () => {
    expect(formatPhoneForDisplay('9')).toBe('9');
    expect(formatPhoneForDisplay('')).toBe('');
  });
});

/**
 * The cap that stops an 11th digit being typed into an Indian number. It is an
 * upper bound, not a validity test — `isValidPhone` still decides that — so
 * what matters is that it never cuts a number that could have been valid.
 */
describe('maxNationalDigits', () => {
  it('is exactly the Indian mobile length', () => {
    expect(maxNationalDigits('IN')).toBe(10);
  });

  it("never cuts short a country's own valid number", () => {
    // E.164 allows 15 digits including the country code, so the national part
    // can be at most 15 minus that code — one digit fewer for +91 than for +1.
    expect(maxNationalDigits('US')).toBe(14);
    expect(maxNationalDigits('GB')).toBe(13);
  });

  it('leaves room for every real number in the list', () => {
    for (const country of COUNTRIES) {
      expect(maxNationalDigits(country.iso2)).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('phoneHintFor', () => {
  it('states the Indian rule explicitly', () => {
    expect(phoneHintFor('IN')).toMatch(/10-digit/);
  });

  it('names the country for everywhere else', () => {
    expect(phoneHintFor('GB')).toMatch(/United Kingdom/);
  });
});
