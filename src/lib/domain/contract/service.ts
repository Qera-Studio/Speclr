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
import { sacSchema } from '../fields';
import { codeSchema, multilineSchema, textSchema } from '../text';
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
  /**
   * The Service Accounting Code this work is classified under for GST.
   *
   * A property of *what is sold*, not of any one contract, which is why it sits
   * here rather than on a document: two clients buying Part 05 buy the same
   * classification. All six digits, and all of them start `99` because Chapter
   * 99 is services; the `9983` group this catalogue lands in is taxed at 18%.
   *
   * **This does not yet satisfy CGST Rule 46.** The rule wants the SAC printed
   * against the line on the tax invoice, and invoice lines here are still free
   * text that no Service feeds. This is the number the line will read when they
   * do; until then it is catalogue data. See `ROADMAP.md`'s format freeze.
   *
   * Optional because the twenty-two rows predate it, exactly as the six fields
   * `ClientSnapshot` gained were optional (CONTEXT.md §5d).
   */
  sacCode?: string;
  /**
   * The list price, in integer paise. Absent means "quoted per engagement".
   *
   * It is not the contract's Fee. The `fee` rows above are blanks a specific
   * contract fills after a specific negotiation; this is the number the studio
   * quotes from before there is a contract. Nothing reads it into a document,
   * and a Part's Fee blank is still filled by hand.
   *
   * Per what is `rateUnitOf(scheduleKey)`, which is derived rather than stored:
   * a Retainer is priced by the month and everything else is a fixed piece of
   * work, and that follows from the Schedule the Service already belongs to.
   */
  ratePaise?: number;
}

/**
 * What a Service's rate is *per*.
 *
 * Derived from the Schedule rather than stored beside the rate (rule 3): a
 * Retainer is the Schedule under which work recurs monthly, so a Retainer
 * Service's price is monthly by construction, and a second field saying so
 * would be a second place for the record to disagree with itself.
 */
export function rateUnitOf(scheduleKey: ScheduleKey): string {
  return scheduleKey === 'retainer' ? 'per month' : 'fixed';
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

const line = multilineSchema(1000);
const para = multilineSchema(4000);
const row = z.object({ label: textSchema(200), value: textSchema(500) });
const refId = codeSchema(10);

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
  sacCode: sacSchema().optional(),
  // A ceiling of ₹100 crore. Not a business rule — a bound, so a stray paste
  // cannot land a number that overflows the arithmetic downstream of it.
  ratePaise: z.number().int().min(0).max(10_000_000_000).optional(),
});

export const serviceInputSchema = serviceContentSchema.extend({
  code: codeSchema(2).pipe(z.string().regex(/^\d{2}$/, 'A service code is two digits.')),
  name: textSchema(200, { required: 'A service name is required.' }),
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
  id: codeSchema(10),
  text: textSchema(500, { required: 'This cannot be empty.' }),
  category: textSchema(40, { required: 'A category is required.' }),
  archived: z.boolean(),
});
