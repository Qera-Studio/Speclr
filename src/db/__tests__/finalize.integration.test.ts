/**
 * @jest-environment node
 *
 * INTEGRATION test against the live Neon Postgres (`npm run test:int`). It is
 * the only way to see `finalizeStoredDocument`'s SQL and the
 * `0022_documents_immutable` trigger actually hold: a mock answers whatever it
 * is told.
 *
 * Isolated by construction: random ids, the test financial year '9999', and a
 * teardown that removes exactly what it made. The finalized rows go through
 * the trigger's one exception, `speclr.purge_finalized`, which is the
 * teardown that proves the exception works too.
 */
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../index';
import { counters, documents } from '../schema';
import { finalizeStoredDocument, getDocument, saveDocument } from '../store';
import { formatDocNumber } from '@/lib/domain/docNumber';
import type { InvoiceDocument } from '@/lib/domain/types';

const TEST_FY = '9999';
const made: string[] = [];

afterAll(async () => {
  for (const id of made) {
    await db.batch([
      db.execute(sql`select set_config('speclr.purge_finalized', 'on', true)`),
      db.delete(documents).where(eq(documents.id, id)),
    ]);
  }
  await db.delete(counters).where(and(eq(counters.docType, 'INV'), eq(counters.fyCode, TEST_FY)));
});

async function draft(): Promise<InvoiceDocument> {
  const now = Date.now();
  const doc: InvoiceDocument = {
    id: randomUUID(),
    type: 'INV',
    status: 'draft',
    clientId: undefined as unknown as string,
    clientSnapshot: { name: '', address: '', email: '', phone: '' },
    issueDate: '2026-06-10',
    lineItems: [{ description: 'Integration test', ratePaise: 100_000, qty: 1 }],
    gstRatePercent: 0,
    createdAt: now,
    updatedAt: now,
  } as InvoiceDocument;
  made.push(doc.id);
  await saveDocument(doc);
  return doc;
}

const claim = { claim: { code: 'INV' as const, fyCode: TEST_FY } };

describe('finalizing in one statement (integration)', () => {
  it('issues under the next serial, formatted as formatDocNumber formats it', async () => {
    const doc = await draft();
    const issued = await finalizeStoredDocument(doc, claim);
    expect(issued?.serial).toBeGreaterThan(0);
    expect(issued?.number).toBe(formatDocNumber('INV', TEST_FY, issued!.serial!));
    expect((await getDocument(doc.id))?.status).toBe('finalized');
  });

  it('issues once when finalized twice at the same moment, burning no number', async () => {
    const doc = await draft();
    const before = await db.select().from(counters).where(and(eq(counters.docType, 'INV'), eq(counters.fyCode, TEST_FY)));
    const results = await Promise.all([finalizeStoredDocument(doc, claim), finalizeStoredDocument(doc, claim)]);
    const after = await db.select().from(counters).where(and(eq(counters.docType, 'INV'), eq(counters.fyCode, TEST_FY)));

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(after[0]!.lastSerial).toBe((before[0]?.lastSerial ?? 0) + 1);
  });

  it('refuses to save over an issued document, at the store and in the database', async () => {
    const doc = await draft();
    await finalizeStoredDocument(doc, claim);

    await expect(saveDocument({ ...doc, notes: 'tampered' } as InvoiceDocument)).rejects.toThrow(/immutable/);
    // Drizzle wraps the database's error; the trigger's message is the cause.
    const refused = { cause: expect.objectContaining({ message: expect.stringMatching(/immutable/) }) };
    await expect(db.update(documents).set({ totalPaise: 1 }).where(eq(documents.id, doc.id))).rejects.toMatchObject(
      refused,
    );
    await expect(db.delete(documents).where(eq(documents.id, doc.id))).rejects.toMatchObject(refused);
  });

  it('claims nothing for a document that is no longer a draft', async () => {
    const doc = await draft();
    await finalizeStoredDocument(doc, claim);
    const before = await db.select().from(counters).where(and(eq(counters.docType, 'INV'), eq(counters.fyCode, TEST_FY)));

    expect(await finalizeStoredDocument(doc, claim)).toBeNull();

    const after = await db.select().from(counters).where(and(eq(counters.docType, 'INV'), eq(counters.fyCode, TEST_FY)));
    expect(after[0]!.lastSerial).toBe(before[0]!.lastSerial);
  });
});
