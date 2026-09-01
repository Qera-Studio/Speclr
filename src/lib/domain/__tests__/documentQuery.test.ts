import {
  groupDocuments,
  matchesFilters,
  partyFieldLabel,
  sortDocuments,
  type FilterRow,
  type SortState,
} from '../documentQuery';
import type { AdminDocument } from '../types';

const line = (paise: number) => [{ description: 'Work', qty: 1, ratePaise: paise }];

function doc(over: Partial<Record<string, unknown>>): AdminDocument {
  return {
    id: 'x',
    type: 'INV',
    status: 'finalized',
    number: 'QS-INV-2627-001',
    issueDate: '2026-06-10',
    clientSnapshot: { name: 'Acme Co.' },
    lineItems: line(100000), // ₹1,000
    gstRatePercent: 0,
    // Every fixture is equally old unless a test says otherwise, so the board's
    // recency tie-break is a thing a test opts into rather than a coin toss.
    createdAt: 0,
    ...over,
  } as unknown as AdminDocument;
}

const invoice = doc({ id: 'inv', number: 'QS-INV-2627-001' });
const receipt = doc({
  id: 'rec',
  type: 'REC',
  status: 'draft',
  number: null,
  issueDate: '2026-07-20',
  clientSnapshot: { name: 'Beta Ltd.' },
  lineItems: line(500000), // ₹5,000
});
const contract = doc({
  id: 'con',
  type: 'CON',
  status: 'draft',
  number: null,
  issueDate: '2026-05-01',
  lineItems: [],
});

const row = (over: Partial<FilterRow>): FilterRow => ({
  id: 'r',
  field: 'type',
  operator: 'is',
  value: [],
  ...over,
});

describe('matchesFilters', () => {
  it('matches everything when there are no rows', () => {
    expect(matchesFilters(invoice, [])).toBe(true);
  });

  /**
   * A row is added before it is filled in. If an empty row filtered, the table
   * would blank the instant you clicked "Add filter" — before you had said
   * what you wanted.
   */
  it('treats a row with no value as no constraint', () => {
    expect(matchesFilters(invoice, [row({ field: 'type', value: [] })])).toBe(true);
    expect(matchesFilters(invoice, [row({ field: 'date', value: [''] })])).toBe(true);
  });

  it('filters by type, and inverts for "is not"', () => {
    expect(matchesFilters(invoice, [row({ field: 'type', value: ['INV'] })])).toBe(true);
    expect(matchesFilters(receipt, [row({ field: 'type', value: ['INV'] })])).toBe(false);
    expect(
      matchesFilters(receipt, [row({ field: 'type', operator: 'isNot', value: ['INV'] })]),
    ).toBe(true);
  });

  it('accepts any of several values', () => {
    const r = row({ field: 'type', value: ['INV', 'REC'] });
    expect(matchesFilters(invoice, [r])).toBe(true);
    expect(matchesFilters(receipt, [r])).toBe(true);
    expect(matchesFilters(contract, [r])).toBe(false);
  });

  it('filters by party and status', () => {
    expect(matchesFilters(invoice, [row({ field: 'party', value: ['Acme Co.'] })])).toBe(true);
    expect(matchesFilters(receipt, [row({ field: 'party', value: ['Acme Co.'] })])).toBe(false);
    expect(matchesFilters(receipt, [row({ field: 'status', value: ['draft'] })])).toBe(true);
    expect(matchesFilters(invoice, [row({ field: 'status', value: ['draft'] })])).toBe(false);
  });

  it('filters by issue date, inclusive at both ends', () => {
    const after = row({ field: 'date', operator: 'onOrAfter', value: ['2026-06-10'] });
    const before = row({ field: 'date', operator: 'onOrBefore', value: ['2026-06-10'] });
    expect(matchesFilters(invoice, [after])).toBe(true);
    expect(matchesFilters(invoice, [before])).toBe(true);
    expect(matchesFilters(contract, [after])).toBe(false);
  });

  /** Two rows are how a range is expressed — there is no "between" operator. */
  it('ANDs rows together, which is what makes a date range', () => {
    const range = [
      row({ id: 'a', field: 'date', operator: 'onOrAfter', value: ['2026-06-01'] }),
      row({ id: 'b', field: 'date', operator: 'onOrBefore', value: ['2026-06-30'] }),
    ];
    expect(matchesFilters(invoice, range)).toBe(true); // 10th June
    expect(matchesFilters(receipt, range)).toBe(false); // 20th July
    expect(matchesFilters(contract, range)).toBe(false); // 1st May
  });

  it('treats "between" as inclusive at both ends', () => {
    const june = row({
      field: 'date',
      operator: 'between',
      value: ['2026-06-10', '2026-06-30'],
    });
    expect(matchesFilters(invoice, [june])).toBe(true); // exactly the start
    expect(matchesFilters(receipt, [june])).toBe(false);

    const may = row({ field: 'date', operator: 'between', value: ['2026-05-01', '2026-05-01'] });
    expect(matchesFilters(contract, [may])).toBe(true); // exactly both ends
  });

  /**
   * Picking a range takes two clicks. If the half-filled state filtered on a
   * missing end, the table would blank between them.
   */
  it('treats a half-filled range as one-sided', () => {
    const fromOnly = row({ field: 'date', operator: 'between', value: ['2026-06-01', ''] });
    expect(matchesFilters(invoice, [fromOnly])).toBe(true);
    expect(matchesFilters(receipt, [fromOnly])).toBe(true);
    expect(matchesFilters(contract, [fromOnly])).toBe(false); // 1st May

    const toOnly = row({ field: 'date', operator: 'between', value: ['', '2026-06-30'] });
    expect(matchesFilters(invoice, [toOnly])).toBe(true);
    expect(matchesFilters(receipt, [toOnly])).toBe(false); // 20th July
  });

  it('agrees with the equivalent pair of one-sided rows', () => {
    const between = [
      row({ field: 'date', operator: 'between', value: ['2026-06-01', '2026-06-30'] }),
    ];
    const pair = [
      row({ id: 'a', field: 'date', operator: 'onOrAfter', value: ['2026-06-01'] }),
      row({ id: 'b', field: 'date', operator: 'onOrBefore', value: ['2026-06-30'] }),
    ];
    for (const d of [invoice, receipt, contract]) {
      expect(matchesFilters(d, between)).toBe(matchesFilters(d, pair));
    }
  });

  it('compares totals in integer paise', () => {
    // ₹2,000 floor keeps the ₹5,000 receipt and drops the ₹1,000 invoice.
    const atLeast = row({ field: 'total', operator: 'atLeast', value: ['2000'] });
    expect(matchesFilters(receipt, [atLeast])).toBe(true);
    expect(matchesFilters(invoice, [atLeast])).toBe(false);

    const atMost = row({ field: 'total', operator: 'atMost', value: ['2000'] });
    expect(matchesFilters(invoice, [atMost])).toBe(true);
    expect(matchesFilters(receipt, [atMost])).toBe(false);
  });

  it('ignores a half-typed amount rather than emptying the table', () => {
    expect(matchesFilters(invoice, [row({ field: 'total', value: ['12.'] })])).toBe(true);
  });

  /** A contract has no line items, so it cannot answer a question about totals. */
  it('excludes documents with no total from a total filter', () => {
    const r = row({ field: 'total', operator: 'atLeast', value: ['1'] });
    expect(matchesFilters(contract, [r])).toBe(false);
  });
});

