/**
 * Assembly — turning a set of ticked services into the Schedules and Parts a
 * contract actually renders.
 *
 * The user never picks a Schedule (contract-system.md §4). They tick services;
 * this routes them. Three rules do all the work:
 *
 * 1. **A Schedule renders only where at least one of its services was ticked.**
 *    Nothing empty appears anywhere.
 * 2. **Letters are assigned in canonical Schedule order, skipping the absent.**
 *    A contract of Retainer and Setup work letters them A and B, not B and C.
 *    The Schedule's own key is stored; the letter is derived per contract and
 *    is never persisted.
 * 3. **Parts are numbered in canonical service order, not tick order.** Ticking
 *    Brand identity before Shopify still yields Part A-1 Shopify.
 *
 * Parts are numbered `A-1`, `A-2` — hyphenated, because a Schedule's own
 * clauses are numbered `A1`, `A2`, and "A1" cannot mean both.
 *
 * Pure, client-safe. Takes Parts already copied onto the contract, so it never
 * reads the live services table — see `ContractPart`.
 */

import { scheduleLetter } from '../scheduleLetter';
import { SCHEDULES, type Schedule, type ScheduleKey } from './schedules';
import type { ContractService } from './service';

/**
 * A service as it exists **on a contract**: a detached copy, taken when the
 * service was ticked.
 *
 * Copied rather than referenced, for the same reason a document snapshots its
 * client (CONTEXT.md §5). Editing the services library next year must be
 * incapable of changing a contract signed last year — and it must not shift the
 * blank keys of an open draft either, which copying at tick time also prevents.
 */
export type ContractPart = ContractService;

/** One Schedule as it appears in a particular contract, with its Parts. */
export interface AssembledSchedule {
  schedule: Schedule;
  /** 'A'–'D' for this contract. Derived, never stored. */
  letter: string;
  parts: AssembledPart[];
}

export interface AssembledPart {
  part: ContractPart;
  /** Position within the Schedule, from 1. */
  index: number;
  /** 'A-1', 'B-2'. What the contract prints and cross-references. */
  label: string;
}

/**
 * Groups Parts into lettered Schedules.
 *
 * Order is taken from the canonical tables, not from the input: Schedules by
 * `SCHEDULES` order, Parts by `sortOrder`. So the same set of ticks always
 * assembles to the same document, whatever order they were ticked in.
 */
export function assemble(parts: ContractPart[]): AssembledSchedule[] {
  const byKey = new Map<ScheduleKey, ContractPart[]>();
  for (const part of parts) {
    byKey.set(part.scheduleKey, [...(byKey.get(part.scheduleKey) ?? []), part]);
  }

  return SCHEDULES.filter((schedule) => (byKey.get(schedule.key)?.length ?? 0) > 0).map(
    (schedule, i) => {
      const letter = scheduleLetter(i);
      const ordered = [...(byKey.get(schedule.key) ?? [])].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      return {
        schedule,
        letter,
        parts: ordered.map((part, j) => ({
          part,
          index: j + 1,
          label: `${letter}-${j + 1}`,
        })),
      };
    },
  );
}

/** Substitutes a Schedule's rendered letter into its clause text. */
export function withLetter(text: string, letter: string): string {
  return text.replaceAll('{L}', letter);
}

/** The blank scope for a Master Agreement clause. */
export function msaScope(clauseNumber: number): string {
  return `msa.${clauseNumber}`;
}

/**
 * The blank scope for a Schedule clause. Keyed by the Schedule's own key rather
 * than its rendered letter — the letter moves with which other Schedules a
 * contract includes, and a key that moved would relabel stored values.
 */
export function scheduleScope(key: ScheduleKey, clauseNumber: number): string {
  return `sch.${key}.${clauseNumber}`;
}

/** The blank scope for one section of a Part, keyed by service code. */
export function partScope(code: string, section: string): string {
  return `part.${code}.${section}`;
}
