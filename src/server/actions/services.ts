'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sacSchema } from '@/lib/domain/fields';
import { multilineSchema, textSchema } from '@/lib/domain/text';
import type { ActionResult } from '@/lib/domain/types';
import { getService, insertService, listServices, saveService } from '@/db/store';
import { logger } from '@/lib/logger';
import { authorized } from './authGate';

/**
 * The five things the catalogue dialog edits.
 *
 * Deliberately not `serviceInputSchema`. A Service carries sixty-odd lines of
 * scope, exclusions and client inputs that this screen never shows, and a form
 * that posts the whole record back is a form that can quietly blank the parts it
 * did not render. So the client sends five fields, the server reads the stored
 * row, and everything else survives by never having left the database.
 *
 * That is also the ownership rule: `code` names the row, the row is loaded
 * server-side, and nothing the browser sent decides what it may overwrite.
 */
const detailFields = {
  name: textSchema(200, { required: 'A service name is required.' }),
  scheduleKey: z.enum(['build', 'retainer', 'setup', 'audit']),
  /** One paragraph per line, as typed. Empty lines are dropped on the way in. */
  overview: z.array(multilineSchema(4000)).max(10),
  sacCode: sacSchema(),
  /**
   * Integer paise, or null for "quoted per engagement".
   *
   * The form holds rupees and converts before it posts, because money is paise
   * everywhere behind this boundary and a float that reaches the database is
   * the bug that is impossible to find afterwards.
   */
  ratePaise: z.number().int().min(0).max(10_000_000_000).nullable(),
};

const serviceDetailsSchema = z.object({
  code: z.string().regex(/^\d{2}$/, 'A service code is two digits.'),
  ...detailFields,
});

/** The same five fields, minus the code, which the server assigns. */
const newServiceSchema = z.object(detailFields);

/**
 * Edits a Service in the catalogue.
 *
 * **Safe because a contract carries its own copy.** A Part is copied onto the
 * contract when the Service is ticked and frozen onto the document at finalize,
 * so an edit here reaches the *next* contract and nothing already open or
 * already signed. That is the same guarantee `updateClause` relies on, and
 * removing either half of it would turn this into a compliance bug rather than
 * a refactor (CONTEXT.md §5, §5c).
 */
export async function updateServiceDetails(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = serviceDetailsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid service.' };
  }
  const { code, name, scheduleKey, overview, sacCode, ratePaise } = parsed.data;

  try {
    const existing = await getService(code);
    if (!existing) return { success: false, error: 'That service no longer exists.' };

    /**
     * Moving a Service to another Schedule puts it at the end of the one it
     * arrives in, rather than keeping the position it held in the one it left.
     *
     * `sortOrder` is what fixes Part order on a contract, and it is only
     * meaningful within a Schedule — carried across, a Service numbered 2 under
     * Setup would land second in Build, ahead of things that were there first,
     * for no reason anybody could see. The end is the one position that says
     * nothing it does not mean.
     *
     * What does *not* follow it is the two-digit code: 01-04 being Setup and
     * 05-14 Build is a numbering convention, and a code is cited by every
     * contract that used it, so it is never reassigned.
     */
    let sortOrder = existing.sortOrder;
    if (scheduleKey !== existing.scheduleKey) {
      const siblings = (await listServices(true)).filter((s) => s.scheduleKey === scheduleKey);
      sortOrder = Math.max(0, ...siblings.map((s) => s.sortOrder)) + 1;
    }

    await saveService({
      ...existing,
      name,
      scheduleKey,
      sortOrder,
      overview,
      // Both columns are optional, and blank is their absence rather than an
      // empty string. For the rate, "not priced" is absence rather than a zero:
      // zero is a real rate and means the work is given away.
      sacCode: sacCode || undefined,
      ratePaise: ratePaise ?? undefined,
    });
  } catch (err) {
    logger.error({ action: 'updateServiceDetails', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save the service.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Adds a Service to the catalogue.
 *
 * **The code is assigned server-side, never sent.** It is the primary key and
 * it is cited by every contract that used it, so it is claimed as one past the
 * highest that exists — counting archived rows, exactly as the clause library
 * counts past archived clauses, because a retired code must never be handed to
 * different work. That is also why the insert refuses a collision rather than
 * upserting: on a duplicate the honest answer is an error, not an overwrite.
 *
 * The five fields the dialog collects are all it writes. Scope, limits,
 * exclusions and the Fee table start empty and are filled from the spec, which
 * is the same division of labour the dialog holds for an edit: this screen is
 * for what a Service *is*, not for the contract text it carries.
 */
export async function createService(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = newServiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid service.' };
  }
  const { name, scheduleKey, overview, sacCode, ratePaise } = parsed.data;

  try {
    const all = await listServices(true);
    const next = Math.max(0, ...all.map((s) => Number(s.code))) + 1;
    // Two digits is the shape of a code, and 99 services is far past the point
    // where a catalogue wants a different screen anyway.
    if (next > 99) return { success: false, error: 'The catalogue is full.' };

    const siblings = all.filter((s) => s.scheduleKey === scheduleKey);
    await insertService({
      code: String(next).padStart(2, '0'),
      name,
      scheduleKey,
      sortOrder: Math.max(0, ...siblings.map((s) => s.sortOrder)) + 1,
      archived: false,
      overview,
      sacCode: sacCode || undefined,
      ratePaise: ratePaise ?? undefined,
      dependencies: [],
      pairings: [],
      included: [],
      accountTerms: [],
      limits: [],
      limitsNotes: [],
      completion: [],
      receives: [],
      receivesNotes: [],
      thirdPartyCosts: '',
      exclusionIds: [],
      clientInputIds: [],
      fee: [],
    });
  } catch (err) {
    logger.error({ action: 'createService', event: 'insert_failed', error: err });
    return { success: false, error: 'Failed to add the service.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
