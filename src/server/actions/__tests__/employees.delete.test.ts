import type { EmployeeRecord } from '@/lib/domain/employee';

/**
 * An employee who has been on a document cannot be deleted, and now says so.
 *
 * `documents.employee_id` is a foreign key with no `onDelete`, so Postgres has
 * always refused this. What the operator saw was "Failed to delete employee",
 * which names no cause and reads like a fault in the app. The client side has
 * turned that constraint into a sentence since onboarding was built; this is
 * the same guard, arriving late.
 */

const authorized = jest.fn();
const getEmployee = jest.fn();
const employeeHasDocuments = jest.fn();
const deleteEmployee = jest.fn(() => Promise.resolve());

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  saveEmployee: () => Promise.resolve(),
  getEmployee: (...a: unknown[]) => getEmployee(...a),
  employeeHasDocuments: (...a: unknown[]) => employeeHasDocuments(...a),
  deleteEmployee: (...a: unknown[]) => deleteEmployee(...(a as [])),
}));
jest.mock('@/db/counter', () => ({ claimEmployeeCode: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { deleteEmployeeAction } from '../employees';

const ria = { id: 'e1', name: 'Ria Pareek' } as EmployeeRecord;

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
  getEmployee.mockResolvedValue(ria);
  employeeHasDocuments.mockResolvedValue(false);
});

it('refuses an employee who has documents, and names them', async () => {
  employeeHasDocuments.mockResolvedValue(true);

  const result = await deleteEmployeeAction('e1');

  expect(result.success).toBe(false);
  expect(result.error).toMatch(/Ria Pareek has documents and cannot be deleted/);
  expect(deleteEmployee).not.toHaveBeenCalled();
});

it('deletes an employee who has none', async () => {
  const result = await deleteEmployeeAction('e1');

  expect(result.success).toBe(true);
  expect(deleteEmployee).toHaveBeenCalledWith('e1');
});

it('checks the session before it checks anything else', async () => {
  authorized.mockResolvedValue(false);

  expect(await deleteEmployeeAction('e1')).toEqual({
    success: false,
    error: 'Unauthorized.',
  });
  expect(employeeHasDocuments).not.toHaveBeenCalled();
});
