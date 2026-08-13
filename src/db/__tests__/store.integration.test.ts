/**
 * @jest-environment node
 *
 * INTEGRATION test — hits the live Neon Postgres (reads DATABASE_URL from
 * .env.local via next/jest). Runs in the NODE environment (not jsdom): it needs
 * no DOM, and the Neon driver relies on Node globals (TextDecoder, etc.) that
 * jsdom doesn't expose. Excluded from the default `npm test` run; invoke
 * explicitly with `npm run test:int`. It creates isolated test data (unique
 * ids, FY code '9999') and cleans up after itself. The one thing it cannot
 * delete is a *finalized* doc — that's the immutability guarantee under test —
 * so it removes those via a direct DB call in afterAll.
 */
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../index';
import { clients, counters, documents } from '../schema';
import {
  deleteDraft,
  getClient,
  getDocument,
  listDocuments,
  getLatestFinalizedInvoice,
  searchEverything,
  listDocumentsByType,
  listFinalizedInvoicesForClient,
  saveClient,
  saveDocument,
} from '../store';
import { claimSerial } from '../counter';
import type { InvoiceDocument } from '@/lib/domain/types';

const TEST_FY = '9999';
const madeClientIds: string[] = [];
const madeDocIds: string[] = [];

afterAll(async () => {
  // Direct teardown — bypasses the immutability guard to clean finalized test docs.
  for (const id of madeDocIds) await db.delete(documents).where(eq(documents.id, id));
  for (const id of madeClientIds) await db.delete(clients).where(eq(clients.id, id));
  await db.delete(counters).where(eq(counters.fyCode, TEST_FY));
});

function draftInvoice(id: string, clientId: string): InvoiceDocument {
  const now = Date.now();
  return {
    id,
    type: 'INV',
    status: 'draft',
    clientId,
    clientSnapshot: { name: '', address: '', email: '', phone: '' },
    issueDate: '2026-07-23',
    lineItems: [{ description: 'Line A', ratePaise: 100000, qty: 2 }],
    gstRatePercent: 18,
    placeOfSupplyStateCode: '01',
    createdAt: now,
    updatedAt: now,
  };
}

