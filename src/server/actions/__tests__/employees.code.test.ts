import type { EmployeeRecord } from '@/lib/domain/employee';

/**
 * Employee codes are assigned server-side, never accepted from the request.
 *
 * The failure this replaces was real: two employees in the live database both
 * held the code "000001", typed by hand months apart. A code identifies one
 * person and is frozen onto every pay slip issued to them, so two people
 * sharing one makes an issued wage record ambiguous about whose wages it
 * states.
 */

const authorized = jest.fn();
const saveEmployee = jest.fn((_e: EmployeeRecord) => Promise.resolve());
const getEmployee = jest.fn();
const claimEmployeeCode = jest.fn();

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  saveEmployee: (...a: unknown[]) => saveEmployee(a[0] as EmployeeRecord),
  getEmployee: (...a: unknown[]) => getEmployee(...a),
  deleteEmployee: () => Promise.resolve(),
}));
jest.mock('@/db/counter', () => ({
  claimEmployeeCode: () => claimEmployeeCode(),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { createEmployee, updateEmployee } from '../employees';

const input = {
  name: 'Ananya Rao',
  address: 'Sector 12, Ghaziabad',
  email: 'ananya@example.com',
  phone: '+919000000000',
  role: 'Senior Designer',
  engagementType: 'employee',
  pronoun: 'she',
  joiningDate: '2025-04-01',
  payAmountPaise: 6_000_000,
  bank: { bankName: 'HDFC Bank', accountNo: '1234567890', ifsc: 'HDFC0001234' },
};

function saved(): EmployeeRecord {
  return saveEmployee.mock.calls.at(-1)![0];
}

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
  claimEmployeeCode.mockResolvedValue('QS-EMP-006');
});

describe('createEmployee', () => {
  /**
   * An intern is not on the payroll, is never issued a pay slip, and the
   * stipend slip prints no code — so claiming one would burn a number in the
   * employee series for someone who is not in it.
   */
  it('gives an intern no code at all', async () => {
    const result = await createEmployee({ ...input, engagementType: 'intern' });

    expect(result.success).toBe(true);
    expect(claimEmployeeCode).not.toHaveBeenCalled();
    expect(saved().payroll?.employeeCode).toBeUndefined();
  });

  it('claims a code from the counter', async () => {
    const result = await createEmployee(input);

    expect(result.success).toBe(true);
    expect(claimEmployeeCode).toHaveBeenCalledTimes(1);
    expect(saved().payroll?.employeeCode).toBe('QS-EMP-006');
  });

  /** The client is never the authority on this — the form field is read-only. */
  it('ignores a code sent in the request', async () => {
    await createEmployee({ ...input, payroll: { employeeCode: '000001' } });

    expect(saved().payroll?.employeeCode).toBe('QS-EMP-006');
  });

  it('keeps the other payroll identifiers the form did send', async () => {
    await createEmployee({
      ...input,
      payroll: { pan: 'ABCPR1234F', uan: '101234567890' },
    });

    expect(saved().payroll).toMatchObject({
      employeeCode: 'QS-EMP-006',
      pan: 'ABCPR1234F',
      uan: '101234567890',
    });
  });

  /**
   * A record without a code would be a pay slip printing a blank where its own
   * reference belongs. Failing the save is better than writing one.
   */
  it('refuses to save when the code cannot be claimed', async () => {
    claimEmployeeCode.mockRejectedValue(new Error('db down'));

    const result = await createEmployee(input);

    expect(result.success).toBe(false);
    expect(saveEmployee).not.toHaveBeenCalled();
  });
});

describe('updateEmployee', () => {
  const existing = {
    ...input,
    id: 'emp-1',
    payroll: { employeeCode: 'QS-EMP-002', pan: 'ABCPR1234F' },
    createdAt: 0,
    updatedAt: 0,
  } as EmployeeRecord;

  /**
   * A code, once issued, is never reassigned: it is already frozen onto every
   * slip issued to that person, and changing it would make the record stop
   * agreeing with the paper.
   */
  it('keeps the code the record already holds', async () => {
    getEmployee.mockResolvedValue(existing);

    await updateEmployee('emp-1', input);

    expect(claimEmployeeCode).not.toHaveBeenCalled();
    expect(saved().payroll?.employeeCode).toBe('QS-EMP-002');
  });

  it('keeps it even when the request asks for a different one', async () => {
    getEmployee.mockResolvedValue(existing);

    await updateEmployee('emp-1', { ...input, payroll: { employeeCode: 'QS-EMP-999' } });

    expect(saved().payroll?.employeeCode).toBe('QS-EMP-002');
  });

  /** Records created before codes existed get one the next time they are saved. */
  it('assigns a code to an employee that has none', async () => {
    getEmployee.mockResolvedValue({ ...existing, payroll: undefined });

    await updateEmployee('emp-1', input);

    expect(saved().payroll?.employeeCode).toBe('QS-EMP-006');
  });

  /** Joining the payroll is the moment someone joins the series. */
  it('assigns a code when an intern is hired properly', async () => {
    getEmployee.mockResolvedValue({
      ...existing,
      engagementType: 'intern',
      payroll: undefined,
    });

    await updateEmployee('emp-1', { ...input, engagementType: 'employee' });

    expect(saved().payroll?.employeeCode).toBe('QS-EMP-006');
  });

  it('still gives an intern none', async () => {
    getEmployee.mockResolvedValue({
      ...existing,
      engagementType: 'intern',
      payroll: undefined,
    });

    await updateEmployee('emp-1', { ...input, engagementType: 'intern' });

    expect(claimEmployeeCode).not.toHaveBeenCalled();
    expect(saved().payroll?.employeeCode).toBeUndefined();
  });

  /**
   * A code is frozen onto every slip issued to that person, so reclassifying
   * them cannot take it back — the paper would stop agreeing with the record.
   */
  it('never removes a code from someone reclassified as an intern', async () => {
    getEmployee.mockResolvedValue(existing);

    await updateEmployee('emp-1', { ...input, engagementType: 'intern' });

    expect(saved().payroll?.employeeCode).toBe('QS-EMP-002');
  });
});
