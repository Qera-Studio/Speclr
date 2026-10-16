'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { sacSchema } from '@/lib/domain/fields';
import { codeSchema, multilineSchema, textSchema } from '@/lib/domain/text';
import {
  EMPTY_PART_CONTENT,
  serviceContentSchema,
  type ServiceContent,
} from '@/lib/domain/service';
import { assignItemIds, serviceItemsSchema } from '@/lib/domain/serviceItem';
import type { ActionResult } from '@/lib/domain/types';
import {
  archiveService,
  getService,
  insertService,
  listServices,
  restoreService as restoreServiceRow,
  saveService,
} from '@/db/store';
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

/**
 * A service code.
 *
 * Two digits was the shape while the catalogue was the 22 Parts. The sales
 * catalogue uses letters (`WEB`, `DSGN`, `AIOP`), so the rule is now what a code
 * has always actually been: a short, stable, opaque key. It is never reassigned,
 * because every contract that used one cites it.
 */
const serviceCode = z
  .string()
  .regex(/^[A-Z0-9]{2,6}$/, 'A service code is two to six capitals or digits.');

const serviceDetailsSchema = z.object({ code: serviceCode, ...detailFields });

/**
 * The same five fields, minus the code, which the server assigns, plus the
 * Service to start from, if any: see `createService`.
 */
const newServiceSchema = z.object({ ...detailFields, cloneFrom: serviceCode.optional() });

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
    let base: ServiceContent = EMPTY_PART_CONTENT;
    if (cloneFrom) {
      const source = await getService(cloneFrom);
      if (!source) return { success: false, error: 'The service to start from no longer exists.' };
      // The content schema names exactly the content fields, so parsing the
      // whole record through it is the split the store makes on every write.
      base = serviceContentSchema.parse(source);
    }

    const all = await listServices(true);
    /**
     * The next numeric code, counting past every numbered row including
     * archived ones, because a retired code is never handed to different work.
     *
     * **Lettered codes are skipped rather than counted.** `Number('WEB')` is
     * `NaN`, and `Math.max` given one answers `NaN`, so a catalogue holding the
     * seeded sales services would otherwise write a row whose code was the
     * string 'NaN'. A service added here gets the next number; the seeded
     * letters are left alone, and the two kinds of code never collide because
     * a number is not a letter.
     */
    const numbered = all.map((s) => Number(s.code)).filter(Number.isFinite);
    const next = Math.max(0, ...numbered) + 1;
    // 99 services is far past the point where a catalogue wants another screen.
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
  /**
   * The one sentence the catalogue card and the quotation print, edited in
   * place on the service page. Sent as `''` to clear, never omitted: a key the
   * payload leaves out is a key this save keeps, so omission could not clear it.
   */
  description: serviceContentSchema.pick({ blurb: true }).required(),
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
 * Saves **one** item, leaving every other item on the Service untouched.
 *
 * Deliberately not `saveServiceSection('items', …)`, which posts the whole
 * list. That is right for a form holding every row at once, and wrong here: a
 * panel editing one item out of `WEB`'s 52 would carry the other 51 back with
 * it, so two people editing different items would each save their own copy of
 * the list and the second would silently undo the first. Sending one item means
 * the row the server reads is the row it writes.
 *
 * A blank id means a new item and is assigned here, never reissued
 * (`assignItemIds`). An id that is set must already exist: the alternative is
 * that a stale panel silently resurrects an item somebody deleted.
 */
