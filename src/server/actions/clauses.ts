'use server';

import { revalidatePath } from 'next/cache';
import { clauseInputSchema } from '@/lib/domain/contract/msa';
import type { ActionResult } from '@/lib/domain/types';
import { archiveClause, deleteClause, nextClauseNumber, saveClause } from '@/db/store';
import { logger } from '@/lib/logger';
import { authorized } from './authGate';

/**
 * The Contract Agreement's clause library.
 *
 * Editing here is safe *because* a contract carries its own copy: a draft seeds
 * the clause list when it is created, and finalize freezes the resolved content
 * onto the document (`materialiseContent`). So a change reaches the *next*
 * contract and nothing already open or already signed. Removing either of those
 * would turn these actions into a compliance bug, the same way it would for
 * `updateStudioSettings`.
 *
 * What they cannot check is whether the words are *right*. The MSA was drafted
 * to be reviewed as one package by an Indian commercial lawyer; a clause typed
 * here has had no such review, which is why the page says so.
 */
export async function updateClause(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = clauseInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid clause.' };

  try {
    await saveClause(parsed.data);
  } catch (err) {
    logger.error({ action: 'updateClause', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save the clause.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Adds a clause at the next free number.
 *
 * The number is claimed server-side rather than submitted, for the same reason
 * document numbers are: two people adding a clause from two tabs must not be
 * able to propose the same one. It counts past archived rows too — a number
 * once used is cited by every agreement that quoted it, so it is never reissued.
 */
export async function addClause(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  // The caller cannot know the number yet, so validate the rest against a
  // placeholder and overwrite it with the one the database hands out.
  const parsed = clauseInputSchema.safeParse({ ...(data as object), number: 1 });
  if (!parsed.success) return { success: false, error: 'Invalid clause.' };

  try {
    const number = await nextClauseNumber();
    await saveClause({ ...parsed.data, number });
  } catch (err) {
    logger.error({ action: 'addClause', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to add the clause.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Archives a clause: it leaves the library and its row stays, so its number
 * stays taken. The ordinary removal, and the one the list offers on a row.
 */
export async function removeClause(number: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };
  if (typeof number !== 'number' || !Number.isInteger(number)) {
    return { success: false, error: 'Invalid clause.' };
  }

  try {
    await archiveClause(number);
  } catch (err) {
    logger.error({ action: 'removeClause', event: 'archive_failed', error: err });
    return { success: false, error: 'Failed to archive the clause.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Deletes a clause outright.
 *
 * Offered because a clause typed by mistake should be removable rather than
 * sitting in the library's history forever, and kept at the foot of the drawer
 * rather than on a row, behind a confirmation, because it is the one action
 * here that cannot be undone.
 *
 * **The number does not come back with it** (`deleteClause` raises a
 * high-water mark in `counters` before removing the row). Clause bodies cite
 * each other by number, and reissuing one would silently change what a signed
 * agreement says. That is the same rule archiving holds by keeping the row.
 */
export async function destroyClause(number: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };
  if (typeof number !== 'number' || !Number.isInteger(number)) {
    return { success: false, error: 'Invalid clause.' };
  }

  try {
    await deleteClause(number);
  } catch (err) {
    logger.error({ action: 'destroyClause', event: 'delete_failed', error: err });
    return { success: false, error: 'Failed to delete the clause.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
