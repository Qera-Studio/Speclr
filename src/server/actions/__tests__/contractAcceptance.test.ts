/**
 * @jest-environment node
 */
const authorized = jest.fn();
const getDocument = jest.fn();
const saveContractAcceptance = jest.fn();

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  getDocument: (...a: unknown[]) => getDocument(...a),
  saveContractAcceptance: (...a: unknown[]) => saveContractAcceptance(...a),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/domain/dates', () => ({
  ...jest.requireActual('@/lib/domain/dates'),
  todayISO: () => '2026-10-19',
}));

import { recordContractAcceptance } from '../contractAcceptance';

const issued = { id: 'con-1', type: 'CON', status: 'finalized', issueDate: '2026-10-10' };
const input = { acceptedOn: '2026-10-12', method: 'email', acceptedByName: 'Asha Rao', reference: 'Email of 12 Oct' };

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue({ userId: 'user_1', email: 'ops@qera.studio' });
  getDocument.mockResolvedValue(issued);
});

describe('recordContractAcceptance', () => {
  it('records an acceptance of an issued contract, by whom it was recorded', async () => {
    expect((await recordContractAcceptance('con-1', input)).success).toBe(true);
    expect(saveContractAcceptance).toHaveBeenCalledWith('con-1', expect.objectContaining({ method: 'email' }), 'user_1');
  });

  it('refuses a draft, which could still change after being accepted', async () => {
    getDocument.mockResolvedValue({ ...issued, status: 'draft' });
    expect((await recordContractAcceptance('con-1', input)).error).toMatch(/Issue the contract/);
  });

  it('refuses a date before issue or after today', async () => {
    expect((await recordContractAcceptance('con-1', { ...input, acceptedOn: '2026-10-01' })).error).toMatch(/before it was issued/);
    expect((await recordContractAcceptance('con-1', { ...input, acceptedOn: '2026-10-20' })).error).toMatch(/not happened/);
    expect(saveContractAcceptance).not.toHaveBeenCalled();
  });

  it('refuses anyone not signed in, and anything that is not a contract', async () => {
    getDocument.mockResolvedValue({ ...issued, type: 'INV' });
    expect((await recordContractAcceptance('con-1', input)).error).toMatch(/Contract not found/);
    authorized.mockResolvedValue(null);
    expect((await recordContractAcceptance('con-1', input)).error).toBe('Unauthorized.');
  });
});
