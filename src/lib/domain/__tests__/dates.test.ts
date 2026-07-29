import {
  financialYearCode,
  financialYearCodeOfISODate,
  financialYearStart,
  formatDisplayDate,
  isISODate,
  isoToLocalDate,
  localDateToISO,
  todayISO,
  yearOfISODate,
} from '../dates';

describe('isoToLocalDate / localDateToISO', () => {
  it('round-trips an ISO date unchanged', () => {
    for (const iso of ['2026-07-21', '2026-01-01', '2026-12-31', '2024-02-29']) {
      const date = isoToLocalDate(iso);
      expect(date).not.toBeNull();
      expect(localDateToISO(date as Date)).toBe(iso);
    }
  });

  it('builds a local-midnight date, not a UTC one', () => {
    // The bug this guards: `new Date('2026-07-21')` is UTC midnight, which is
    // 20 Jul anywhere west of Greenwich. A shifted issueDate can move a
    // document into the wrong financial year and mis-number it.
    const date = isoToLocalDate('2026-07-21') as Date;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6); // July, zero-indexed
    expect(date.getDate()).toBe(21);
    expect(date.getHours()).toBe(0);
  });

  it('preserves the financial year across a round-trip on FY boundaries', () => {
    // 31 Mar and 1 Apr sit on either side of the FY boundary — an off-by-one
    // day here changes the document number's year code.
    for (const iso of ['2026-03-31', '2026-04-01']) {
      const back = localDateToISO(isoToLocalDate(iso) as Date);
      expect(financialYearCodeOfISODate(back)).toBe(financialYearCodeOfISODate(iso));
    }
    expect(financialYearCodeOfISODate('2026-03-31')).toBe('2526');
    expect(financialYearCodeOfISODate('2026-04-01')).toBe('2627');
  });

  it('returns null for empty, malformed, and impossible dates', () => {
    for (const bad of ['', '21-07-2026', '2026-7-21', 'nonsense', '2026-02-31', '2026-13-01']) {
      expect(isoToLocalDate(bad)).toBeNull();
    }
  });
});

describe('isISODate', () => {
  it('accepts valid ISO dates', () => {
    expect(isISODate('2026-07-21')).toBe(true);
    expect(isISODate('2026-01-01')).toBe(true);
  });

  it('rejects malformed strings', () => {
    expect(isISODate('21-07-2026')).toBe(false);
    expect(isISODate('2026-7-21')).toBe(false);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('2026-00-10')).toBe(false);
    expect(isISODate('2026-01-32')).toBe(false);
    expect(isISODate('')).toBe(false);
  });
});

describe('todayISO', () => {
  it('returns a valid ISO date for the local calendar day', () => {
    const value = todayISO();
    expect(isISODate(value)).toBe(true);
    expect(Number(value.slice(0, 4))).toBe(new Date().getFullYear());
  });
});

describe('formatDisplayDate', () => {
  it("formats '2026-07-21' as '21 Jul 2026'", () => {
    expect(formatDisplayDate('2026-07-21')).toBe('21 Jul 2026');
  });

  it('drops the leading zero on single-digit days', () => {
    expect(formatDisplayDate('2026-01-05')).toBe('5 Jan 2026');
  });

  it('throws on malformed input', () => {
    expect(() => formatDisplayDate('21/07/2026')).toThrow();
  });
});

describe('yearOfISODate', () => {
  it('extracts the year', () => {
    expect(yearOfISODate('2026-07-21')).toBe(2026);
  });

  it('throws on malformed input', () => {
    expect(() => yearOfISODate('not-a-date')).toThrow();
  });
});

describe('financialYearStart', () => {
  it('maps April–December to the same calendar year', () => {
    expect(financialYearStart('2026-04-01')).toBe(2026);
    expect(financialYearStart('2026-07-21')).toBe(2026);
    expect(financialYearStart('2026-12-31')).toBe(2026);
  });

  it('maps January–March to the previous calendar year', () => {
    expect(financialYearStart('2026-01-01')).toBe(2025);
    expect(financialYearStart('2026-03-31')).toBe(2025);
  });

  it('throws on malformed input', () => {
    expect(() => financialYearStart('nope')).toThrow();
  });
});

describe('financialYearCode', () => {
  it('builds the compact FY code from the start year', () => {
    expect(financialYearCode(2025)).toBe('2526');
    expect(financialYearCode(2026)).toBe('2627');
    expect(financialYearCode(2099)).toBe('9900');
  });

  it('throws on an invalid start year', () => {
    expect(() => financialYearCode(1999)).toThrow();
  });
});

describe('financialYearCodeOfISODate', () => {
  it('combines FY detection and code formatting', () => {
    expect(financialYearCodeOfISODate('2026-05-01')).toBe('2627');
    expect(financialYearCodeOfISODate('2026-02-01')).toBe('2526');
    expect(financialYearCodeOfISODate('2026-03-31')).toBe('2526');
    expect(financialYearCodeOfISODate('2026-04-01')).toBe('2627');
  });
});
