'use server';

import { revalidatePath } from 'next/cache';
import { gstStateName } from '@/lib/domain/gstStates';
import { studioInputSchema, type StudioInfo } from '@/lib/domain/studio';
import type { ActionResult } from '@/lib/domain/types';
import { saveStudioSettings } from '@/db/store';
import { logger } from '@/lib/logger';
import { authorized } from './authGate';

/**
 * Updates the studio's own identity block — the "from:" address, bank details,
 * GSTIN and CIN printed on every document.
 *
 * Editing this is safe *because* documents freeze their own copy at finalize
 * (see `studioSnapshot`). Already-issued documents are untouched; only drafts
 * and future documents pick up the change. Removing that snapshot would turn
 * this action into a compliance bug — a tax invoice must be retained unaltered
 * for 72 months (CGST s.36).
 */
export async function updateStudioSettings(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = studioInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  // Derived, never submitted: the name must always agree with the code, since
  // the code is what decides CGST+SGST vs IGST on an invoice.
  const stateName = gstStateName(parsed.data.stateCode);
  if (!stateName) return { success: false, error: 'Unknown GST state code.' };

  const info: StudioInfo = { ...parsed.data, stateName };

  try {
    await saveStudioSettings(info);
  } catch (err) {
    logger.error({ action: 'updateStudioSettings', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save settings.' };
  }

  // Every document preview renders these, so nothing may keep a stale copy.
  revalidatePath('/', 'layout');
  return { success: true };
}
