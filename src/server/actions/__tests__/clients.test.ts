import type { ClientRecord } from '@/lib/domain/types';

/**
 * The client actions' auth gate and section merge.
 *
 * Untested until onboarding: `createClient`/`updateClient` shipped with no
 * action-level coverage at all, so "never trust the client; verify ownership
 * server-side" — the security floor — was asserted nowhere. It is asserted here.
 *
 * The merge behaviour matters just as much. `saveClient` is a whole-row upsert,
 * so a section save that forgot to spread the existing record would silently
 * blank every other section and reset `createdAt`.
 */

const authorized = jest.fn();
const saveClient = jest.fn((_c: ClientRecord) => Promise.resolve());
const getClient = jest.fn();
const deleteClient = jest.fn(() => Promise.resolve());
const clientHasDocuments = jest.fn(() => Promise.resolve(false));
const del = jest.fn(() => Promise.resolve());

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  saveClient: (...a: unknown[]) => saveClient(a[0] as ClientRecord),
  getClient: (...a: unknown[]) => getClient(...a),
  deleteClient: (...a: unknown[]) => deleteClient(...(a as [])),
  clientHasDocuments: (...a: unknown[]) => clientHasDocuments(...(a as [])),
}));
// The SDK reaches for Vercel's OIDC token at import time, which jsdom has no
// business providing.
jest.mock('@vercel/blob', () => ({ del: (...a: unknown[]) => del(...(a as [])) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { createClient, deleteClientAction, saveClientSection, updateClient } from '../clients';

const identity = {
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  address: 'C-204, Ghaziabad - 201017\nUttar Pradesh, India',
  email: 'accounts@clayora.example',
  phone: '+919876543210',
  entityType: 'pvt_ltd',
};

const existing: ClientRecord = {
  id: 'client-1',
  ...identity,
  addressParts: {
    line1: 'C-204',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201017',
    country: 'IN',
  },
  contacts: { billing: { email: 'ap@clayora.example' } },
  createdAt: 1_000,
  updatedAt: 1_000,
};

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue({ userId: 'u_1', email: 'shivanshu@qera.studio' });
  getClient.mockResolvedValue(existing);
  // `clearAllMocks` forgets the calls, not the implementation — so a
  // `mockResolvedValue` from one test is still in force in the next.
  clientHasDocuments.mockResolvedValue(false);
  del.mockResolvedValue(undefined);
});

describe('the auth gate', () => {
  it('refuses every action when the caller is not authorized', async () => {
    authorized.mockResolvedValue(null);

    expect(await createClient(identity)).toEqual({ success: false, error: 'Unauthorized.' });
    expect(await updateClient('client-1', identity)).toEqual({
      success: false,
      error: 'Unauthorized.',
    });
    expect(await saveClientSection('client-1', 'contacts', {})).toEqual({
      success: false,
      error: 'Unauthorized.',
    });

    expect(saveClient).not.toHaveBeenCalled();
  });

  it('checks authorization before it looks anything up', async () => {
    authorized.mockResolvedValue(null);
    await saveClientSection('client-1', 'tax', {});
    expect(getClient).not.toHaveBeenCalled();
  });
});

describe('createClient', () => {
  it('stores the entity type', async () => {
    const result = await createClient(identity);
    expect(result.success).toBe(true);
    expect(saveClient).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'pvt_ltd' }));
  });

  it('rejects an entity type that is not one of ours', async () => {
    const result = await createClient({ ...identity, entityType: 'sole_proprietor_llc' });
    expect(result).toEqual({ success: false, error: 'Invalid input.' });
    expect(saveClient).not.toHaveBeenCalled();
  });
});

