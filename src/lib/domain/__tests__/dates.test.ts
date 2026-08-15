import {
  addDays,
  financialYearCode,
  financialYearCodeOfISODate,
  financialYearStart,
  firstDayOfMonth,
  formatDisplayDate,
  formatDisplayMonth,
  isISODate,
  isISOMonth,
  isoToLocalDate,
  lastDayOfMonth,
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

/**
 * Month helpers, added for the stipend slip's month picker and its derived
 * period defaults.
 */
describe('month helpers', () => {
  it('recognises a YYYY-MM month', () => {
    expect(isISOMonth('2026-06')).toBe(true);
    expect(isISOMonth('2026-13')).toBe(false);
    expect(isISOMonth('2026-00')).toBe(false);
    expect(isISOMonth('June 2026')).toBe(false);
    expect(isISOMonth('2026-06-01')).toBe(false);
  });

  it('formats a month in full', () => {
    expect(formatDisplayMonth('2026-06')).toBe('June 2026');
    expect(formatDisplayMonth('2026-01')).toBe('January 2026');
  });

  /** Slips issued before the picker existed hold free text — print it as-is. */
  it('passes non-month text through untouched', () => {
    expect(formatDisplayMonth('May 2026')).toBe('May 2026');
    expect(formatDisplayMonth('')).toBe('');
  });

  it('derives the first and last day of a month', () => {
    expect(firstDayOfMonth('2026-06')).toBe('2026-06-01');
    expect(lastDayOfMonth('2026-06')).toBe('2026-06-30');
    expect(lastDayOfMonth('2026-07')).toBe('2026-07-31');
    expect(lastDayOfMonth('2026-02')).toBe('2026-02-28');
  });

  it('handles a leap February', () => {
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29');
    expect(lastDayOfMonth('2100-02')).toBe('2100-02-28');
  });

  it('returns null for a month it cannot parse', () => {
    expect(firstDayOfMonth('nope')).toBeNull();
    expect(lastDayOfMonth('2026-13')).toBeNull();
  });
});

/**
 * `addDays` is how an invoice's due date is derived from its issue date and the
 * client's payment terms, instead of being typed. A wrong due date on an issued
 * invoice is a real-world dispute, so the edge cases matter more than the
 * happy path.
 */
describe('addDays', () => {
  it('adds days within a month', () => {
    expect(addDays('2026-06-10', 15)).toBe('2026-06-25');
  });

  it('rolls over a month boundary', () => {
    expect(addDays('2026-06-20', 15)).toBe('2026-07-05');
  });

  it('rolls over a year boundary', () => {
    expect(addDays('2026-12-20', 30)).toBe('2027-01-19');
  });

  it('handles a leap year', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('treats zero days as the same day', () => {
    expect(addDays('2026-06-10', 0)).toBe('2026-06-10');
  });

  it('goes backwards for a negative offset', () => {
    expect(addDays('2026-06-10', -10)).toBe('2026-05-31');
  });

  /** Blank beats invented: no due date is safer than a wrong one. */
  it('returns empty rather than guessing from unparseable input', () => {
    expect(addDays('', 30)).toBe('');
    expect(addDays('2026-02-31', 30)).toBe('');
    expect(addDays('2026-06-10', Number.NaN)).toBe('');
  });
});
