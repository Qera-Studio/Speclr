import { toRow, fromRow, type DocumentRow } from '../mappers';
import { contentOf, materialiseContent } from '@/lib/domain/docContent';
import { DOC_TYPES } from '@/lib/domain/registry';
import type { AdminDocument, EmployeeSnapshot } from '@/lib/domain/types';

/**
 * The frozen wording has to survive the round trip through Postgres, or it is
 * not frozen at all.
 *
 * `finalizeDocument` calls `materialiseContent` so an issued document reprints
 * unchanged whatever the defaults in code become (CONTEXT.md §5b, the same
 * compliance rule as the studio snapshot). That guarantee lives or dies in the
 * mapper: `content` used to be computed at finalize and then dropped on save,
 * so finalized sheets silently re-resolved today's defaults at render.
 *
 * The stipend slip's `currency` and ISO period pair were dropped the same way —
 * an issued slip lost the currency it was paid in.
 */

const EMPLOYEE = {
  name: 'Aarav Sharma',
  engagementType: 'intern',
} as EmployeeSnapshot;

function stipend(overrides: Partial<AdminDocument> = {}): AdminDocument {
  return {
    id: 'doc-1',
    type: 'STP',
    status: 'draft',
    employeeId: 'emp-1',
    employeeSnapshot: EMPLOYEE,
    issueDate: '2026-06-10',
    lineItems: [{ description: 'Internship Stipend', ratePaise: 1_500_000, qty: 1 }],
    gstRatePercent: 0,
    stipendMonth: '2026-06',
    paymentMethod: 'Bank Transfer',
    deductionsNote: 'No statutory deductions (PF, ESI, TDS) are applicable.',
    createdAt: 1_750_000_000_000,
    updatedAt: 1_750_000_000_000,
    ...overrides,
  } as AdminDocument;
}

/** Round-trip a document through the row shape, as the store does. */
function roundTrip(doc: AdminDocument): AdminDocument {
  return fromRow(toRow(doc) as DocumentRow);
}

describe('document content survives persistence', () => {
  it('keeps a draft edit through a save/load cycle', () => {
    const stored = roundTrip(stipend({ content: { masthead: 'HONORARIUM' } }));
    expect(stored.content).toEqual({ masthead: 'HONORARIUM' });
  });

  it('leaves content absent on a document that was never edited', () => {
    expect(roundTrip(stipend()).content).toBeUndefined();
  });

  /**
   * The one that matters. Finalize resolves every word against today's defaults
   * and stores the result; reloading must reprint exactly that, not re-resolve.
   */
  it('reprints a finalized document from its frozen wording, not the defaults', () => {
    const spec = DOC_TYPES.STP;
    const draft = stipend({ status: 'finalized', number: 'QS-STP-2627-001' });
    const content = materialiseContent(draft, spec);

    const stored = roundTrip({ ...draft, content });

    // The default the slip was issued under, still readable off the reloaded doc.
    expect(contentOf(stored, spec).terms).toEqual(contentOf(draft, spec).terms);

    // Now the defaults change — as they will, next time the wording is revised.
    const revisedSpec = { ...spec, masthead: 'REVISED MASTHEAD' };
    expect(contentOf(stored, revisedSpec).masthead).toBe('STIPEND');
    expect(contentOf(draft, revisedSpec).masthead).toBe('REVISED MASTHEAD');
  });

  it('keeps the currency an issued slip was paid in', () => {
    const stored = roundTrip(stipend({ currency: 'USD' }));
    expect(stored).toMatchObject({ type: 'STP', currency: 'USD' });
  });

  it('keeps the ISO period a slip was issued for', () => {
    const stored = roundTrip(
      stipend({ stipendPeriodStart: '2026-06-01', stipendPeriodEnd: '2026-06-30' }),
    );
    expect(stored).toMatchObject({
      stipendPeriodStart: '2026-06-01',
      stipendPeriodEnd: '2026-06-30',
    });
  });
});

/**
 * The pay slip's own fields. A wage record that loses its deductions on save
 * would reprint as though nothing had been withheld — the figures would still
 * add up, which is what makes it dangerous.
 */
describe('pay slip fields survive persistence', () => {
  const payslip = (overrides: Partial<AdminDocument> = {}) =>
    stipend({
      type: 'PAY',
      employeeSnapshot: {
        ...EMPLOYEE,
        engagementType: 'employee',
        payroll: { employeeCode: 'QS-004', pan: 'ABCPR1234F' },
      } as EmployeeSnapshot,
      lineItems: [{ description: 'Basic', ratePaise: 6_000_000, qty: 1 }],
      deductions: [{ description: 'TDS under section 192', ratePaise: 250_000, qty: 1 }],
      daysInPeriod: 30,
      daysPaid: 28,
      lopDays: 2,
      ...overrides,
    });

  it('keeps the itemised deductions', () => {
    expect(roundTrip(payslip())).toMatchObject({
      type: 'PAY',
      deductions: [{ description: 'TDS under section 192', ratePaise: 250_000, qty: 1 }],
    });
  });

  it('keeps the day counts', () => {
    expect(roundTrip(payslip())).toMatchObject({
      daysInPeriod: 30,
      daysPaid: 28,
      lopDays: 2,
    });
  });

  it('keeps the statutory identifiers frozen onto the snapshot', () => {
    const stored = roundTrip(payslip()) as { employeeSnapshot: EmployeeSnapshot };
    expect(stored.employeeSnapshot.payroll).toEqual({
      employeeCode: 'QS-004',
      pan: 'ABCPR1234F',
    });
  });

  /**
   * `total_paise` is what the lists and the amount filter read, so for a pay
   * slip it has to be the net actually paid. Storing the gross would overstate
   * every pay slip in every total on screen.
   */
  it('stores the net, not the gross, as the row total', () => {
    expect(toRow(payslip()).totalPaise).toBe(5_750_000);
  });

  it('still stores a stipend slip at its full amount', () => {
    expect(toRow(stipend()).totalPaise).toBe(1_500_000);
  });
});
