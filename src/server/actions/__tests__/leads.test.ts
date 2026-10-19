/**
 * The lead actions: the auth gate, the write-time validation, and that a
 * delete is a real delete.
 */

const authorized = jest.fn();
const saveLeadRow = jest.fn((_l: unknown) => Promise.resolve());
const deleteLeadRow = jest.fn((_id: string) => Promise.resolve());

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  saveLead: (...a: unknown[]) => saveLeadRow(a[0]),
  deleteLead: (...a: unknown[]) => deleteLeadRow(a[0] as string),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { deleteLead, saveLead } from '../leads';

const LEAD = {
  name: 'Asha Rao',
  company: 'Clayora',
  email: 'asha@clayora.in',
  phone: '+919876543210',
  source: 'Referral',
  stage: 'new',
  serviceCodes: ['WEB'],
  notes: '',
};
const ID = '6f1c2a1e-6c3b-4a7e-9d6a-1b2c3d4e5f60';

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue({ userId: 'u1' });
});

describe('saveLead', () => {
  it('refuses a signed-out caller', async () => {
    authorized.mockResolvedValue(null);
    expect((await saveLead(LEAD)).success).toBe(false);
    expect(saveLeadRow).not.toHaveBeenCalled();
  });

  it('assigns a new lead its id on the server', async () => {
    expect(await saveLead(LEAD)).toEqual({ success: true });
    const saved = saveLeadRow.mock.calls[0][0] as { id: string; name: string };
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.name).toBe('Asha Rao');
  });

  it('replaces an existing lead by its id', async () => {
    await saveLead({ ...LEAD, id: ID, stage: 'quote_sent' });
    expect(saveLeadRow).toHaveBeenCalledWith(expect.objectContaining({ id: ID, stage: 'quote_sent' }));
  });

  it('refuses a lead with no name', async () => {
    expect((await saveLead({ ...LEAD, name: '' })).success).toBe(false);
    expect(saveLeadRow).not.toHaveBeenCalled();
  });

  it('refuses a stage or source outside the fixed lists', async () => {
    expect((await saveLead({ ...LEAD, stage: 'maybe' })).success).toBe(false);
    expect((await saveLead({ ...LEAD, source: 'Billboard' })).success).toBe(false);
    expect(saveLeadRow).not.toHaveBeenCalled();
  });

  it('refuses an email or a phone that does not check out', async () => {
    expect((await saveLead({ ...LEAD, email: 'asha@' })).success).toBe(false);
    expect((await saveLead({ ...LEAD, phone: '12' })).success).toBe(false);
    expect(saveLeadRow).not.toHaveBeenCalled();
  });

  it('accepts a lead with nothing but a name and a stage', async () => {
    const bare = { ...LEAD, company: '', email: '', phone: '', source: '', serviceCodes: [] };
    expect(await saveLead(bare)).toEqual({ success: true });
  });
});

describe('deleteLead', () => {
  it('deletes the row', async () => {
    expect(await deleteLead(ID)).toEqual({ success: true });
    expect(deleteLeadRow).toHaveBeenCalledWith(ID);
  });

  it('refuses a signed-out caller and a malformed id', async () => {
    expect((await deleteLead('not-an-id')).success).toBe(false);
    authorized.mockResolvedValue(null);
    expect((await deleteLead(ID)).success).toBe(false);
    expect(deleteLeadRow).not.toHaveBeenCalled();
  });
});
