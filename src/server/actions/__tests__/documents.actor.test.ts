import type { AdminDocument, ClientSnapshot } from '@/lib/domain/types';

/**
 * Who drafted a document and who *issued* it are two separate facts, recorded
 * at two different moments. These tests pin the three write paths that set
 * them — and the one that must deliberately reset them.
 */

const requireAuthorizedUser = jest.fn();
const getDocument = jest.fn();
const saveDocument = jest.fn((_doc: AdminDocument) => Promise.resolve());
const getClient = jest.fn();
const claimSerial = jest.fn(() => Promise.resolve({ serial: 1, number: 'QS-INV-2627-001' }));

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
jest.mock('@/db/counter', () => ({ claimSerial: () => claimSerial() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
// The PDF is rendered at finalize and stored (`server/pdf/store.ts`). Mocked
// here rather than exercised: these tests are about what finalize records, and
// `storePdfQuietly` deliberately cannot fail a finalize, so a real render would
// prove nothing about them and would need a browser to do it.
jest.mock('@/server/pdf/store', () => ({ storePdfQuietly: jest.fn() }));
jest.mock('@/server/pdf/url', () => ({
  printUrlFor: () => Promise.resolve('http://localhost/print'),
}));

import { createDraft, finalizeDocument, duplicateDocument } from '../documents';

const DRAFTER = { userId: 'user_drafter', email: 'shivanshu@qera.studio' };
const ISSUER = { userId: 'user_issuer', email: 'ops@qera.studio' };

const SNAPSHOT = { name: 'Clayora', companyName: 'Clayora Private Limited' } as ClientSnapshot;

/** A draft complete enough to pass the invoice finalize schema. */
function completeDraft(overrides: Partial<AdminDocument> = {}): AdminDocument {
  return {
    id: 'doc-1',
    type: 'INV',
    status: 'draft',
    clientId: 'client-1',
    clientSnapshot: SNAPSHOT,
    issueDate: '2026-06-10',
    lineItems: [{ description: 'Design retainer', ratePaise: 5_000_00, qty: 1 }],
    // Zero-rated keeps place-of-supply out of scope; GST validation is tested
    // elsewhere and isn't what this file is about. The client below is overseas
    // for the same reason: a domestic recipient's supply is taxed whatever the
    // document says, so a nil rate on one now needs a recorded reason.
    gstRatePercent: 0,
    createdAt: 1_750_000_000_000,
    updatedAt: 1_750_000_000_000,
    ...overrides,
  } as AdminDocument;
}

/** The document handed to `saveDocument` by the action under test. */
function saved(): AdminDocument {
  return saveDocument.mock.calls.at(-1)![0];
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthorizedUser.mockResolvedValue(DRAFTER);
  getClient.mockResolvedValue({
    id: 'client-1',
    name: 'Clayora',
    addressParts: { country: 'GB' },
  });
  saveDocument.mockResolvedValue(undefined);
});

describe('createDraft', () => {
  it('records who drafted it, and leaves it unissued', async () => {
    const result = await createDraft('INV', 'client-1', {
      issueDate: '2026-06-10',
      lineItems: [{ description: 'Design retainer', ratePaise: 500000, qty: 1 }],
      gstRatePercent: 0,
    });

    expect(result.success).toBe(true);
    expect(saved().createdBy).toEqual(DRAFTER);
    expect(saved().finalizedBy).toBeUndefined();
  });
});

describe('finalizeDocument', () => {
  it('records who issued it without overwriting who drafted it', async () => {
    getDocument.mockResolvedValue(completeDraft({ createdBy: DRAFTER }));
    requireAuthorizedUser.mockResolvedValue(ISSUER);

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(true);
    expect(saved().finalizedBy).toEqual(ISSUER);
    expect(saved().createdBy).toEqual(DRAFTER);
  });

  it('refuses to act — and records nobody — without an authorized session', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));
    getDocument.mockResolvedValue(completeDraft());

    const result = await finalizeDocument('doc-1');

    expect(result).toEqual({ success: false, error: 'Unauthorized.' });
    expect(saveDocument).not.toHaveBeenCalled();
  });
});

describe('duplicateDocument', () => {
  /**
   * The copy is built by spreading the original, so without an explicit reset
   * a duplicate would inherit the original's audit trail — crediting the new
   * draft to whoever wrote the document it was copied from, and marking an
   * unissued draft as already issued by someone who never saw it.
   */
  it('credits the duplicator and does not inherit the original audit trail', async () => {
    getDocument.mockResolvedValue(
      completeDraft({
        status: 'finalized',
        number: 'QS-INV-2627-001',
        createdBy: DRAFTER,
        finalizedBy: DRAFTER,
      }),
    );
    requireAuthorizedUser.mockResolvedValue(ISSUER);

    const result = await duplicateDocument('doc-1');

    expect(result.success).toBe(true);
    expect(saved().createdBy).toEqual(ISSUER);
    expect(saved().finalizedBy).toBeUndefined();
  });
});
