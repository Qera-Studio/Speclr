/**
 * The shape of a filter, shared by every list that has one.
 *
 * The documents list and the clients list filter different things, but they
 * filter them the same way: a row is a `field / operator / value` triple, rows
 * AND together, and a row with nothing typed into it yet must hide nothing.
 * That much is not about documents, so it does not live in `documentQuery.ts`
 * where it started.
 *
 * What each field *means* stays with its own list — `documentQuery` knows what
 * a party is, `clients/clientQuery` knows what onboarding is. This file only
 * knows the grammar.
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface FieldSpec {
  label: string;
  /** `multi` picks from a list; `date` and `amount` take one typed value. */
  kind: "multi" | "date" | "amount";
  operators: { value: string; label: string }[];
}

/**
 * One condition. Generic in its field name so a list keeps its own union and
 * cannot be handed a row belonging to another list's filter bar.
 */
export interface FilterRow<F extends string = string> {
  /** Stable key for React and for removal. */
  id: string;
  field: F;
  operator: string;
  /** Always a list, even for single-valued fields — one shape to render. */
  value: string[];
}

/** A new row has no value yet; until it does it must not hide anything. */
export function isEmptyRow(row: FilterRow): boolean {
  return row.value.length === 0 || row.value.every((v) => v.trim() === "");
}

/** `is` / `is not` against a set of chosen values. */
export function matchesMulti(row: FilterRow, value: string): boolean {
  const hit = row.value.includes(value);
  return row.operator === "isNot" ? !hit : hit;
}

/**
 * A date field against an ISO date. Both sides are 'YYYY-MM-DD', so a string
 * compare is a date compare.
 */
export function matchesDate(row: FilterRow, iso: string): boolean {
  if (row.operator === "between") {
    // Inclusive at both ends, and one-sided while only half the range is filled
    // in — it takes two clicks to pick a range, and the list must not blank out
    // between them.
    const [from = "", to = ""] = row.value;
    if (from && iso < from) return false;
    if (to && iso > to) return false;
    return true;
  }
  const when = row.value[0];
  return row.operator === "onOrBefore" ? iso <= when : iso >= when;
}

/**
 * A stable sort by one key function. `Array.prototype.sort` is required to be
 * stable, so equal rows keep the order the server sent. `null` always sinks to
 * the bottom rather than sorting as an empty string, which would bury it under
 * ascending and float it under descending for no reason a reader could explain.
 */
export function sortByKey<T>(
  items: T[],
  keyOf: (item: T) => string | number | null,
  direction: "asc" | "desc",
): T[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    const left = keyOf(a);
    const right = keyOf(b);

    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;

    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * factor;
    }
    return String(left).localeCompare(String(right)) * factor;
  });
}
