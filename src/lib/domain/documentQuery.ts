import {
  isEmptyRow,
  matchesDate,
  matchesMulti,
  sortByKey,
  type FilterRow as FilterRowOf,
} from './filters';
import { computeTotals, rupeesToPaise, slipTotals } from './money';
import { partyName } from './party';
import { DOC_TYPES, DOC_TYPE_LIST, isHrDocType } from './registry';
import type { FieldSpec } from './filters';
import type { AdminDocument } from './types';

/**
 * Filtering and sorting for the documents list.
 *
 * Pure functions over `AdminDocument` — no React, no JSX. "Does this document
 * match?" and "what order?" are the parts that can be quietly wrong, so they
 * live here where they can be tested directly instead of through the UI.
 *
 * Filter rows **AND** together and duplicates are allowed: that is what makes a
 * date *range* two rows ("on or after" plus "on or before") rather than a
 * bespoke between-control.
 */

export type FilterField = 'type' | 'party' | 'status' | 'date' | 'total';

/** Re-exported so callers of this list's filters need one import, not two. */
export type { FilterOption } from './filters';

/** A filter row belonging to *this* list — the generic one, pinned to its fields. */
export type FilterRow = FilterRowOf<FilterField>;

export type SortColumn = 'number' | 'type' | 'party' | 'date' | 'total' | 'status';

export interface SortState {
  column: SortColumn;
  direction: 'asc' | 'desc';
}

export const FILTER_FIELDS: Record<FilterField, FieldSpec> = {
  type: {
    label: 'Type',
    kind: 'multi',
    operators: [
      { value: 'is', label: 'is' },
      { value: 'isNot', label: 'is not' },
    ],
  },
  party: {
    label: 'Client / employee',
    kind: 'multi',
    operators: [
      { value: 'is', label: 'is' },
      { value: 'isNot', label: 'is not' },
    ],
  },
  status: {
    label: 'Status',
    kind: 'multi',
    // Two possible values, so "is not X" is just "is Y" — an operator here
    // would be a choice with no consequence.
    operators: [{ value: 'is', label: 'is' }],
  },
  date: {
    label: 'Issue date',
    kind: 'date',
    operators: [
      { value: 'onOrAfter', label: 'on or after' },
      { value: 'onOrBefore', label: 'on or before' },
      { value: 'between', label: 'between' },
    ],
  },
  total: {
    label: 'Total',
    kind: 'amount',
    operators: [
      { value: 'atLeast', label: 'at least' },
      { value: 'atMost', label: 'at most' },
    ],
  },
};

export const FILTER_FIELD_LIST = Object.keys(FILTER_FIELDS) as FilterField[];

/**
 * What to call the party field on *this* list.
 *
 * Derived from the rows rather than passed in. Every document type already
 * names either a client or an employee (`isHrDocType`), so the list knows the
 * answer, and the profiles are sealed: a client-side list cannot hold an HR
 * document and an admin-side one cannot hold an invoice. It used to be a prop
 * with a 'Client / employee' default, and the default is exactly what each
 * profile's home rendered — the client side offering to filter by an employee
 * it can never contain. Two places stating one fact (`PRINCIPLES.md` rule 3),
 * and the one that was wrong was the one nobody passed.
 *
 * The mixed label is kept for the case that cannot happen today, because it is
 * the honest answer if a list ever does hold both.
 */
export function partyFieldLabel(docs: AdminDocument[]): string {
  const employee = docs.some((doc) => isHrDocType(doc.type));
  const client = docs.some((doc) => !isHrDocType(doc.type));
  if (employee && client) return 'Client / employee';
  return employee ? 'Employee' : 'Client';
}

/** What the board's columns are cut by. */
export type GroupBy = 'status' | 'type' | 'month';

/**
 * In the order the group row offers them; the first is the default.
 *
 * Type leads, because what a list of documents is mostly read for is which of
 * them it holds, and it is the one axis whose empty columns are an offer to
 * create rather than only an answer.
 */
export const GROUP_BY_LIST = ['type', 'status', 'month'] as const satisfies readonly GroupBy[];

export interface DocumentGroup {
  /** The grouped value: a status, a doc-type code, or a 'YYYY-MM' month. */
  key: string;
  documents: AdminDocument[];
}

/**
 * Every month from the earliest document on screen to the latest, newest first.
 *
 * The gaps are the point: a quiet March between a busy February and April is a
 * fact about the year, and a board that closes up the gap draws twelve months
 * of work as an unbroken run. Bounded by the data at both ends, because a
 * column beyond the first or last document is not a quiet month, it is a month
 * this list has nothing to say about.
 */
function monthColumns(present: string[]): string[] {
  if (present.length === 0) return [];
  const sorted = [...present].sort();
  const [lastYear, lastMonth] = sorted[sorted.length - 1].split('-').map(Number);
  let [year, month] = sorted[0].split('-').map(Number);

  const out: string[] = [];
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    out.push(`${year}-${String(month).padStart(2, '0')}`);
    if (month === 12) {
      year += 1;
      month = 1;
    } else {
      month += 1;
    }
  }
  return out.reverse();
}

