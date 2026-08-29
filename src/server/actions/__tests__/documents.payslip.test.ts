import type { AdminDocument, EmployeeSnapshot } from '@/lib/domain/types';
import type { EmployeeRecord } from '@/lib/domain/employee';

/**
 * Finalizing a pay slip.
 *
 * Two things are load-bearing here. A pay slip asserts wages paid under a
 * contract of employment, so issuing one to an intern would contradict their
 * stipend slip, offer letter and completion letter — the schema cannot see the
 * engagement type (it comes from the employee record, not the payload), so the
 * guard lives in the action and is tested here.
 *
 * And the pay slip claims its number from its own per-FY sequence, so a wage
 * register is not interleaved with intern stipends.
 */

const requireAuthorizedUser = jest.fn();
const getDocument = jest.fn();
const saveDocument = jest.fn((_doc: AdminDocument) => Promise.resolve());
const getEmployee = jest.fn();
const claimSerial = jest.fn();

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: () => requireAuthorizedUser(),
}));
jest.mock('@/db/store', () => ({
  getDocument: (...a: unknown[]) => getDocument(...a),
  saveDocument: (...a: unknown[]) => saveDocument(a[0] as AdminDocument),
  getEmployee: (...a: unknown[]) => getEmployee(...a),
  getClient: () => Promise.resolve(null),
  getStudioSettings: () => Promise.resolve(undefined),
  deleteDraft: () => Promise.resolve(),
  listFinalizedInvoicesForClient: () => Promise.resolve([]),
}));
jest.mock('@/db/counter', () => ({
  claimSerial: (...a: unknown[]) => claimSerial(...a),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
// The PDF is rendered at finalize and stored (`server/pdf/store.ts`). Mocked
// here rather than exercised: these tests are about what finalize records, and
// `storePdfQuietly` deliberately cannot fail a finalize, so a real render would
// prove nothing about them and would need a browser to do it.
jest.mock('@/server/pdf/store', () => ({ storePdfQuietly: jest.fn() }));
jest.mock('@/server/pdf/url', () => ({
  printUrlFor: () => Promise.resolve('http://localhost/print'),
}));

import { finalizeDocument } from '../documents';

const ACTOR = { userId: 'user_issuer', email: 'ops@qera.studio' };

function employee(overrides: Partial<EmployeeRecord> = {}): EmployeeRecord {
  return {
    id: 'emp-1',
    name: 'Ananya Rao',
    address: 'Sector 12, Ghaziabad',
    email: 'ananya@example.com',
    phone: '+919000000000',
    role: 'Senior Designer',
    engagementType: 'employee',
    pronoun: 'she',
    joiningDate: '2025-04-01',
    payAmountPaise: 6_000_000,
    bank: { bankName: 'HDFC Bank', accountNo: '1234567890', ifsc: 'HDFC0001234' },
    payroll: { employeeCode: 'QS-004', pan: 'ABCPR1234F' },
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

/** A pay slip draft complete enough to pass the finalize schema. */
function payDraft(overrides: Partial<AdminDocument> = {}): AdminDocument {
  return {
    id: 'doc-1',
    type: 'PAY',
    status: 'draft',
    employeeId: 'emp-1',
    issueDate: '2026-06-30',
    lineItems: [{ description: 'Basic', ratePaise: 6_000_000, qty: 1 }],
    deductions: [{ description: 'TDS under section 192', ratePaise: 250_000, qty: 1 }],
    gstRatePercent: 0,
    stipendMonth: '2026-06',
    paymentMethod: 'Bank Transfer',
    deductionsNote: '',
    createdAt: 1_750_000_000_000,
    updatedAt: 1_750_000_000_000,
    ...overrides,
  } as AdminDocument;
}

function saved(): AdminDocument {
  return saveDocument.mock.calls.at(-1)![0];
}

beforeEach(() => {
  jest.clearAllMocks();
  requireAuthorizedUser.mockResolvedValue(ACTOR);
  getEmployee.mockResolvedValue(employee());
  saveDocument.mockResolvedValue(undefined);
  claimSerial.mockResolvedValue({ serial: 1, number: 'QS-PAY-2627-001' });
});

describe('finalizing a pay slip', () => {
  it('refuses to issue one to an intern, naming them', async () => {
    getDocument.mockResolvedValue(payDraft());
    getEmployee.mockResolvedValue(employee({ engagementType: 'intern' }));

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Ananya Rao/);
    expect(result.error).toMatch(/intern/i);
    expect(result.error).toMatch(/stipend slip/i);
  });

  /** Refusing after claiming would burn a wage-register serial on nothing. */
  it('refuses before claiming a number, and saves nothing', async () => {
    getDocument.mockResolvedValue(payDraft());
    getEmployee.mockResolvedValue(employee({ engagementType: 'intern' }));

    await finalizeDocument('doc-1');

    expect(claimSerial).not.toHaveBeenCalled();
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('issues one to an employee', async () => {
    getDocument.mockResolvedValue(payDraft());

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(true);
    expect(saved()).toMatchObject({ status: 'finalized', number: 'QS-PAY-2627-001' });
  });

  /** Its own sequence, not the stipend slip's. */
  it('claims its serial from the PAY counter', async () => {
    getDocument.mockResolvedValue(payDraft());

    await finalizeDocument('doc-1');

    expect(claimSerial).toHaveBeenCalledWith('PAY', '2627');
  });

  it('freezes the statutory identifiers onto the slip', async () => {
    getDocument.mockResolvedValue(payDraft());

    await finalizeDocument('doc-1');

    const snapshot = (saved() as { employeeSnapshot: EmployeeSnapshot }).employeeSnapshot;
    expect(snapshot.payroll).toEqual({ employeeCode: 'QS-004', pan: 'ABCPR1234F' });
    expect(snapshot.role).toBe('Senior Designer');
  });

  /** The wording is materialised at finalize, exactly as the studio block is. */
  it('freezes the pay slip wording onto the slip', async () => {
    getDocument.mockResolvedValue(payDraft());

    await finalizeDocument('doc-1');

    const terms = saved().content?.terms ?? [];
    const all = terms.flatMap((t) => [t.title, t.body]).join(' ').toLowerCase();
    expect(all).toMatch(/deductions authorised by law/);
    expect(all).not.toMatch(/internship/);
  });

  /** A stipend slip issued to an employee is fine — only PAY is restricted. */
  it('still lets a stipend slip name an employee', async () => {
    getDocument.mockResolvedValue(payDraft({ type: 'STP', deductions: undefined }));
    claimSerial.mockResolvedValue({ serial: 1, number: 'QS-STP-2627-001' });

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(true);
    expect(claimSerial).toHaveBeenCalledWith('STP', '2627');
  });
});

/**
 * No lawful set of deductions leaves an employee owing wages back, so a
 * negative net is always a mistyped figure. A finalized slip is immutable, so
 * catching it before issue is the only chance to catch it cheaply.
 */
describe('a pay slip whose deductions exceed gross', () => {
  it('is refused at finalize', async () => {
    getDocument.mockResolvedValue(
      payDraft({
        lineItems: [{ description: 'Basic', ratePaise: 100_000, qty: 1 }],
        deductions: [{ description: 'Advance recovery', ratePaise: 150_000, qty: 1 }],
      }),
    );

    const result = await finalizeDocument('doc-1');

    expect(result.success).toBe(false);
    expect(claimSerial).not.toHaveBeenCalled();
    expect(saveDocument).not.toHaveBeenCalled();
  });

  it('is issued when it nets exactly zero', async () => {
    getDocument.mockResolvedValue(
      payDraft({
        lineItems: [{ description: 'Basic', ratePaise: 100_000, qty: 1 }],
        deductions: [{ description: 'Advance recovery', ratePaise: 100_000, qty: 1 }],
      }),
    );

    expect((await finalizeDocument('doc-1')).success).toBe(true);
  });
});