describe('sortDocuments', () => {
  const all = [invoice, receipt, contract];
  const ids = (docs: AdminDocument[]) => docs.map((d) => d.id);
  const by = (sort: SortState) => ids(sortDocuments(all, sort));

  it('leaves the order alone when nothing is sorted', () => {
    expect(ids(sortDocuments(all, null))).toEqual(['inv', 'rec', 'con']);
  });

  it('does not mutate its input', () => {
    sortDocuments(all, { column: 'date', direction: 'asc' });
    expect(ids(all)).toEqual(['inv', 'rec', 'con']);
  });

  it('sorts by date in both directions', () => {
    expect(by({ column: 'date', direction: 'asc' })).toEqual(['con', 'inv', 'rec']);
    expect(by({ column: 'date', direction: 'desc' })).toEqual(['rec', 'inv', 'con']);
  });

  /**
   * A draft has no number and a contract no total. Sorting those as an empty
   * string would bury them ascending and float them descending — so they sink
   * either way, which is the only behaviour a reader can predict.
   */
  it('sinks documents with no value to the bottom, whichever direction', () => {
    expect(by({ column: 'number', direction: 'asc' })[0]).toBe('inv');
    expect(by({ column: 'number', direction: 'desc' })[0]).toBe('inv');
    expect(by({ column: 'total', direction: 'asc' }).at(-1)).toBe('con');
    expect(by({ column: 'total', direction: 'desc' }).at(-1)).toBe('con');
  });

  it('sorts totals numerically, not as text', () => {
    // 100000 vs 500000 paise — a string sort would still get this pair right,
    // so check the ordering that only a numeric compare produces.
    const big = doc({ id: 'big', lineItems: line(9000000) }); // ₹90,000
    const sorted = sortDocuments([invoice, big, receipt], {
      column: 'total',
      direction: 'asc',
    });
    expect(sorted.map((d) => d.id)).toEqual(['inv', 'rec', 'big']);
  });
});

/**
 * The board's columns. What is guarded here is which columns exist, in what
 * order, holding what — the part that can be quietly wrong. What a column is
 * *called* is `DocumentsKanban`'s business and is tested there.
 */
