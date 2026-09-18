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
import { eq, gte } from 'drizzle-orm';
import { db } from '../index';
import { clauses, clients, counters, documents, services } from '../schema';
import {
  archiveClause,
  archiveService,
  deleteClause,
  deleteDraft,
  getClient,
  getDocument,
  getService,
  insertService,
  listClauses,
  listDocuments,
  getLatestFinalizedInvoice,
  listServices,
  nextClauseNumber,
  saveClause,
  saveService,
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

/**
 * A Service's menu lives inside the `content` JSONB column and rides through
 * the store's spread both ways. The unit tests prove the schema and the
 * actions with a mocked store; this proves the column and the mapper on the
 * real thing, which is where a JSONB field that quietly dropped a key would
 * show up.
 *
 * Code '98' is claimed for the test and removed afterwards, so the catalogue's
 * next assigned code is not shifted by a leftover.
 */
describe('services (integration)', () => {
  const CODE = '98';

  afterAll(async () => {
    await db.delete(services).where(eq(services.code, CODE));
  });

  it('round-trips a menu through the content column, and archives without deleting', async () => {
    // A leftover from an interrupted run would make the insert collide.
    await db.delete(services).where(eq(services.code, CODE));

    await insertService({
      code: CODE,
      name: 'Integration service',
      scheduleKey: 'build',
      sortOrder: 99,
      archived: false,
      dependencies: [],
      pairings: [],
      overview: ['A service that exists only while this test runs.'],
      included: [],
      accountTerms: [],
      limits: [],
      limitsNotes: [],
      completion: [],
      receives: [],
      receivesNotes: [],
      thirdPartyCosts: '',
      exclusionIds: [],
      clientInputIds: [],
      fee: [],
      menu: [{ id: 'M1', text: 'One', ratePaise: 100, unit: 'fixed' }],
      menuSeq: 1,
    });

    const read = await getService(CODE);
    expect(read?.menu).toEqual([{ id: 'M1', text: 'One', ratePaise: 100, unit: 'fixed' }]);
    expect(read?.menuSeq).toBe(1);

    // A second line through the upsert path, with every other field standing.
    await saveService({
      ...read!,
      menu: [...read!.menu!, { id: 'M2', text: 'Two', unit: 'monthly', unitLabel: undefined }],
      menuSeq: 2,
    });
    const again = await getService(CODE);
    expect(again?.menu?.map((m) => m.id)).toEqual(['M1', 'M2']);
    expect(again?.menu?.[1]).toEqual({ id: 'M2', text: 'Two', unit: 'monthly' });
    expect(again?.menuSeq).toBe(2);
    expect(again?.overview).toEqual(['A service that exists only while this test runs.']);

    // Archived: gone from the default list, still readable, menu intact.
    await archiveService(CODE);
    expect((await listServices()).some((s) => s.code === CODE)).toBe(false);
    expect((await listServices(true)).some((s) => s.code === CODE)).toBe(true);
    expect((await getService(CODE))?.menu).toHaveLength(2);
  });
});

/**
 * The one rule the clause library is built on: **a number, once used, is never
 * handed out again.** Clause bodies cite each other by number ('the meaning
 * given at clause 11.2'), so a reissued number silently changes what a signed
 * agreement says.
 *
 * Archiving has always held that line by leaving the row in place. Deleting is
 * the case this pins: the row really goes, and `nextClauseNumber` must still
 * count past it. It does so through a high-water mark in `counters`, which is
 * why this is an integration test rather than a unit one - the guarantee is two
 * tables agreeing, and a mock of either proves nothing.
 */
describe('clauses (integration)', () => {
  // Far above the 28 seeded clauses, so a real library is never touched.
  const FIRST = 9001;

  afterAll(async () => {
    await db.delete(clauses).where(gte(clauses.number, FIRST));
    await db.delete(counters).where(eq(counters.docType, 'CLAUSE'));
  });

  it('never reissues a number, whether a clause was archived or deleted', async () => {
    await db.delete(clauses).where(gte(clauses.number, FIRST));
    await db.delete(counters).where(eq(counters.docType, 'CLAUSE'));

    await saveClause({ number: FIRST, heading: 'Kept', body: ['Stays.'], archived: false });
    await saveClause({ number: FIRST + 1, heading: 'Archived', body: ['Hidden.'], archived: false });
    await saveClause({ number: FIRST + 2, heading: 'Deleted', body: ['Gone.'], archived: false });

    await archiveClause(FIRST + 1);
    await deleteClause(FIRST + 2);

    // The deleted row is really gone, archived or not.
    expect((await listClauses(true)).some((c) => c.number === FIRST + 2)).toBe(false);
    // The archived one is hidden, not removed.
    expect((await listClauses()).some((c) => c.number === FIRST + 1)).toBe(false);
    expect((await listClauses(true)).some((c) => c.number === FIRST + 1)).toBe(true);

    // And the deleted number is still spent: the next clause comes after it,
    // not into the hole it left.
    expect(await nextClauseNumber()).toBe(FIRST + 3);
  });
});
