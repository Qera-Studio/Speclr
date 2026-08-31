import type { AdminDocument } from '@/lib/domain/types';
import { STUDIO_INFO } from '@/lib/domain/studio';

/**
 * The Service Quotation is the one document type addressed to nobody in
 * particular — no clientId, no employeeId, no snapshot of either. It breaks
 * the assumption every other type shares (`createDraft`/`updateDraft`/
 * `finalizeDocument` all fetch a client or an employee from the second
 * argument), so this pins the three-way branch added for it: it must save
 * with an empty recipient while every other type still refuses one.
 */

const requireAuthorizedUser = jest.fn();
const getDocument = jest.fn();
const saveDocument = jest.fn((_doc: AdminDocument) => Promise.resolve());
const getClient = jest.fn();
const getEmployee = jest.fn();
const claimSerial = jest.fn();
const getStudioSettings = jest.fn();

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: () => requireAuthorizedUser(),
}));
jest.mock('@/db/store', () => ({
  getDocument: (...a: unknown[]) => getDocument(...a),
  saveDocument: (...a: unknown[]) => saveDocument(a[0] as AdminDocument),
  getClient: (...a: unknown[]) => getClient(...a),
  getEmployee: (...a: unknown[]) => getEmployee(...a),
  getStudioSettings: () => getStudioSettings(),
  deleteDraft: () => Promise.resolve(),
  listFinalizedInvoicesForClient: () => Promise.resolve([]),
}));
jest.mock('@/db/counter', () => ({ claimSerial: (...a: unknown[]) => claimSerial(...a) }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
// The PDF is rendered at finalize and stored (`server/pdf/store.ts`). Mocked
// here rather than exercised: these tests are about what finalize records, and
// `storePdfQuietly` deliberately cannot fail a finalize, so a real render would
// prove nothing about them and would need a browser to do it.
jest.mock('@/server/pdf/store', () => ({ storePdfQuietly: jest.fn() }));
jest.mock('@/server/pdf/url', () => ({
  printUrlFor: () => Promise.resolve('http://localhost/print'),
}));

import { createDraft, finalizeDocument, updateDraft } from '../documents';

const ACTOR = { userId: 'user_1', email: 'ops@qera.studio' };

function draftQuotation(overrides: Partial<AdminDocument> = {}): AdminDocument {
  return {
    id: 'qtn-1',
    type: 'SQ',
    status: 'draft',
    issueDate: '2026-08-27',
    lineItems: [],
    gstRatePercent: 0,
    services: [
      {
        name: 'Custom Website',
        lines: [{ description: 'Web design', ratePaise: 1_500_000, qty: 1 }],
        addOns: [],
      },
    ],
    recurring: [],
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as AdminDocument;
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthorizedUser.mockResolvedValue(ACTOR);
  claimSerial.mockResolvedValue({ serial: 1, number: 'QS-SQ-2627-001' });
  getStudioSettings.mockResolvedValue(STUDIO_INFO);
});

describe('createDraft — the quotation is the one type addressed to nobody', () => {
  it('accepts an empty recipient for a quotation', async () => {
    const result = await createDraft('SQ', '', {
      issueDate: '2026-08-27',
      services: [],
      recurring: [],
    });
    expect(result.success).toBe(true);
    expect(getClient).not.toHaveBeenCalled();
    expect(getEmployee).not.toHaveBeenCalled();
    const saved = saveDocument.mock.calls.at(-1)?.[0] as AdminDocument;
    expect(saved.type).toBe('SQ');
    expect('clientId' in saved).toBe(false);
    expect('employeeId' in saved).toBe(false);
  });

  it('still refuses an empty recipient for an invoice', async () => {
    const result = await createDraft('INV', '', {
      issueDate: '2026-08-27',
      lineItems: [],
      gstRatePercent: 18,
    });
    expect(result.success).toBe(false);
    expect(saveDocument).not.toHaveBeenCalled();
  });
});

describe('updateDraft — a quotation draft saves with no recipient', () => {
  it('updates an existing quotation draft with an empty recipient id', async () => {
    getDocument.mockResolvedValue(draftQuotation());
    const result = await updateDraft('qtn-1', '', {
      issueDate: '2026-08-27',
      companyName: 'The Colorist',
      services: [
        {
          name: 'Social Media',
          lines: [{ description: 'Content Creation', ratePaise: 1_535_000, qty: 1 }],
          addOns: [],
        },
      ],
      recurring: [],
    });
    expect(result.success).toBe(true);
    expect(getClient).not.toHaveBeenCalled();
    expect(saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: 'The Colorist' }),
    );
  });
});

describe('finalizeDocument — a quotation neither of the subject snapshots applies to', () => {
  it('claims a QS-SQ number, freezes the studio snapshot, and freezes neither party snapshot', async () => {
    getDocument.mockResolvedValue(draftQuotation());
    const result = await finalizeDocument('qtn-1');

    expect(result.success).toBe(true);
    expect(claimSerial).toHaveBeenCalledWith('SQ', expect.any(String));
    expect(getClient).not.toHaveBeenCalled();
    expect(getEmployee).not.toHaveBeenCalled();

    const saved = saveDocument.mock.calls.at(-1)?.[0] as AdminDocument;
    expect(saved.number).toBe('QS-SQ-2627-001');
    expect(saved.studioSnapshot).toEqual(STUDIO_INFO);
    expect('clientSnapshot' in saved).toBe(false);
    expect('employeeSnapshot' in saved).toBe(false);
  });
});