export async function saveServiceItem(
  code: unknown,
  data: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsedCode = serviceCode.safeParse(code);
  if (!parsedCode.success) return { success: false, error: 'Invalid service code.' };

  // The list schema, given one item: the same rules, including the blank id
  // that means "new", without a second copy of them here.
  const parsed = serviceItemsSchema.safeParse([data]);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid item.' };
  }
  const incoming = parsed.data[0];

  try {
    const existing = await getService(parsedCode.data);
    if (!existing) return { success: false, error: 'That service no longer exists.' };

    const items = existing.items ?? [];
    const at = incoming.id ? items.findIndex((item) => item.id === incoming.id) : -1;
    if (incoming.id && at === -1) {
      return { success: false, error: 'That item no longer exists.' };
    }

    // One list either way, so `assignItemIds` sees every id that has ever been
    // used and the high-water mark cannot go backwards.
    const next =
      at === -1
        ? [...items, incoming]
        : items.map((item, i) => (i === at ? incoming : item));

    await saveService({ ...existing, ...assignItemIds(existing, next) });
  } catch (err) {
    logger.error({ action: 'saveServiceItem', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save the item.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Archives one item, which is how an item leaves the catalogue.
 *
 * Never deletes, for the same reason a Service is never deleted: a client
 * record and a contract cite the id, and `assignItemIds` counts past the row to
 * guarantee the id is never handed to different work. Archiving keeps the row,
 * so the id stays taken by construction.
 */
export async function archiveServiceItem(
  code: unknown,
  id: unknown,
  archived: unknown,
): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsedCode = serviceCode.safeParse(code);
  if (!parsedCode.success) return { success: false, error: 'Invalid service code.' };
  const parsedId = codeSchema(12, { required: 'An item needs an id.' }).safeParse(id);
  if (!parsedId.success) return { success: false, error: 'Invalid item id.' };
  if (typeof archived !== 'boolean') return { success: false, error: 'Invalid state.' };

  try {
    const existing = await getService(parsedCode.data);
    if (!existing) return { success: false, error: 'That service no longer exists.' };
    if (!(existing.items ?? []).some((item) => item.id === parsedId.data)) {
      return { success: false, error: 'That item no longer exists.' };
    }

    await saveService({
      ...existing,
      items: (existing.items ?? []).map((item) =>
        item.id === parsedId.data ? { ...item, archived } : item,
      ),
    });
  } catch (err) {
    logger.error({ action: 'archiveServiceItem', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to archive the item.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Clears a group heading from every item on one Service.
 *
 * **A group is not a record, so this is a bulk edit rather than a delete.** The
 * headings offered in the item form are *derived* by reading `group` off the
 * items themselves (`PRINCIPLES.md` rule 3), which means there is no row to
 * remove: the only way a heading stops existing is for nothing to carry it any
 * more. So removing "Foundation system" from `WEB` unsets the group on its 9
 * items, and the suggestion disappears on the next render because the
 * derivation no longer finds it.
 *
 * **Its own action, deliberately, rather than a flag on `saveServiceItem`.**
 * That one posts exactly one item and refuses an id the service does not
 * carry, which is the rule that stops two people editing different items from
 * overwriting each other. This writes many by design, so it says so in its
 * name instead of widening the narrow one.
 *
 * **Nothing is deleted and no id moves.** The items keep their ids, their
 * rates and their names, and simply read as ungrouped, which is already the
 * ordinary state for nine of the sixteen services. That is what makes this
 * recoverable by retyping the heading rather than a write somebody has to
 * restore from a backup.
 *
 * It returns the number of items it touched so the caller can report it,
 * which is also what the confirmation counts before firing.
 */
export async function removeServiceGroup(
  code: unknown,
  group: unknown,
): Promise<ActionResult & { cleared?: number }> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsedCode = serviceCode.safeParse(code);
  if (!parsedCode.success) return { success: false, error: 'Invalid service code.' };
  const parsedGroup = textSchema(80, { required: 'Name the group to remove.' }).safeParse(
    group,
  );
  if (!parsedGroup.success) return { success: false, error: 'Invalid group.' };

  try {
    const existing = await getService(parsedCode.data);
    if (!existing) return { success: false, error: 'That service no longer exists.' };

    const items = existing.items ?? [];
    // Exact match, never case-insensitive: 'Foundation System' and 'Foundation
    // system' are two headings here, and merging them is a rename rather than
    // a removal. Clearing both from one confirmation that named one of them
    // would be doing something the reader did not agree to.
    const cleared = items.filter((item) => item.group === parsedGroup.data).length;
    if (cleared === 0) return { success: false, error: 'No items carry that group.' };

    await saveService({
      ...existing,
      items: items.map((item) => {
        if (item.group !== parsedGroup.data) return item;
        // The key is **removed**, not set to an empty string: `group` is
        // optional and absent is how an ungrouped item is stored everywhere
        // else, so writing '' would make this service's rows a third state
        // that every reader would have to know about.
        const { group: _group, ...rest } = item;
        return rest;
      }),
    });

    revalidatePath('/', 'layout');
    return { success: true, cleared };
  } catch (err) {
    logger.error({ action: 'removeServiceGroup', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to remove the group.' };
  }
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

/**
 * Undoes `removeService`. Archiving is reversible by design (the row is kept
 * so the code stays taken), and this is the way back: the catalogue's
 * Archived tab offers it on every card.
 */
export async function restoreService(code: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = serviceCode.safeParse(code);
  if (!parsed.success) return { success: false, error: 'Invalid service code.' };

  try {
    await restoreServiceRow(parsed.data);
  } catch (err) {
    logger.error({ action: 'restoreService', event: 'restore_failed', error: err });
    return { success: false, error: 'Failed to restore the service.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
