'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { clientInputSchema } from '@/lib/domain/registry';
import type { ActionResult, ClientRecord } from '@/lib/domain/types';
import { authorized } from './authGate';
import { getClient, saveClient } from '@/db/store';
import { logger } from '@/lib/logger';

export async function createClient(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = clientInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const now = Date.now();
  const client: ClientRecord = {
    id: randomUUID(),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await saveClient(client);
  } catch (err) {
    logger.error({ action: 'createClient', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save client.' };
  }

  revalidatePath('/clients');
  return { success: true, id: client.id };
}

export async function updateClient(id: unknown, data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const parsed = clientInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const existing = await getClient(id);
  if (!existing) return { success: false, error: 'Client not found.' };

  try {
    await saveClient({ ...existing, ...parsed.data, updatedAt: Date.now() });
  } catch (err) {
    logger.error({ action: 'updateClient', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save client.' };
  }

  revalidatePath('/clients');
  return { success: true, id };
}
