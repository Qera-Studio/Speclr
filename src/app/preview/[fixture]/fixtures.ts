import { contractDoc } from '@/lib/domain/contract/__tests__/fixture';
import type { AdminDocument, LineItem, SlipDocument } from '@/lib/domain/types';

/**
 * The documents the browser tests render.
 *
 * Fixed data, not whatever happens to be in Neon: a pagination assertion is
 * only meaningful against a document whose length is known, and a suite that
 * reads live records fails the day somebody edits one. The contract reuses the
 * fixture the Jest tests already build, so paper and jsdom argue about the same
 * document.
 */

const line = (description: string, ratePaise: number): LineItem => ({
  description,
  ratePaise,
  qty: 1,
});

/**
 * A pay slip at the density the sheet was drawn for: 6 earnings against 5
 * deductions, side by side. `SlipSheet`'s own comment names this as the limit,
 * so it is the case that must fit.
 */
const paySlip = (earnings: number, deductions: number): SlipDocument =>
  ({
    id: 'pay-1',
    type: 'PAY',
    status: 'finalized',
    number: 'QS-PAY-2627-001',
    issueDate: '2026-06-30',
    gstRatePercent: 0,
    lineItems: [
      line('Basic', 4000000),
      line('House rent allowance', 1600000),
      line('Conveyance allowance', 160000),
      line('Special allowance', 400000),
      line('Medical allowance', 125000),
      line('Performance incentive', 500000),
      line('Leave travel allowance', 200000),
      line('Shift allowance', 100000),
      line('Meal allowance', 100000),
      line('Internet reimbursement', 150000),
      line('Books and training', 100000),
      line('Statutory bonus', 175000),
    ].slice(0, earnings),
    deductions: [
      line('TDS under section 192', 250000),
      line('Professional tax', 20000),
      line('Salary advance recovery', 500000),
      line('Loss of pay', 133300),
      line('Group medical premium', 65000),
      line('Canteen', 24000),
      line('Parking', 15000),
    ].slice(0, deductions),
    employeeId: 'emp-1',
    employeeSnapshot: {
      name: 'Ananya Rao',
      address: 'Sector 12, Ghaziabad, Uttar Pradesh - 201017',
      email: 'ananya@example.com',
      phone: '+919000000000',
      role: 'Senior Designer',
      engagementType: 'employee',
      pronoun: 'she',
      joiningDate: '2025-04-01',
      bank: { bankName: 'HDFC Bank', accountNo: '1234567890', ifsc: 'HDFC0001234' },
      payroll: { employeeCode: 'QS-EMP-004', pan: 'ABCPR1234F', uan: '101234567890' },
    },
    stipendMonth: '2026-06',
    stipendPeriodStart: '2026-06-01',
    stipendPeriodEnd: '2026-06-30',
    daysInPeriod: 30,
    daysPaid: 30,
    paymentMethod: 'Bank Transfer',
    deductionsNote: '',
  }) as unknown as SlipDocument;

const invoice = (): AdminDocument =>
  ({
    id: 'inv-1',
    type: 'INV',
    status: 'finalized',
    number: 'QS-INV-2627-001',
    issueDate: '2026-06-10',
    dueDate: '2026-06-25',
    clientId: 'client-1',
    clientSnapshot: {
      name: 'Clayora',
      companyName: 'Clayora Private Limited',
      address: 'Sector 62, Noida, Uttar Pradesh - 201301',
      email: 'hello@clayora.example',
      phone: '+919876500000',
      gstin: '09AAACC1206D1ZP',
    },
    lineItems: [
      { description: 'Brand identity system', ratePaise: 18000000, qty: 1 },
      { description: 'Shopify storefront build', ratePaise: 24000000, qty: 1 },
      { description: 'Photography direction', ratePaise: 6000000, qty: 1 },
    ],
    gstRatePercent: 18,
    placeOfSupplyStateCode: '09',
  }) as unknown as AdminDocument;

/**
 * Every fixture the preview route serves, and the only ones it will serve: the
 * segment is looked up here rather than parsed, so there is nothing to traverse.
 */
export const FIXTURES = {
  /** The density the pay slip is drawn for. Must fit on one page. */
  'pay-slip': () => paySlip(6, 5),
  /** Past it. The clipping this document type already shipped once. */
  'pay-slip-crowded': () => paySlip(12, 7),
  /** Twenty-odd pages of prose in two columns: the pagination case. */
  contract: () => contractDoc({ codes: ['01', '05'] }) as AdminDocument,
  invoice,
} as const;

export type FixtureName = keyof typeof FIXTURES;

export const isFixture = (name: string): name is FixtureName => name in FIXTURES;
