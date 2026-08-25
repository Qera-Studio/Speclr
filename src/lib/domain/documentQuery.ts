import {
  isEmptyRow,
  matchesDate,
  matchesMulti,
  sortByKey,
  type FilterRow as FilterRowOf,
} from './filters';
import { computeTotals, rupeesToPaise, slipTotals } from './money';
import { partyName } from './party';
import { DOC_TYPES } from './registry';
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
