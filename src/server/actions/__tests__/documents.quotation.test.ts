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

/**
 * A stated schedule survives the save.
 *
 * The tests below hand `finalizeDocument` a document that already carries
 * phases, so they exercise the *check* and never the write. `assembleDoc` was
 * dropping `paymentPhases` while the schema validated it and the mapper stored
 * it, which is a field that passes every test either side of the one place it
 * is lost: an edited schedule saved, and the document came back with the band
 * it started from.
 */
describe('updateDraft — an edited payment schedule is what gets stored', () => {
  it('saves the phases the editor sent', async () => {
    getDocument.mockResolvedValue(draftQuotation());
    const paymentPhases = [
      { label: 'On signing', percent: 40 },
      { label: 'On delivery', percent: 60 },
    ];
    const result = await updateDraft('qtn-1', '', {
      issueDate: '2026-08-27',
      services: [],
      recurring: [],
      paymentPhases,
    });

    expect(result.success).toBe(true);
    const saved = saveDocument.mock.calls.at(-1)?.[0] as AdminDocument;
    expect(saved).toMatchObject({ paymentPhases });
  });

  /** Removing the last phase is how the editor returns to the derivation. */
  it('carries an absent schedule through as absent', async () => {
    getDocument.mockResolvedValue(
      draftQuotation({
        paymentPhases: [{ label: 'On signing', percent: 100 }],
      } as Partial<AdminDocument>),
    );
    const result = await updateDraft('qtn-1', '', {
      issueDate: '2026-08-27',
      services: [],
      recurring: [],
    });

    expect(result.success).toBe(true);
    const saved = saveDocument.mock.calls.at(-1)?.[0] as AdminDocument;
    expect((saved as { paymentPhases?: unknown }).paymentPhases).toBeUndefined();
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

/**
 * The payment schedule is `PRINCIPLES.md` rule 3's stated exception: derived
 * by default, override explicit. So the only thing finalize has to hold is
 * that a *stated* schedule bills the whole project. It is refused rather than
 * scaled, because 30/30/30 is arithmetic slipping, and normalising it to 100
 * would issue a schedule nobody wrote.
 */
describe('finalizeDocument — a stated payment schedule bills 100%', () => {
  it('refuses phases that do not add up, naming the figure', async () => {
    getDocument.mockResolvedValue(
      draftQuotation({
        paymentPhases: [
          { label: 'On signing', percent: 30 },
          { label: 'On delivery', percent: 30 },
        ],
      } as Partial<AdminDocument>),
    );
    const result = await finalizeDocument('qtn-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/60%/);
    expect(claimSerial).not.toHaveBeenCalled();
  });

  it('accepts phases that do', async () => {
    getDocument.mockResolvedValue(
      draftQuotation({
        paymentPhases: [
          { label: 'On signing', percent: 40 },
          { label: 'On delivery', percent: 60 },
        ],
      } as Partial<AdminDocument>),
    );
    expect((await finalizeDocument('qtn-1')).success).toBe(true);
  });

  /** Nothing stated is the ordinary case, and the bands already make 100. */
  it('checks nothing when the schedule is derived', async () => {
    getDocument.mockResolvedValue(draftQuotation());
    expect((await finalizeDocument('qtn-1')).success).toBe(true);
  });
});