describe('Postgres store (integration)', () => {
  it('round-trips a client (name + gstin preserved)', async () => {
    const id = randomUUID();
    madeClientIds.push(id);
    const now = Date.now();
    await saveClient({
      id,
      name: 'Verify Client',
      address: 'Addr',
      email: 'v@test.co',
      phone: '+91 1',
      gstin: '09AABCQ2864Q1ZQ',
      createdAt: now,
      updatedAt: now,
    });
    const got = await getClient(id);
    expect(got?.name).toBe('Verify Client');
    expect(got?.gstin).toBe('09AABCQ2864Q1ZQ');
  });

  it('round-trips a draft invoice through the union↔row mapping', async () => {
    const clientId = randomUUID();
    madeClientIds.push(clientId);
    const now = Date.now();
    await saveClient({ id: clientId, name: 'C', address: 'A', email: 'c@t.co', phone: '1', createdAt: now, updatedAt: now });

    const docId = randomUUID();
    madeDocIds.push(docId);
    await saveDocument(draftInvoice(docId, clientId));

    const got = await getDocument(docId);
    expect(got?.type).toBe('INV');
    expect(got?.status).toBe('draft');
    expect(got?.lineItems[0]?.ratePaise).toBe(100000);
    expect(got?.gstRatePercent).toBe(18);
    expect(got?.placeOfSupplyStateCode).toBe('01');
  });

  it('claims serials atomically and formats the number', async () => {
    const a = await claimSerial('INV', TEST_FY);
    const b = await claimSerial('INV', TEST_FY);
    expect(b.serial).toBe(a.serial + 1);
    expect(a.number).toMatch(/^QS-INV-9999-\d{3}$/);
  });

  it('never hands out a duplicate serial under concurrency', async () => {
    const claims = await Promise.all(Array.from({ length: 10 }, () => claimSerial('REC', TEST_FY)));
    const serials = claims.map((c) => c.serial);
    expect(new Set(serials).size).toBe(10);
  });

  it('finalizes with a frozen client snapshot, then refuses to mutate or delete', async () => {
    const clientId = randomUUID();
    madeClientIds.push(clientId);
    const now = Date.now();
    await saveClient({ id: clientId, name: 'Frozen Co', address: 'A', email: 'f@t.co', phone: '1', createdAt: now, updatedAt: now });

    const docId = randomUUID();
    madeDocIds.push(docId);
    await saveDocument(draftInvoice(docId, clientId));

    const claim = await claimSerial('INV', TEST_FY);
    const draft = draftInvoice(docId, clientId);
    await saveDocument({
      ...draft,
      status: 'finalized',
      number: claim.number,
      serial: claim.serial,
      year: 9999,
      clientSnapshot: { name: 'Frozen Co', address: 'A', email: 'f@t.co', phone: '1' },
      finalizedAt: Date.now(),
    });

    const got = await getDocument(docId);
    expect(got?.status).toBe('finalized');
    expect(got?.number).toBe(claim.number);
    expect(got?.clientSnapshot?.name).toBe('Frozen Co');

    // Immutability: overwrite and delete must both be refused.
    await expect(saveDocument({ ...draft, status: 'draft', notes: 'tampered' })).rejects.toThrow(/immutable/i);
    await expect(deleteDraft(docId)).rejects.toThrow(/cannot be deleted/i);
  });

  it('lists documents (newest first)', async () => {
    const list = await listDocuments();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('round-trips structured address parts, and leaves old rows without them', async () => {
    const withParts = randomUUID();
    const withoutParts = randomUUID();
    madeClientIds.push(withParts, withoutParts);
    const now = Date.now();

    await saveClient({
      id: withParts,
      name: 'Parts Co',
      address: 'C-204,\nGhaziabad - 201017',
      addressParts: {
        line1: 'C-204',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201017',
        country: 'IN',
      },
      email: 'p@t.co',
      phone: '+919876543210',
      createdAt: now,
      updatedAt: now,
    });

    // A row saved without parts — the shape every pre-existing client has.
    await saveClient({
      id: withoutParts,
      name: 'Legacy Co',
      address: 'Hand typed address',
      email: 'l@t.co',
      phone: '9',
      createdAt: now,
      updatedAt: now,
    });

    expect((await getClient(withParts))?.addressParts?.city).toBe('Ghaziabad');
    expect((await getClient(withoutParts))?.addressParts).toBeUndefined();
    expect((await getClient(withoutParts))?.address).toBe('Hand typed address');
  });

  it('clears address parts on an edit rather than leaving stale ones behind', async () => {
    // The upsert passes one object to both values() and the conflict set, so a
    // missing key would silently keep the old parts on the row.
    const id = randomUUID();
    madeClientIds.push(id);
    const now = Date.now();
    const base = {
      id,
      name: 'Mutable Co',
      email: 'm@t.co',
      phone: '+919876543210',
      createdAt: now,
      updatedAt: now,
    };

    await saveClient({
      ...base,
      address: 'C-204,\nPune - 411001',
      addressParts: { line1: 'C-204', city: 'Pune', state: 'MH', pincode: '411001', country: 'IN' },
    });
    expect((await getClient(id))?.addressParts?.city).toBe('Pune');

    await saveClient({ ...base, address: 'Back to free text' });
    expect((await getClient(id))?.addressParts).toBeUndefined();
  });

  it('offers only this client’s finalized invoices, newest first', async () => {
    const clientId = randomUUID();
    const otherClientId = randomUUID();
    madeClientIds.push(clientId, otherClientId);
    const now = Date.now();
    await saveClient({ id: clientId, name: 'Payer', address: 'A', email: 'p@t.co', phone: '1', createdAt: now, updatedAt: now });
    await saveClient({ id: otherClientId, name: 'Other', address: 'A', email: 'o@t.co', phone: '1', createdAt: now, updatedAt: now });

    const older = randomUUID();
    const newer = randomUUID();
    const draftId = randomUUID();
    const othersId = randomUUID();
    madeDocIds.push(older, newer, draftId, othersId);

    const finalize = async (id: string, owner: string, issueDate: string) => {
      const claim = await claimSerial('INV', TEST_FY);
      await saveDocument({
        ...draftInvoice(id, owner),
        issueDate,
        status: 'finalized',
        number: claim.number,
        serial: claim.serial,
        year: 9999,
        finalizedAt: Date.now(),
      });
    };

    await finalize(older, clientId, '2026-05-01');
    await finalize(newer, clientId, '2026-09-01');
    await finalize(othersId, otherClientId, '2026-09-15');
    // A draft has no number yet, so it is not something a receipt can reference.
    await saveDocument(draftInvoice(draftId, clientId));

    const list = await listFinalizedInvoicesForClient(clientId);
    const ids = list.map((d) => d.id);

    expect(ids).toEqual([newer, older]);
    expect(ids).not.toContain(draftId);
    expect(ids).not.toContain(othersId);

    // The per-type list is the working surface, so it keeps drafts too.
    const invoices = await listDocumentsByType('INV');
    const invoiceIds = invoices.map((d) => d.id);
    expect(invoiceIds).toEqual(expect.arrayContaining([older, newer, draftId, othersId]));
    expect(invoices.every((d) => d.type === 'INV')).toBe(true);

    // Receipts share the table but must never appear in the invoice list.
    expect(await listDocumentsByType('REC')).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ id: newer })]),
    );

    // The newest *issued* invoice — never a draft.
    const latest = await getLatestFinalizedInvoice();
    expect(latest?.status).toBe('finalized');
    expect(latest?.id).not.toBe(draftId);

    // Search: a client by name, and that client's documents by foreign key.
    // Scoped to a profile — the client side, which is where clients live.
    const byClient = await searchEverything('Payer', 'client');
    expect(byClient.clients.map((c) => c.id)).toContain(clientId);
    expect(byClient.documents.some((d) => d.clientId === clientId)).toBe(true);

    // ...and a document by its number, case-insensitively.
    const numbered = (await getLatestFinalizedInvoice())!.number!;
    const byNumber = await searchEverything(numbered.toLowerCase(), 'client');
    expect(byNumber.documents.map((d) => d.number)).toContain(numbered);

    // A one-character query is not a search — it would match everything.
    expect(await searchEverything('P', 'client')).toEqual({
      documents: [], clients: [], employees: [], services: [],
    });
  });
});
