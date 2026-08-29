import type { AdminDocument } from '@/lib/domain/types';

/**
 * Copying a slip forward into the next month.
 *
 * Distinct from `duplicateDocument`, which keeps the wage month because it
 * exists to *correct* an issued document. The two must stay separate: a
 * correction that landed silently in the following month, or a July slip that
 * still said June, would both be wrong in a way nobody would notice until it
 * was filed.
 *
 * The copy is also what makes a salary's history: each slip is dated and states
 * what was actually paid that month, so a raise is one edit on the next copy
 * and needs no effective-date field anywhere.
 */

const authorized = jest.fn();
const getDocument = jest.fn();
const saveDocument = jest.fn((_doc: AdminDocument) => Promise.resolve());

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  getDocument: (...a: unknown[]) => getDocument(...a),
  saveDocument: (...a: unknown[]) => saveDocument(a[0] as AdminDocument),
  getClient: () => Promise.resolve(null),
  getEmployee: () => Promise.resolve(null),
  getStudioSettings: () => Promise.resolve(undefined),
  deleteDraft: () => Promise.resolve(),
  listFinalizedInvoicesForClient: () => Promise.resolve([]),
}));
jest.mock('@/db/counter', () => ({ claimSerial: jest.fn() }));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
// The PDF is rendered at finalize and stored (`server/pdf/store.ts`). Mocked
// here rather than exercised: these tests are about what finalize records, and
// `storePdfQuietly` deliberately cannot fail a finalize, so a real render would
// prove nothing about them and would need a browser to do it.
jest.mock('@/server/pdf/store', () => ({ storePdfQuietly: jest.fn() }));
jest.mock('@/server/pdf/url', () => ({
  printUrlFor: () => Promise.resolve('http://localhost/print'),
}));

import { copySlipForNextMonth } from '../documents';

const ACTOR = { userId: 'user_1', email: 'ops@qera.studio' };

function paySlip(overrides: Record<string, unknown> = {}): AdminDocument {
  return {
    id: 'slip-1',
    type: 'PAY',
    status: 'finalized',
    number: 'QS-PAY-2627-003',
    serial: 3,
    year: 2026,
    finalizedAt: 1,
    issueDate: '2026-06-30',
    gstRatePercent: 0,
    lineItems: [
      { description: 'Basic salary', ratePaise: 2_500_000, qty: 1 },
      { description: 'House rent allowance', ratePaise: 1_000_000, qty: 1 },
      { description: 'Special allowance', ratePaise: 1_500_000, qty: 1 },
    ],
    deductions: [{ description: 'TDS under section 192', ratePaise: 250_000, qty: 1 }],
    employeeId: 'emp-1',
    employeeSnapshot: { name: 'Ananya Rao', engagementType: 'employee' },
    stipendMonth: '2026-06',
    stipendPeriodStart: '2026-06-01',
    stipendPeriodEnd: '2026-06-30',
    daysInPeriod: 30,
    daysPaid: 22,
    lopDays: 8,
    paymentMethod: 'Bank Transfer',
    paymentReference: 'HDFC/NEFT/202606301234',
    deductionsNote: 'TDS deducted under section 192.',
    studioSnapshot: { legalName: 'Qera Private Limited' },
    createdBy: { userId: 'someone_else', email: 'old@qera.studio' },
    finalizedBy: { userId: 'someone_else', email: 'old@qera.studio' },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  } as unknown as AdminDocument;
}

function saved() {
  return saveDocument.mock.calls.at(-1)![0] as AdminDocument & Record<string, unknown>;
}

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(ACTOR);
});

