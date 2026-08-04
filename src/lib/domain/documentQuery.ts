import { computeTotals, rupeesToPaise } from './money';
import { partyName } from './party';
import { DOC_TYPES } from './registry';
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

export interface FilterRow {
  /** Stable key for React and for removal; rows of the same field coexist. */
  id: string;
  field: FilterField;
  operator: string;
  /** Always a list, even for single-valued fields — one shape to render. */
  value: string[];
}

export type SortColumn = 'number' | 'type' | 'party' | 'date' | 'total' | 'status';

export interface SortState {
  column: SortColumn;
  direction: 'asc' | 'desc';
}

interface FieldSpec {
  label: string;
  /** `multi` picks from a list; `date` and `amount` take one typed value. */
  kind: 'multi' | 'date' | 'amount';
  operators: { value: string; label: string }[];
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
  return computeTotals(doc.lineItems, doc.gstRatePercent).totalPaise;
}

/** A new row has no value yet; until it does it must not hide anything. */
function isEmpty(row: FilterRow): boolean {
  return row.value.length === 0 || row.value.every((v) => v.trim() === '');
}

function matchesRow(doc: AdminDocument, row: FilterRow): boolean {
  if (isEmpty(row)) return true;

  switch (row.field) {
    case 'type': {
      const hit = row.value.includes(doc.type);
      return row.operator === 'isNot' ? !hit : hit;
    }
    case 'party': {
      const hit = row.value.includes(partyName(doc));
      return row.operator === 'isNot' ? !hit : hit;
    }
    case 'status':
      return row.value.includes(doc.status);
    case 'date': {
      // Both sides are 'YYYY-MM-DD', so a string compare is a date compare.
      if (row.operator === 'between') {
        // Inclusive at both ends, and one-sided while only half the range is
        // filled in — it takes two clicks to pick a range, and the list must
        // not blank out between them.
        const [from = '', to = ''] = row.value;
        if (from && doc.issueDate < from) return false;
        if (to && doc.issueDate > to) return false;
        return true;
      }
      const when = row.value[0];
      return row.operator === 'onOrBefore' ? doc.issueDate <= when : doc.issueDate >= when;
    }
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
 * A stable sort — `Array.prototype.sort` is required to be stable, so equal
 * rows keep the server's newest-first order. `null` (an unnumbered draft, a
 * contract with no total) always sinks to the bottom rather than sorting as an
 * empty string, which would bury it under ascending and float it under
 * descending for no reason a reader could explain.
 */
export function sortDocuments(docs: AdminDocument[], sort: SortState | null): AdminDocument[] {
  if (!sort) return docs;

  const factor = sort.direction === 'asc' ? 1 : -1;

  return [...docs].sort((a, b) => {
    const left = sortKey(a, sort.column);
    const right = sortKey(b, sort.column);

    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * factor;
    }
    return String(left).localeCompare(String(right)) * factor;
  });
}
