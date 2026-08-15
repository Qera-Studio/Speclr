import type { AdminDocument, ClientRecord } from '@/lib/domain/types';

/**
 * The two finalize guards the client record made possible.
 *
 * Both live in the action rather than in a Zod schema for the same reason the
 * intern/pay-slip refusal does: the answer comes from the *client record*,
 * which the submitted payload cannot see.
 *
 * They refuse rather than warn because finalizing claims a number and a
 * finalized document is immutable — the correction is a fresh document and a
 * burnt number, not an edit.
 */

const requireAuthorizedUser = jest.fn();
const getDocument = jest.fn();
const saveDocument = jest.fn((_doc: AdminDocument) => Promise.resolve());
const getClient = jest.fn();
const claimSerial = jest.fn();

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: () => requireAuthorizedUser(),
}));
jest.mock('@/db/store', () => ({
  getDocument: (...a: unknown[]) => getDocument(...a),
  saveDocument: (...a: unknown[]) => saveDocument(a[0] as AdminDocument),
  getClient: (...a: unknown[]) => getClient(...a),
  getEmployee: () => Promise.resolve(null),
  getStudioSettings: () => Promise.resolve(undefined),
  deleteDraft: () => Promise.resolve(),
  listFinalizedInvoicesForClient: () => Promise.resolve([]),
}));
jest.mock('@/db/counter', () => ({ claimSerial: (...a: unknown[]) => claimSerial(...a) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { finalizeDocument } from '../documents';

const ACTOR = { userId: 'user_issuer', email: 'ops@qera.studio' };

function client(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: 'client-1',
    name: 'Clayora',
    companyName: 'Clayora Private Limited',
    address: 'C-204, Ghaziabad',
    addressParts: {
      line1: 'C-204',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      pincode: '201017',
      country: 'IN',
    },
    email: 'a@clayora.test',
    phone: '+919876543210',
    entityType: 'pvt_ltd',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as ClientRecord;
}

function invoice(overrides: Partial<AdminDocument> = {}): AdminDocument {
  return {
    id: 'doc-1',
    type: 'INV',
    status: 'draft',
    clientId: 'client-1',
    issueDate: '2026-06-10',
    lineItems: [{ description: 'Brand system', ratePaise: 150_000, qty: 1 }],
    gstRatePercent: 18,
    placeOfSupplyStateCode: '09',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as AdminDocument;
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthorizedUser.mockResolvedValue(ACTOR);
  claimSerial.mockResolvedValue(1);
  getClient.mockResolvedValue(client());
  getDocument.mockResolvedValue(invoice());
});

describe('the place-of-supply override guard', () => {
  it('finalizes when the stored code is the one derived from the client', async () => {
    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('refuses a code that departs from the client with no reason recorded', async () => {
    // Karnataka on a client whose address and derivation both say Uttar Pradesh.
    getDocument.mockResolvedValue(invoice({ placeOfSupplyStateCode: '29' }));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Record why before finalizing/i);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('allows the departure once it says why', async () => {
    getDocument.mockResolvedValue(
      invoice({
        placeOfSupplyStateCode: '29',
        placeOfSupplyOverrideReason: 'Services relate to immovable property in Karnataka (CGST s.12(3)).',
      }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('does not apply when GST does not apply', async () => {
    getDocument.mockResolvedValue(
      invoice({ gstRatePercent: 0, placeOfSupplyStateCode: '29', gstLabel: 'Export of services' }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('does not fire when the client establishes no state to derive from', async () => {
    // No GSTIN and no recognisable state — there is nothing to disagree with,
    // and refusing here would strand a legacy client's invoice.
    getClient.mockResolvedValue(
      client({ addressParts: { line1: 'x', city: '', state: '', pincode: '', country: 'IN' } }),
    );
    getDocument.mockResolvedValue(invoice({ placeOfSupplyStateCode: '29' }));

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });
});

describe('the purchase-order guard', () => {
  it('refuses an invoice for a client who requires a PO and has none recorded', async () => {
    getClient.mockResolvedValue(client({ commercial: { poRequired: true } }));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires a PO number before invoicing/i);
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('finalizes once the PO number is on the client record', async () => {
    getClient.mockResolvedValue(
      client({ commercial: { poRequired: true, poNumber: 'PO-2026-0042' } }),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  it('leaves clients who do not require a PO alone', async () => {
    getClient.mockResolvedValue(client({ commercial: { paymentTermsDays: 15 } }));

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });

  /** A receipt records money already received; there is nothing left to gate. */
  it('does not apply to a receipt', async () => {
    getClient.mockResolvedValue(client({ commercial: { poRequired: true } }));
    getDocument.mockResolvedValue(
      invoice({ type: 'REC', payment: { date: '2026-06-10', method: 'Bank Transfer' } } as Partial<AdminDocument>),
    );

    const result = await finalizeDocument('doc-1');
    expect(result.success).toBe(true);
  });
});
