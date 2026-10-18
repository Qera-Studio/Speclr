'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { leadInputSchema } from '@/lib/domain/lead';
import type { ActionResult } from '@/lib/domain/types';
import { deleteLead as deleteLeadRow, saveLead as saveLeadRow } from '@/db/store';
import { logger } from '@/lib/logger';
import { authorized } from './authGate';

/** An existing lead's id, or none for a new one. Ids are assigned here, never typed. */
const leadIdSchema = z.string().uuid();

const saveLeadSchema = leadInputSchema.extend({ id: leadIdSchema.optional() });

/** Adds a lead, or replaces one by id. Every field is validated on the way in. */
export async function saveLead(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = saveLeadSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid lead.' };
  }

  try {
    await saveLeadRow({ ...parsed.data, id: parsed.data.id ?? randomUUID() });
  } catch (err) {
    logger.error({ action: 'saveLead', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save the lead.' };
  }

  revalidatePath('/client/leads');
  return { success: true };
}

/** Deletes a lead outright: its contact details go, not just the listing. */
export async function deleteLead(id: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = leadIdSchema.safeParse(id);
  if (!parsed.success) return { success: false, error: 'Invalid lead.' };

  try {
    await deleteLeadRow(parsed.data);
  } catch (err) {
    logger.error({ action: 'deleteLead', event: 'delete_failed', error: err });
    return { success: false, error: 'Failed to delete the lead.' };
  }

  revalidatePath('/client/leads');
  return { success: true };
}
