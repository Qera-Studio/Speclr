import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from './index';
import { counters } from './schema';
import { formatDocNumber } from '@/lib/domain/docNumber';
import { formatEmployeeCode } from '@/lib/domain/employeeCode';
import { DEV_UNLIMITED } from '@/lib/devMode';
import type { DocTypeCode } from '@/lib/domain/types';

/**
 * Atomic serial claim — the reason this whole system exists. Two concurrent
 * finalizes must never receive the same number (GST Rule 46: consecutive,
 * unique invoice numbers). Serials are claimed at finalize time only (drafts
 * burn nothing) and keyed per Indian financial year (Apr–Mar), keeping each
 * FY's sequence consecutive.
 *
 * Postgres makes this atomic with a single upsert: INSERT the (docType, fyCode)
 * counter at 1, or on conflict bump last_serial by 1, RETURNING the new value.
 * The row-level lock inside the statement serialises concurrent claims — no
 * two callers can read-then-write the same serial. This is at least as strong
 * as Redis INCR, and it lives in the same database as the documents it numbers.
 */

export interface ClaimedSerial {
  serial: number;
  number: string;
}

/** fyCode is the compact FY token, e.g. '2627' for FY 2026-27. */
export async function claimSerial(code: DocTypeCode, fyCode: string): Promise<ClaimedSerial> {
  // Outside production no real serial is claimed, so sample finalizes are
  // unlimited and the live FY sequence stays untouched. Clock-based so the
  // unique index on documents.number still holds, and deliberately 6 digits —
  // an obviously-fake number nobody mistakes for an issued one.
  if (DEV_UNLIMITED) {
    const serial = 100000 + (Date.now() % 900000);
    return { serial, number: formatDocNumber(code, fyCode, serial) };
  }

  const rows = await db
    .insert(counters)
    .values({ docType: code, fyCode, lastSerial: 1 })
    .onConflictDoUpdate({
      target: [counters.docType, counters.fyCode],
      set: { lastSerial: sql`${counters.lastSerial} + 1`, updatedAt: new Date() },
    })
    .returning({ serial: counters.lastSerial });

  const serial = rows[0]!.serial;
  return { serial, number: formatDocNumber(code, fyCode, serial) };
}

/**
 * The counter key employee codes are claimed against. Not a `DocTypeCode` —
 * the column is plain text and a person is not a document type — but it shares
 * the table because the atomicity it needs is exactly the same, and a second
 * table would be a second thing to keep consistent for one row.
 */
const EMPLOYEE_CODE_COUNTER = 'EMPLOYEE';
/** The counter's PK is (doc_type, fy_code); an employee code has no FY. */
const NO_FY = '-';

/**
 * Claim the next employee code, atomically.
 *
 * No `DEV_UNLIMITED` branch, unlike `claimSerial` above: a document number is
 * something a sample finalize burns and a fake one keeps the live series clean,
 * whereas an employee record created outside production is still a real person
 * getting a real code. Gaps are fine here anyway — nothing requires this series
 * to be consecutive, only unique.
 */
export async function claimEmployeeCode(): Promise<string> {
  const rows = await db
    .insert(counters)
    .values({ docType: EMPLOYEE_CODE_COUNTER, fyCode: NO_FY, lastSerial: 1 })
    .onConflictDoUpdate({
      target: [counters.docType, counters.fyCode],
      set: { lastSerial: sql`${counters.lastSerial} + 1`, updatedAt: new Date() },
    })
    .returning({ serial: counters.lastSerial });

  return formatEmployeeCode(rows[0]!.serial);
}
