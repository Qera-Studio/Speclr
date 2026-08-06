'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { serviceInputSchema } from '@/lib/domain/serviceTemplate';
import type { ServiceTemplate } from '@/lib/domain/serviceTemplate';
import type { ActionResult } from '@/lib/domain/types';
import { authorized } from './authGate';
import { deleteService, getService, saveService } from '@/db/store';
import { logger } from '@/lib/logger';

export async function createService(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = serviceInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const now = Date.now();
  const service: ServiceTemplate = {
    id: randomUUID(),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await saveService(service);
  } catch (err) {
    logger.error({ action: 'createService', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save service.' };
  }

  revalidatePath('/docs/contract');
  return { success: true, id: service.id };
}

export async function updateService(id: unknown, data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const parsed = serviceInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const existing = await getService(id);
  if (!existing) return { success: false, error: 'Service not found.' };

  try {
    await saveService({ ...existing, ...parsed.data, updatedAt: Date.now() });
  } catch (err) {
    logger.error({ action: 'updateService', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save service.' };
  }

  revalidatePath('/docs/contract');
  return { success: true, id };
}

export async function deleteServiceAction(id: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string') return { success: false, error: 'Invalid input.' };

  try {
    await deleteService(id);
  } catch (err) {
    logger.error({ action: 'deleteService', event: 'delete_failed', error: err });
    return { success: false, error: 'Failed to delete service.' };
  }

  revalidatePath('/docs/contract');
  return { success: true };
}
