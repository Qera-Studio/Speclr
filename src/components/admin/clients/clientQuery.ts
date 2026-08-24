import { localDateToISO } from "@/lib/domain/dates";
import {
  isEmptyRow,
  matchesDate,
  matchesMulti,
  sortByKey,
  type FieldSpec,
  type FilterRow as FilterRowOf,
} from "@/lib/domain/filters";
import { countryName } from "@/lib/domain/countries";
import type { ClientRecord } from "@/lib/domain/types";
import { completedSteps, onboardingStepsFor } from "./onboarding/steps";

/**
 * Filtering and sorting for the clients list — the same grammar the documents
 * list uses (`domain/filters.ts`), with this list's own fields.
 *
 * It lives here rather than in `src/lib/domain/` because onboarding progress is
 * one of the things worth filtering on, and how many steps a client has is
 * defined by `onboarding/steps.ts`, which is a UI-layer table. The domain layer
 * stays framework-free by not learning about it.
 *
 * Every field is derived, none is stored: rule 3, the same reason there is no
 * `country` column and no `onboardingStep` column (`CONTEXT.md` §5d).
 */

export type ClientFilterField = "country" | "onboarding" | "added";

export type ClientFilterRow = FilterRowOf<ClientFilterField>;

export type ClientSortColumn =
  | "name"
  | "email"
  | "phone"
  | "country"
  | "added"
  | "onboarding";

export interface ClientSortState {
  column: ClientSortColumn;
  direction: "asc" | "desc";
}

export const CLIENT_FILTER_FIELDS: Record<ClientFilterField, FieldSpec> = {
  country: {
    label: "Country",
    kind: "multi",
    operators: [
      { value: "is", label: "is" },
      { value: "isNot", label: "is not" },
    ],
  },
  onboarding: {
    label: "Onboarding",
    kind: "multi",
    // Three states, so "is not" would be a roundabout way of ticking the other
    // two in the same menu.
    operators: [{ value: "is", label: "is" }],
  },
  added: {
    label: "Added",
    kind: "date",
    operators: [
      { value: "onOrAfter", label: "on or after" },
      { value: "onOrBefore", label: "on or before" },
      { value: "between", label: "between" },
    ],
  },
};

export type OnboardingState = "complete" | "started" | "notStarted";

export const ONBOARDING_STATES: { value: OnboardingState; label: string }[] = [
  { value: "complete", label: "Complete" },
  { value: "started", label: "In progress" },
  { value: "notStarted", label: "Not started" },
];

/** Blank reads as India, as it does everywhere else on this record. */
export function clientCountry(client: ClientRecord): string {
  return client.addressParts?.country || "IN";
}

/**
 * How far through onboarding, as the three states the ring already draws.
 *
 * Out of *this* client's steps: an individual has six, not seven, so "complete"
 * is a different count for different rows (`CONTEXT.md` §5d-i).
 */
export function onboardingStateOf(client: ClientRecord): OnboardingState {
  const done = completedSteps(client);
  if (done === 0) return "notStarted";
  return done >= onboardingStepsFor(client).length ? "complete" : "started";
}

/** `createdAt` is epoch milliseconds; the date filters compare ISO dates. */
export function clientAddedISO(client: ClientRecord): string {
  return localDateToISO(new Date(client.createdAt));
}

function matchesRow(client: ClientRecord, row: ClientFilterRow): boolean {
  if (isEmptyRow(row)) return true;

  switch (row.field) {
    case "country":
      return matchesMulti(row, clientCountry(client));
    case "onboarding":
      return row.value.includes(onboardingStateOf(client));
    case "added":
      return matchesDate(row, clientAddedISO(client));
  }
}

export function matchesClientFilters(
  client: ClientRecord,
  rows: ClientFilterRow[],
): boolean {
  return rows.every((row) => matchesRow(client, row));
}

/** Sort keys, one per column. `null` sorts last regardless of direction. */
function sortKey(
  client: ClientRecord,
  column: ClientSortColumn,
): string | number | null {
  switch (column) {
    case "name":
      return client.name || null;
    case "email":
      return client.email || null;
    case "phone":
      return client.phone || null;
    case "country":
      // By the name shown, not the code: 'IN' sorting between 'IL' and 'IQ' is
      // an order nobody reading "India" can see.
      return countryName(clientCountry(client));
    case "added":
      return client.createdAt;
    case "onboarding":
      // The fraction, not the count: six steps done out of six is further along
      // than six out of seven, and the ring says so.
      return completedSteps(client) / onboardingStepsFor(client).length;
  }
}

/**
 * Newest-first order is the server's, so an unsorted list is left alone.
 * Everything else is `sortByKey`, which holds the null and stability rules.
 */
export function sortClients(
  clients: ClientRecord[],
  sort: ClientSortState | null,
): ClientRecord[] {
  if (!sort) return clients;
  return sortByKey(clients, (c) => sortKey(c, sort.column), sort.direction);
}
