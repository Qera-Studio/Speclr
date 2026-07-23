'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { employeeInputSchema } from '@/lib/domain/employee';
import type { EmployeeRecord } from '@/lib/domain/employee';
import type { ActionResult } from '@/lib/domain/types';
import { authorized } from './authGate';
import { deleteEmployee, getEmployee, saveEmployee } from '@/db/store';
import { logger } from '@/lib/logger';

export async function createEmployee(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = employeeInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const now = Date.now();
  const employee: EmployeeRecord = {
    id: randomUUID(),
    ...parsed.data,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await saveEmployee(employee);
  } catch (err) {
    logger.error({ action: 'createEmployee', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save employee.' };
  }

  revalidatePath('/employees');
  return { success: true, id: employee.id };
}

export async function updateEmployee(id: unknown, data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string' || id.length === 0) {
    return { success: false, error: 'Invalid input.' };
  }

  const parsed = employeeInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const existing = await getEmployee(id);
  if (!existing) return { success: false, error: 'Employee not found.' };

  try {
    await saveEmployee({ ...existing, ...parsed.data, updatedAt: Date.now() });
  } catch (err) {
    logger.error({ action: 'updateEmployee', event: 'save_failed', error: err });
    return { success: false, error: 'Failed to save employee.' };
  }

  revalidatePath('/employees');
  return { success: true, id };
}

export async function deleteEmployeeAction(id: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  if (typeof id !== 'string') return { success: false, error: 'Invalid input.' };

  try {
    await deleteEmployee(id);
  } catch (err) {
    logger.error({ action: 'deleteEmployee', event: 'delete_failed', error: err });
    return { success: false, error: 'Failed to delete employee.' };
  }

  revalidatePath('/employees');
  return { success: true };
}
