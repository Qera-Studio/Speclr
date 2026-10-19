import { creditNoteDeadline, creditNoteIsLate } from '../creditNoteDeadline';

describe('creditNoteDeadline (CGST s.34(2))', () => {
  it('is 30 November after the invoice financial year ends', () => {
    expect(creditNoteDeadline('2026-06-10')).toBe('2027-11-30');
    // January to March belong to the year that began the April before.
    expect(creditNoteDeadline('2027-02-01')).toBe('2027-11-30');
    expect(creditNoteDeadline('2027-04-01')).toBe('2028-11-30');
  });

  it('is late only after that day', () => {
    expect(creditNoteIsLate('2026-06-10', '2027-11-30')).toBe(false);
    expect(creditNoteIsLate('2026-06-10', '2027-12-01')).toBe(true);
    expect(creditNoteIsLate('', '2027-12-01')).toBe(false);
  });
});
