'use server';

import { revalidatePath } from 'next/cache';
import { acceptanceDateError, acceptanceInputSchema } from '@/lib/domain/contract/acceptance';
import { todayISO } from '@/lib/domain/dates';
import type { ActionResult } from '@/lib/domain/types';
import { getDocument, saveContractAcceptance } from '@/db/store';
import { logger } from '@/lib/logger';
import { authorized } from './authGate';

/**
 * Records how and when a client accepted an issued contract. The contract
 * itself stays as issued; this is a record beside it
 * (`domain/contract/acceptance.ts`).
 */
export async function recordContractAcceptance(documentId: unknown, data: unknown): Promise<ActionResult> {
  const actor = await authorized();
  if (!actor) return { success: false, error: 'Unauthorized.' };
  if (typeof documentId !== 'string') return { success: false, error: 'Invalid input.' };

  const parsed = acceptanceInputSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid acceptance.' };
  }

  const doc = await getDocument(documentId);
  if (!doc || doc.type !== 'CON') return { success: false, error: 'Contract not found.' };
  // A draft can change after it is "accepted", so only an issued contract can be.
  if (doc.status !== 'finalized') {
    return { success: false, error: 'Issue the contract before recording its acceptance.' };
  }
  const dateError = acceptanceDateError(parsed.data.acceptedOn, doc.issueDate, todayISO());
  if (dateError) return { success: false, error: dateError };

  try {
    await saveContractAcceptance(documentId, parsed.data, actor.userId);
  } catch (err) {
    logger.error({ action: 'recordContractAcceptance', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to record the acceptance.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
