'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sacSchema } from '@/lib/domain/fields';
import { multilineSchema, textSchema } from '@/lib/domain/text';
import { serviceContentSchema, type ServiceContent } from '@/lib/domain/service';
import { assignItemIds, serviceItemsSchema } from '@/lib/domain/serviceItem';
import type { ActionResult } from '@/lib/domain/types';
import { archiveService, getService, insertService, listServices, saveService } from '@/db/store';
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

const serviceCode = z.string().regex(/^\d{2}$/, 'A service code is two digits.');

const serviceDetailsSchema = z.object({ code: serviceCode, ...detailFields });

/**
 * The same five fields, minus the code, which the server assigns, plus the
 * Service to start from, if any: see `createService`.
 */
const newServiceSchema = z.object({ ...detailFields, cloneFrom: serviceCode.optional() });

/** What a Service carries before anything has been written into it. */
const EMPTY_CONTENT: ServiceContent = {
  dependencies: [],
  pairings: [],
  overview: [],
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
};

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
 * highest that exists, counting archived rows, exactly as the clause library
 * counts past archived clauses, because a retired code must never be handed to
 * different work. That is also why the insert refuses a collision rather than
 * upserting: on a duplicate the honest answer is an error, not an overwrite.
 *
 * The five fields the dialog collects are all it writes of its own. Everything
 * else starts empty, **or is copied from the Service it starts from**. A
 * genuinely new kind of work is usually a near copy of one that exists, and
 * "Start from…" is what makes adding it a two-minute form rather than a spec
 * edit: scope, limits, libraries and the menu come across, and the five fields
 * typed here replace the source's own. The copy is a copy; editing the new
 * Service afterwards touches nothing on the old one.
 */
export async function createService(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = newServiceSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid service.' };
  }
  const { name, scheduleKey, overview, sacCode, ratePaise, cloneFrom } = parsed.data;

  try {
    let base = EMPTY_CONTENT;
    if (cloneFrom) {
      const source = await getService(cloneFrom);
      if (!source) return { success: false, error: 'The service to start from no longer exists.' };
      // The content schema names exactly the content fields, so parsing the
      // whole record through it is the split the store makes on every write.
      base = serviceContentSchema.parse(source);
    }

    const all = await listServices(true);
    const next = Math.max(0, ...all.map((s) => Number(s.code))) + 1;
    // Two digits is the shape of a code, and 99 services is far past the point
    // where a catalogue wants a different screen anyway.
    if (next > 99) return { success: false, error: 'The catalogue is full.' };

    const siblings = all.filter((s) => s.scheduleKey === scheduleKey);
    await insertService({
      ...base,
      code: String(next).padStart(2, '0'),
      name,
      scheduleKey,
      sortOrder: Math.max(0, ...siblings.map((s) => s.sortOrder)) + 1,
      archived: false,
      overview,
      sacCode: sacCode || undefined,
      ratePaise: ratePaise ?? undefined,
    });
  } catch (err) {
    logger.error({ action: 'createService', event: 'insert_failed', error: err });
    return { success: false, error: 'Failed to add the service.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * The three sections of the service page, each a form that posts only its
 * own fields.
 *
 * The same shape as `saveClientSection`: the client names a section, the
 * server reads the row and overwrites exactly that section's keys. A page
 * with three forms writing one row is how a section quietly goes missing
 * unless each one is blind to the others, and this is what makes them blind.
 *
 * An item posts with `id: ''` to mean "new"; ids are assigned here and never
 * reissued (`assignItemIds`).
 */
const SECTION_SCHEMAS = {
  items: z.object({ items: serviceItemsSchema }),
  wording: serviceContentSchema.pick({
    included: true,
    accountTerms: true,
    limits: true,
    limitsNotes: true,
    completion: true,
    receives: true,
    receivesNotes: true,
    thirdPartyCosts: true,
    fee: true,
  }),
  libraries: serviceContentSchema.pick({ exclusionIds: true, clientInputIds: true }),
} as const;

export type ServiceSection = keyof typeof SECTION_SCHEMAS;

const isServiceSection = (value: unknown): value is ServiceSection =>
  typeof value === 'string' && value in SECTION_SCHEMAS;

export async function saveServiceSection(
  code: unknown,
  section: unknown,
  data: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsedCode = serviceCode.safeParse(code);
  if (!parsedCode.success) return { success: false, error: 'Invalid service code.' };
  if (!isServiceSection(section)) return { success: false, error: 'Unknown section.' };

  const parsed = SECTION_SCHEMAS[section].safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid section.' };
  }

  try {
    const existing = await getService(parsedCode.data);
    if (!existing) return { success: false, error: 'That service no longer exists.' };

    if ('items' in parsed.data) {
      const assigned = assignItemIds(existing, parsed.data.items);
      // The domain rule on a finished list (no two items on one id) runs on the
      // ids as they will be stored, which is after assignment.
      const check = serviceContentSchema.shape.items.safeParse(assigned.items);
      if (!check.success) {
        return { success: false, error: check.error.issues[0]?.message ?? 'Invalid items.' };
      }
      await saveService({ ...existing, ...assigned });
    } else {
      await saveService({ ...existing, ...parsed.data });
    }
  } catch (err) {
    logger.error({ action: 'saveServiceSection', event: 'save_failed', section, error: err });
    return { success: false, error: 'Failed to save the service.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Archives a Service. Never deletes: a Service that has been on a contract
 * stays readable for audit, and every contract holds its own copy regardless,
 * so removing the row is never the right answer (`archiveService`).
 */
export async function removeService(code: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = serviceCode.safeParse(code);
  if (!parsed.success) return { success: false, error: 'Invalid service code.' };

  try {
    await archiveService(parsed.data);
  } catch (err) {
    logger.error({ action: 'removeService', event: 'archive_failed', error: err });
    return { success: false, error: 'Failed to archive the service.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
