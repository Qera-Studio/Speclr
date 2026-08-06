'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { employeeInputSchema } from '@/lib/domain/employee';
import type { EmployeeRecord } from '@/lib/domain/employee';
import type { ActionResult } from '@/lib/domain/types';
import { authorized } from './authGate';
import { claimEmployeeCode } from '@/db/counter';
import { deleteEmployee, getEmployee, saveEmployee } from '@/db/store';
import { logger } from '@/lib/logger';
import { withComposedAddress } from './address';

/**
 * The payroll group with an employee code on it, for the people who get one.
 *
 * Server-side and claimed from a counter, never taken from the request: the
 * code is the studio's own reference for a person and prints on their pay slip,
 * and the form that used to collect it by hand produced two employees sharing
 * "000001".
 *
 * **Employees only.** An intern is not on the payroll, is never issued a pay
 * slip, and the stipend slip does not print a code — so claiming one would burn
 * a number in the studio's employee series for someone who is not in it.
 *
 * Two rules follow, and both matter:
 *  - An intern who is hired properly gets their first code on that save, which
 *    is the moment they join the series.
 *  - A code already held is never reassigned or removed — not on an update, not
 *    if someone is later reclassified — because it is frozen onto every slip
 *    already issued to that person.
 */
async function withEmployeeCode(
  payroll: EmployeeRecord['payroll'],
  engagementType: EmployeeRecord['engagementType'],
  existing?: string,
): Promise<EmployeeRecord['payroll']> {
  const held = existing?.trim();
  if (held) return { ...payroll, employeeCode: held };
  if (engagementType !== 'employee') return { ...payroll, employeeCode: undefined };
  return { ...payroll, employeeCode: await claimEmployeeCode() };
}

export async function createEmployee(data: unknown): Promise<ActionResult> {
  if (!(await authorized())) return { success: false, error: 'Unauthorized.' };

  const parsed = employeeInputSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: 'Invalid input.' };

  const now = Date.now();
  let employee: EmployeeRecord;
  try {
    employee = {
      id: randomUUID(),
      ...withComposedAddress(parsed.data),
      payroll: await withEmployeeCode(parsed.data.payroll, parsed.data.engagementType),
      createdAt: now,
      updatedAt: now,
    };
  } catch (err) {
    logger.error({ action: 'createEmployee', event: 'code_claim_failed', error: err });
    return { success: false, error: 'Failed to assign an employee code.' };
  }

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
    await saveEmployee({
      ...existing,
      ...withComposedAddress(parsed.data),
      // An intern hired properly gets their first code on this save. An
      // existing code is kept, whatever the form sent back.
      payroll: await withEmployeeCode(
        parsed.data.payroll,
        parsed.data.engagementType,
        existing.payroll?.employeeCode,
      ),
      updatedAt: Date.now(),
    });
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
