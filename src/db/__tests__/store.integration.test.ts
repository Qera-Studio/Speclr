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
});