describe('groupDocuments', () => {
  const keys = (docs: AdminDocument[], by: 'status' | 'type' | 'month', types?: string[]) =>
    groupDocuments(docs, by, types).map((group) => group.key);

  /**
   * The headline rule: a board is read for how much is in each column, so the
   * fullest one should not be somewhere in the middle. Every case below puts
   * the busy column where its axis's own order would *not* have put it, or it
   * would pass on the base order alone.
   */
  it('puts the busiest column first, on every axis', () => {
    const second = doc({ id: 'inv2', issueDate: '2026-06-28' });
    expect(keys([receipt, invoice, second], 'status')).toEqual(['finalized', 'draft']);
    expect(keys([invoice, receipt, doc({ id: 'rec2', type: 'REC' })], 'type', ['INV', 'REC'])).toEqual([
      'REC',
      'INV',
    ]);
    expect(keys([invoice, receipt, second], 'month')).toEqual(['2026-06', '2026-07']);
  });

  /**
   * By when the document was *made*, not by the issue date it carries: the
   * question the tie answers is which column is still being added to. The
   * receipt has the later issue date and the earlier `createdAt`, so a
   * tie-break that reached for `issueDate` puts it first and fails here.
   */
  it('breaks a tie on the newest document made', () => {
    const fresh = doc({ id: 'fresh', createdAt: 2 });
    const stale = doc({ id: 'stale', type: 'REC', status: 'draft', createdAt: 1 });
    expect(keys([stale, fresh], 'status')).toEqual(['finalized', 'draft']);
    expect(keys([stale, fresh], 'type', ['INV', 'REC'])).toEqual(['INV', 'REC']);
  });

  /**
   * With nothing to separate them the axis's own order stands: the lifecycle
   * left to right, the registry order, the calendar newest first. Without a
   * stable base a board of equal columns would reshuffle on every render.
   */
  it('keeps the axis order when the counts and the recency both tie', () => {
    expect(keys([invoice, receipt], 'status')).toEqual(['draft', 'finalized']);
    // The receipt is first in the input and the invoice comes first in
    // `DOC_TYPE_LIST`, so a pass-through of the input order fails this.
    expect(keys([receipt, invoice, contract], 'type', ['INV', 'REC', 'CON'])).toEqual([
      'INV',
      'REC',
      'CON',
    ]);
    expect(keys([contract, invoice, receipt], 'month')).toEqual([
      '2026-07',
      '2026-06',
      '2026-05',
    ]);
  });

  /**
   * The opposite of the rule the filter choices follow, and deliberately: an
   * empty column is an answer ("nothing is in draft"), where an empty filter
   * value is a click that does nothing.
   */
  it('keeps a column with nothing in it', () => {
    // Behind the one that holds something, which is the busiest-first rule.
    const [finalized, draft] = groupDocuments([invoice], 'status');
    expect(finalized.documents).toEqual([invoice]);
    expect(draft).toEqual({ key: 'draft', documents: [] });

    expect(keys([invoice], 'type', ['INV', 'REC'])).toEqual(['INV', 'REC']);
  });

  /** Dropping the column would drop the documents in it. */
  it('draws a type on screen even when the caller did not ask for it', () => {
    expect(keys([invoice, receipt], 'type', ['CON'])).toEqual(['INV', 'REC', 'CON']);
  });

  /**
   * A month with nothing in it is a fact about the year. Closing the gap up
   * would draw a quiet quarter as an unbroken run of work.
   */
  it('fills the months between the earliest and latest, and stops there', () => {
    const march = doc({ id: 'mar', issueDate: '2026-03-04' });
    // Busiest first sends the two months that hold work to the front and the
    // three quiet ones behind, in calendar order among themselves.
    expect(keys([march, receipt], 'month')).toEqual([
      '2026-07',
      '2026-03',
      '2026-06',
      '2026-05',
      '2026-04',
    ]);
  });

  it('counts a gap across a year boundary in months, not in numbers', () => {
    const december = doc({ id: 'dec', issueDate: '2025-12-01' });
    const february = doc({ id: 'feb', issueDate: '2026-02-01' });
    // The quiet January existing is the point here, not where the sort files it.
    expect(keys([december, february], 'month').sort()).toEqual([
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('keeps every document, in the order it arrived', () => {
    const second = doc({ id: 'inv2', issueDate: '2026-06-28' });
    const [june] = groupDocuments([invoice, second], 'month');
    expect(june.documents.map((d) => d.id)).toEqual(['inv', 'inv2']);
  });
});

/**
 * The label was a prop with a 'Client / employee' default, and the default is
 * what each profile's home rendered — the client side offering to filter by an
 * employee it cannot contain.
 */
describe('partyFieldLabel', () => {
  const letter = doc({ id: 'ofr', type: 'OFR', status: 'draft', number: null });

  it('says Client on a list of client documents', () => {
    expect(partyFieldLabel([invoice, receipt, contract])).toBe('Client');
  });

  it('says Employee on a list of HR documents', () => {
    expect(partyFieldLabel([letter])).toBe('Employee');
  });

  /** Sealed profiles mean this cannot happen today; it is still the honest answer. */
  it('says both only when a list actually holds both', () => {
    expect(partyFieldLabel([invoice, letter])).toBe('Client / employee');
  });
});
