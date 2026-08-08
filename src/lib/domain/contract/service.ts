/**
 * A Service — one thing Qera sells, appended to a Schedule as a Part.
 *
 * The division of labour is the whole point of the system (contract-system.md
 * §1): a Service carries **technical scope only**. Everything about how money
 * and ownership behave — payment structure, milestone thresholds, the
 * definition of a Revision, feedback and acceptance windows, support duration,
 * notice periods, the ownership-transfer trigger, portfolio rights, the
 * additional-work definition and early termination — lives on the Schedule and
 * is inherited. A Shopify build and a Webflow build need identical legal terms;
 * only the scope differs.
 *
 * So: if a field here starts to look like a legal term, it is in the wrong
 * file. Adding a new service must never require writing new legal text.
 *
 * A Service belongs to exactly one Schedule. Where the same work is genuinely
 * built once and then operated monthly, that is two Services, not one that
 * spans two Schedules (contract-system.md §11).
 *
 * `[bracketed]` values throughout are blanks, filled per contract. See
 * `blanks.ts`. Client-safe: zod schemas are shared by the admin form and the
 * Server Action.
 */

import { z } from 'zod';
import type { ScheduleKey } from './schedules';

/** A row in a Limits or Fee table: a label and a value, the value usually a blank. */
export interface ServiceRow {
  label: string;
  value: string;
}

/**
 * The Service fields stored in the `content` JSONB column — everything except
 * the queryable projections (`code`, `name`, `scheduleKey`, `sortOrder`,
 * `archived`), which are real columns.
 */
export interface ServiceContent {
  /** Service codes this Part requires. Recorded now; not yet warned on. */
  dependencies: string[];
  /** Service codes that commonly accompany this one. */
  pairings: string[];
  /** 2–3 sentences: what this is and what the Client ends up with. */
  overview: string[];
  /** Concrete deliverables. No adjectives. */
  included: string[];
  /**
   * Who holds which account, who has access, when access is removed. Empty
   * where no account or credential is involved.
   */
  accountTerms: string[];
  /** Every quantifiable boundary, as a blank. Numbers, not words. */
  limits: ServiceRow[];
  /** The paragraphs that explain how the limits are counted. */
  limitsNotes: string[];
  /** What "done" means for this Part specifically. */
  completion: string[];
  /** Exact handover artifacts. */
  receives: string[];
  /** Qualifying paragraphs printed under the handover list. */
  receivesNotes: string[];
  /** Itemised, inline, middot-separated. */
  thirdPartyCosts: string;
  /** Ids into the exclusion library. Rendered pre-ticked as excluded. */
  exclusionIds: string[];
  /** Ids into the client-input library. */
  clientInputIds: string[];
  /** Fee, payment split, timeline, support — all blanks. */
  fee: ServiceRow[];
}

/** A Service as the domain uses it: the row and its content in one object. */
export interface ContractService extends ServiceContent {
  /** '01'–'22'. Stable, and the primary key. */
  code: string;
  name: string;
  scheduleKey: ScheduleKey;
  /** Position within its Schedule. Fixes Part order, which is not tick order. */
  sortOrder: number;
  /** Archived services stay readable for audit but leave new contracts. */
  archived: boolean;
}

const line = z.string().trim().max(1000);
const para = z.string().trim().max(4000);
const row = z.object({ label: z.string().trim().max(200), value: z.string().trim().max(500) });
const refId = z.string().trim().max(10);

export const serviceContentSchema = z.object({
  dependencies: z.array(refId).max(22),
  pairings: z.array(refId).max(22),
  overview: z.array(para).max(10),
  included: z.array(line).max(60),
  accountTerms: z.array(para).max(20),
  limits: z.array(row).max(30),
  limitsNotes: z.array(para).max(10),
  completion: z.array(para).max(10),
  receives: z.array(line).max(40),
  receivesNotes: z.array(para).max(10),
  thirdPartyCosts: para,
  exclusionIds: z.array(refId).max(120),
  clientInputIds: z.array(refId).max(80),
  fee: z.array(row).max(12),
});

export const serviceInputSchema = serviceContentSchema.extend({
  code: z.string().trim().regex(/^\d{2}$/, 'A service code is two digits.'),
  name: z.string().trim().min(1).max(200),
  scheduleKey: z.enum(['build', 'retainer', 'setup', 'audit']),
  sortOrder: z.number().int().min(0).max(99),
  archived: z.boolean(),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

/** A library line — one exclusion, or one thing the Client must hand over. */
export interface LibraryLine {
  id: string;
  text: string;
  category: string;
  archived: boolean;
}

export const libraryLineSchema = z.object({
  id: z.string().trim().max(10),
  text: z.string().trim().min(1).max(500),
  category: z.string().trim().min(1).max(40),
  archived: z.boolean(),
});