describe('saveClientSection', () => {
  it('rejects a section name it does not know', async () => {
    const result = await saveClientSection('client-1', 'secrets', {});
    expect(result).toEqual({ success: false, error: 'Invalid input.' });
    expect(saveClient).not.toHaveBeenCalled();
  });

  it('names the offending field instead of a bare "Invalid input."', async () => {
    const result = await saveClientSection('client-1', 'commercial', { paymentTermsDays: -5 });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/paymentTermsDays/);
  });

  it('merges onto the existing record rather than replacing it', async () => {
    await saveClientSection('client-1', 'tax', { gstRegistered: true, gstin: '09AABCQ2864Q1ZQ' });

    const saved = saveClient.mock.calls[0][0];
    expect(saved.tax).toEqual({ gstRegistered: true, gstin: '09AABCQ2864Q1ZQ' });
    // Everything the step did not touch survives.
    expect(saved.contacts).toEqual({ billing: { email: 'ap@clayora.example' } });
    expect(saved.name).toBe('Clayora');
    expect(saved.createdAt).toBe(1_000);
    expect(saved.updatedAt).not.toBe(1_000);
  });

  it('re-checks the GSTIN against the address the server holds', async () => {
    // A Tamil Nadu GSTIN on a client whose stored address says Uttar Pradesh.
    const result = await saveClientSection('client-1', 'tax', {
      gstRegistered: true,
      gstin: '33AABCQ2864Q1ZZ',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/registered in Tamil Nadu, but the address says Uttar Pradesh/i);
    expect(saveClient).not.toHaveBeenCalled();
  });

  it('re-checks the PAN against the entity type the server holds', async () => {
    // A Private Limited's PAN is a 'C'. This one is an individual's.
    const result = await saveClientSection('client-1', 'tax', { pan: 'AABPQ2864Q' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/an individual, not a company/i);
    expect(saveClient).not.toHaveBeenCalled();
  });

  it('accepts a company PAN for a company', async () => {
    const result = await saveClientSection('client-1', 'tax', { pan: 'AABCQ2864Q' });
    expect(result.success).toBe(true);
  });

  it('refuses TDS without the section, rate and TAN that make it actionable', async () => {
    const result = await saveClientSection('client-1', 'tax', { tdsApplicable: true });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/tdsSection|tdsRatePercent|tan/);
  });

  it('refuses an access entry that is not a real pointer', async () => {
    const result = await saveClientSection('client-1', 'access', [
      { id: 'a1', kind: 'hosting', label: 'Vercel', location: '' },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects an attachment whose type is not on the allowlist', async () => {
    const result = await saveClientSection('client-1', 'attachments', [
      {
        id: 'f1',
        kind: 'pan',
        filename: 'pan.svg',
        mime: 'image/svg+xml',
        size: 1000,
        key: 'clients/client-1/f1',
        uploadedAt: 1,
      },
    ]);
    expect(result.success).toBe(false);
    expect(saveClient).not.toHaveBeenCalled();
  });

  it('reports a missing client rather than creating one', async () => {
    getClient.mockResolvedValue(null);
    const result = await saveClientSection('nope', 'contacts', {});
    expect(result).toEqual({ success: false, error: 'Client not found.' });
    expect(saveClient).not.toHaveBeenCalled();
  });
});

/**
 * Deleting a client.
 *
 * Two guards, and the interesting one is the refusal. `documents.client_id` is
 * a foreign key, so a referenced client cannot be removed anyway — checking
 * first is what turns a Postgres constraint violation into a sentence. The
 * blobs going with the row is the Legal-checklist half: they are a third
 * party's identity documents, and orphaning scans of someone's PAN card in
 * storage is the state DPDP erasure exists to prevent.
 */
describe('deleteClientAction', () => {
  it('refuses without a session', async () => {
    authorized.mockResolvedValue(null);
    const result = await deleteClientAction('client-1');
    expect(result).toEqual({ success: false, error: 'Unauthorized.' });
    expect(deleteClient).not.toHaveBeenCalled();
  });

  it('refuses a client that has documents, and says why', async () => {
    clientHasDocuments.mockResolvedValue(true);
    const result = await deleteClientAction('client-1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/has documents and cannot be deleted/i);
    expect(deleteClient).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });

  it('deletes the blobs before the row', async () => {
    getClient.mockResolvedValue({
      ...existing,
      attachments: [
        { id: 'f1', kind: 'pan', filename: 'pan.pdf', mime: 'application/pdf', size: 1, key: 'clients/client-1/f1', uploadedAt: 1 },
      ],
    });

    const result = await deleteClientAction('client-1');
    expect(result.success).toBe(true);
    expect(del).toHaveBeenCalledWith(['clients/client-1/f1']);
    expect(deleteClient).toHaveBeenCalledWith('client-1');
  });

  /**
   * A failed blob delete stops the row. The other order leaves a file in
   * storage with nothing left pointing at it — unfindable, and still there.
   */
  it('keeps the row when the files could not be removed', async () => {
    getClient.mockResolvedValue({
      ...existing,
      attachments: [
        { id: 'f1', kind: 'pan', filename: 'pan.pdf', mime: 'application/pdf', size: 1, key: 'k', uploadedAt: 1 },
      ],
    });
    del.mockRejectedValue(new Error('network'));

    const result = await deleteClientAction('client-1');
    expect(result.success).toBe(false);
    expect(deleteClient).not.toHaveBeenCalled();
  });
});