describe('copySlipForNextMonth', () => {
  it('moves the wage month and its period on by one', async () => {
    getDocument.mockResolvedValue(paySlip());

    const result = await copySlipForNextMonth('slip-1');

    expect(result.success).toBe(true);
    expect(saved().stipendMonth).toBe('2026-07');
    expect(saved().stipendPeriodStart).toBe('2026-07-01');
    expect(saved().stipendPeriodEnd).toBe('2026-07-31');
  });

  it('rolls the year over in December', async () => {
    getDocument.mockResolvedValue(
      paySlip({ stipendMonth: '2026-12', stipendPeriodStart: '2026-12-01', stipendPeriodEnd: '2026-12-31' }),
    );

    await copySlipForNextMonth('slip-1');

    expect(saved().stipendMonth).toBe('2027-01');
    expect(saved().stipendPeriodEnd).toBe('2027-01-31');
  });

  /** February is not 31 days, and the day counts have to know that. */
  it('follows the real length of the new month', async () => {
    getDocument.mockResolvedValue(
      paySlip({ stipendMonth: '2028-01', stipendPeriodStart: '2028-01-01', stipendPeriodEnd: '2028-01-31' }),
    );

    await copySlipForNextMonth('slip-1');

    expect(saved().stipendPeriodEnd).toBe('2028-02-29'); // 2028 is a leap year
    expect(saved().daysInPeriod).toBe(29);
  });

  /**
   * The whole point: the salary carries, so next month's slip arrives already
   * saying what this person is paid. A raise is one edit on the copy, and every
   * copy after that carries the new figures.
   */
  it('carries the earnings and the deductions', async () => {
    getDocument.mockResolvedValue(paySlip());

    await copySlipForNextMonth('slip-1');

    expect(saved().lineItems).toHaveLength(3);
    expect(saved().lineItems[0]).toMatchObject({ description: 'Basic salary', ratePaise: 2_500_000 });
    expect((saved().deductions as unknown[]) ?? []).toHaveLength(1);
    expect(saved().paymentMethod).toBe('Bank Transfer');
    expect(saved().deductionsNote).toBe('TDS deducted under section 192.');
  });

  describe('what must not carry', () => {
    /** Last month's bank reference is a false statement about this month. */
    it('drops the payment reference', async () => {
      getDocument.mockResolvedValue(paySlip());
      await copySlipForNextMonth('slip-1');
      expect(saved().paymentReference).toBeUndefined();
    });

    /**
     * Someone's absence in June is not their absence in July, and "22 of 30"
     * carried forward silently is the kind of error that reads as deliberate.
     */
    it('resets the day counts to a full new month', async () => {
      getDocument.mockResolvedValue(paySlip());
      await copySlipForNextMonth('slip-1');

      expect(saved().daysInPeriod).toBe(31);
      expect(saved().daysPaid).toBe(31);
      expect(saved().lopDays).toBe(0);
    });

    /** A slip prepared in advance must not be dated before the month it covers. */
    it('dates the copy at the end of the new wage month', async () => {
      getDocument.mockResolvedValue(paySlip());
      await copySlipForNextMonth('slip-1');
      expect(saved().issueDate).toBe('2026-07-31');
    });

    it('sheds the number and the finalized state', async () => {
      getDocument.mockResolvedValue(paySlip());
      await copySlipForNextMonth('slip-1');

      expect(saved().id).not.toBe('slip-1');
      expect(saved().status).toBe('draft');
      expect(saved().number).toBeUndefined();
      expect(saved().serial).toBeUndefined();
      expect(saved().finalizedAt).toBeUndefined();
      // Re-frozen when this one is finalized in its own right.
      expect(saved().studioSnapshot).toBeUndefined();
    });

    /** Otherwise a fresh draft is credited to whoever issued the original. */
    it('takes the audit trail from whoever made the copy', async () => {
      getDocument.mockResolvedValue(paySlip());
      await copySlipForNextMonth('slip-1');

      expect(saved().createdBy).toEqual(ACTOR);
      expect(saved().finalizedBy).toBeUndefined();
    });
  });

  /**
   * A stipend slip has no day counts, and gaining them here would make it read
   * like a wage record.
   */
  it('leaves a stipend slip without day counts', async () => {
    getDocument.mockResolvedValue(
      paySlip({
        type: 'STP',
        deductions: undefined,
        daysInPeriod: undefined,
        daysPaid: undefined,
        lopDays: undefined,
      }),
    );

    await copySlipForNextMonth('slip-1');

    expect(saved().stipendMonth).toBe('2026-07');
    expect(saved().daysInPeriod).toBeUndefined();
    expect(saved().daysPaid).toBeUndefined();
    expect(saved().lopDays).toBeUndefined();
  });

  describe('refusals', () => {
    it('refuses a signed-out caller', async () => {
      authorized.mockResolvedValue(null);
      const result = await copySlipForNextMonth('slip-1');

      expect(result.success).toBe(false);
      expect(saveDocument).not.toHaveBeenCalled();
    });

    /** Only a slip covers a month; an invoice has nothing to move forward. */
    it('refuses a document that is not a slip', async () => {
      getDocument.mockResolvedValue(paySlip({ type: 'INV' }));
      const result = await copySlipForNextMonth('slip-1');

      expect(result.success).toBe(false);
      expect(saveDocument).not.toHaveBeenCalled();
    });

    it('refuses a slip with no wage month recorded', async () => {
      getDocument.mockResolvedValue(paySlip({ stipendMonth: '' }));
      const result = await copySlipForNextMonth('slip-1');

      expect(result.success).toBe(false);
      expect(saveDocument).not.toHaveBeenCalled();
    });

    it('refuses an id that is not a document', async () => {
      getDocument.mockResolvedValue(null);
      const result = await copySlipForNextMonth('nope');

      expect(result.success).toBe(false);
      expect(saveDocument).not.toHaveBeenCalled();
    });
  });
});