/**
 * The board's columns: which exist, holding what, in what order.
 *
 * **An empty column is still a column.** This is the opposite of the rule the
 * filter choices follow, and deliberately: a filter value that matches nothing
 * is a click that does nothing, while an empty column is an *answer* — nothing
 * is in draft, nothing was issued in March, no credit note has ever been
 * raised. A board whose columns came and went with the data would also change
 * shape under every filter, so the reader would have to re-find their place on
 * every keystroke. Rows keep the order they arrived in, so whatever the list
 * was sorted by still reads down each column.
 *
 * **Busiest column first, on every axis, and recency breaks a tie**: two
 * columns holding the same count are separated by the newest document in each,
 * so the one still being added to leads. That makes the per-axis orders below
 * the *base* the sort falls back on rather than the order drawn. `sort` is
 * stable, so a genuine tie keeps that base, and the empty columns keep it
 * outright — which is what stops five untouched types shuffling about.
 *
 * What a column is *called* is deliberately not decided here. A status reads
 * through `StatusBadge` and a type through its own spec, and neither belongs in
 * domain code; this settles which columns exist, in what order, holding what.
 */
export function groupDocuments(
  docs: AdminDocument[],
  by: GroupBy,
  /**
   * Which type columns to draw, the empty ones included. The caller's, because
   * the answer is a profile's set of types on a home and this one type on a
   * per-type list, and neither is derivable from rows that may all be one type.
   */
  types: readonly string[] = DOC_TYPE_LIST.map((spec) => spec.code),
): DocumentGroup[] {
  const keyOf = (doc: AdminDocument) =>
    by === 'type' ? doc.type : by === 'status' ? doc.status : doc.issueDate.slice(0, 7);

  const grouped = new Map<string, AdminDocument[]>();
  for (const doc of docs) {
    const key = keyOf(doc);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(doc);
    else grouped.set(key, [doc]);
  }

  const order =
    by === 'type'
      ? DOC_TYPE_LIST.map((spec) => spec.code as string).filter(
          // A type on screen is always drawn, whatever the caller asked for:
          // dropping a column would drop the documents in it.
          (code) => types.includes(code) || grouped.has(code),
        )
      : by === 'status'
        ? // The lifecycle, left to right. A document only ever moves this way.
          ['draft', 'finalized']
        : monthColumns([...grouped.keys()]);

  return order
    .map((key) => ({ key, documents: grouped.get(key) ?? [] }))
    .sort(
      (a, b) =>
        b.documents.length - a.documents.length ||
        newestAt(b.documents) - newestAt(a.documents),
    );
}

/**
 * The newest document in a column, by when it was *made* rather than by the
 * issue date it carries: the tie-break is "which of these is still being added
 * to", and a back-dated invoice typed this morning is this morning's work.
 *
 * 0 for an empty column, so every empty one ties and keeps its base order.
 */
function newestAt(docs: AdminDocument[]): number {
  return docs.reduce((newest, doc) => Math.max(newest, doc.createdAt), 0);
}

/** Letters and contracts carry no line items, so they have no total to compare. */
export function hasTotal(doc: AdminDocument): boolean {
  return DOC_TYPES[doc.type].kind !== 'hr-letter' && doc.type !== 'CON';
}

export function totalPaiseOf(doc: AdminDocument): number | null {
  if (!hasTotal(doc)) return null;
  // A pay slip's total is the net paid, after deductions — matching what the
  // slip itself prints and what `toRow` stores in `total_paise`.
  if (doc.type === 'PAY') return slipTotals(doc.lineItems, doc.deductions).netPaise;
  return computeTotals(doc.lineItems, doc.gstRatePercent, doc).totalPaise;
}

function matchesRow(doc: AdminDocument, row: FilterRow): boolean {
  if (isEmptyRow(row)) return true;

  switch (row.field) {
    case 'type':
      return matchesMulti(row, doc.type);
    case 'party':
      return matchesMulti(row, partyName(doc));
    case 'status':
      return row.value.includes(doc.status);
    case 'date':
      return matchesDate(row, doc.issueDate);
    case 'total': {
      // Rupees → integer paise. A half-typed entry parses to null, which reads
      // as "no constraint" so the list doesn't thrash while you type.
      const paise = rupeesToPaise(row.value[0]);
      if (paise === null) return true;
      const total = totalPaiseOf(doc);
      // A contract has no total, so it can't satisfy a total filter.
      if (total === null) return false;
      return row.operator === 'atMost' ? total <= paise : total >= paise;
    }
  }
}

export function matchesFilters(doc: AdminDocument, rows: FilterRow[]): boolean {
  return rows.every((row) => matchesRow(doc, row));
}

/** Sort keys, one per column. `null` sorts last regardless of direction. */
function sortKey(doc: AdminDocument, column: SortColumn): string | number | null {
  switch (column) {
    case 'number':
      return doc.number ?? null;
    case 'type':
      return DOC_TYPES[doc.type].label;
    case 'party':
      return partyName(doc) || null;
    case 'date':
      return doc.issueDate;
    case 'total':
      return totalPaiseOf(doc);
    case 'status':
      return doc.status;
  }
}

/**
 * Newest-first order is the server's, so an unsorted list is left alone.
 * Everything else is `sortByKey`, which is where the null and stability rules
 * are written down.
 */
export function sortDocuments(docs: AdminDocument[], sort: SortState | null): AdminDocument[] {
  if (!sort) return docs;
  return sortByKey(docs, (doc) => sortKey(doc, sort.column), sort.direction);
}
