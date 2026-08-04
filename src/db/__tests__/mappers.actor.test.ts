import { toRow, fromRow, type DocumentRow } from '../mappers';
import type { AdminDocument, ClientSnapshot } from '@/lib/domain/types';

/**
 * The audit trail has to survive the round trip through Postgres, or it isn't
 * an audit trail. `Actor` is one object in the domain and two columns in the
 * table, so the split/rejoin is the part that can silently lose a name.
 */

const SNAPSHOT = { name: 'Clayora', companyName: 'Clayora Private Limited' } as ClientSnapshot;

function invoice(overrides: Partial<AdminDocument> = {}): AdminDocument {
  return {
    id: 'doc-1',
    type: 'INV',
    status: 'draft',
    clientId: 'client-1',
    clientSnapshot: SNAPSHOT,
    issueDate: '2026-06-10',
    lineItems: [],
    gstRatePercent: 0,
    createdAt: 1_750_000_000_000,
    updatedAt: 1_750_000_000_000,
    ...overrides,
  } as AdminDocument;
}

/** Round-trip a document through the row shape, as the store does. */
function roundTrip(doc: AdminDocument): AdminDocument {
  return fromRow(toRow(doc) as DocumentRow);
}

describe('document actors survive persistence', () => {
  const drafter = { userId: 'user_abc', email: 'shivanshu@qera.studio' };
  const issuer = { userId: 'user_xyz', email: 'ops@qera.studio' };

  it('preserves the drafter through a save/load cycle', () => {
    expect(roundTrip(invoice({ createdBy: drafter })).createdBy).toEqual(drafter);
  });

  it('keeps drafter and issuer as two independent facts', () => {
    const stored = roundTrip(invoice({ createdBy: drafter, finalizedBy: issuer }));
    expect(stored.createdBy).toEqual(drafter);
    expect(stored.finalizedBy).toEqual(issuer);
  });

  it('splits an actor into its id and email columns', () => {
    const row = toRow(invoice({ createdBy: drafter }));
    expect(row.createdBy).toBe('user_abc');
    expect(row.createdByEmail).toBe('shivanshu@qera.studio');
  });

  it('reports no actor for documents issued before actor recording existed', () => {
    const stored = roundTrip(invoice());
    expect(stored.createdBy).toBeUndefined();
    expect(stored.finalizedBy).toBeUndefined();
  });

  /**
   * A half-written actor is not evidence. Reporting "unknown" is honest;
   * inventing an identity from one surviving column is not.
   */
  it('treats a half-written actor as unknown rather than guessing', () => {
    const row = { ...toRow(invoice()), createdBy: 'user_abc', createdByEmail: null } as DocumentRow;
    expect(fromRow(row).createdBy).toBeUndefined();

    const emailOnly = {
      ...toRow(invoice()),
      createdBy: null,
      createdByEmail: 'shivanshu@qera.studio',
    } as DocumentRow;
    expect(fromRow(emailOnly).createdBy).toBeUndefined();
  });
});
