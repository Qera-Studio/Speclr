import { pronounSet } from '@/lib/domain/employee';
import { defaultLetterContent } from '@/lib/domain/hrContent';
import { formatINR } from '@/lib/domain/money';
import type {
  AdminDocument,
  ClientSnapshot,
  EmployeeSnapshot,
  LetterDocument,
} from '@/lib/domain/types';

/**
 * One specimen document per type, and the line that describes the type.
 *
 * The ⌘D palette shows what it is about to make rather than only naming it, and
 * the honest way to do that is to render the real sheet from real-shaped data:
 * the sheets are pure `data → markup`, so a thumbnail is the document itself at
 * a fifth of its size. Nothing here is a picture of a document, which is what
 * keeps it from going stale the next time a sheet is edited.
 *
 * **Nobody here exists.** Every name, address, number and identifier is
 * invented, and none of it is ever written: these values reach a sheet and stop
 * there. They are shaped to be *typical* rather than extreme, because the point
 * is recognising the document across the room, not measuring it.
 *
 * That is what separates this from `src/app/preview/[fixture]/fixtures.ts`,
 * which serves the same sheets to Playwright. Those fixtures are parameterised
 * to sit exactly on a limit (a pay slip at 6 earnings against 5 deductions, a
 * contract long enough to paginate) because they are measured. These are
 * looked at.
 */

const client: ClientSnapshot = {
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  address: 'Sector 62, Noida, Uttar Pradesh - 201301',
  email: 'hello@clayora.example',
  phone: '+919876500000',
  gstin: '09AAACC1206D1ZP',
};

const employee = (engagementType: 'intern' | 'employee'): EmployeeSnapshot => ({
  name: 'Ananya Rao',
  address: 'Sector 12, Ghaziabad, Uttar Pradesh - 201017',
  email: 'ananya@example.com',
  phone: '+919000000000',
  role: engagementType === 'intern' ? 'Design Intern' : 'Senior Designer',
  engagementType,
  pronoun: 'she',
  joiningDate: '2026-04-01',
  bank: { bankName: 'HDFC Bank', accountNo: '1234567890', ifsc: 'HDFC0001234' },
  payroll:
    engagementType === 'employee'
      ? { employeeCode: 'QS-EMP-004', pan: 'ABCPR1234F', uan: '101234567890' }
      : undefined,
});

/** Fields every document carries, so each specimen below states only its own. */
const base = {
  status: 'finalized' as const,
  issueDate: '2026-06-10',
  gstRatePercent: 0,
  createdAt: 0,
  updatedAt: 0,
};

const letter = (type: LetterDocument['type'], engagement: 'intern' | 'employee') => {
  const snapshot = employee(engagement);
  const content = defaultLetterContent(type, engagement, {
    role: snapshot.role,
    payText: formatINR(engagement === 'intern' ? 2500000 : 90000000),
    startDate: '1st April 2026',
    endDate: '30th June 2026',
    pronoun: pronounSet(snapshot.pronoun),
  });
  return {
    ...base,
    id: `sample-${type}`,
    type,
    number: undefined,
    lineItems: [],
    employeeId: 'sample-employee',
    employeeSnapshot: snapshot,
    bodyParagraphs: content.bodyParagraphs,
    bulletSections: content.bulletSections,
    payAmountPaise: engagement === 'intern' ? 2500000 : 90000000,
  } as unknown as AdminDocument;
};

/** What a type is, in one line, for the card under its thumbnail. */
export interface DocSample {
  blurb: string;
  doc: AdminDocument;
}

/**
 * Keyed by URL slug, which is what the nav link already carries — the palette
 * reads its labels, icons and order from the nav, and this joins onto the same
 * key rather than introducing a second name for a document type.
 */
export const DOC_SAMPLES: Record<string, DocSample> = {
  contract: {
    blurb: 'The Master Service Agreement, with a Schedule for each service.',
    doc: {
      ...base,
      id: 'sample-contract',
      type: 'CON',
      clientId: 'sample-client',
      clientSnapshot: client,
      lineItems: [],
      // The cover is the only page a thumbnail shows, and it prints the
      // masthead and the intro. Parts would add pages nobody sees.
      contract: { parts: [], blanks: {}, library: {} },
    } as unknown as AdminDocument,
  },
  invoice: {
    blurb: 'A GST tax invoice, numbered for the financial year.',
    doc: {
      ...base,
      id: 'sample-invoice',
      type: 'INV',
      number: 'QS-INV-2627-001',
      dueDate: '2026-06-25',
      clientId: 'sample-client',
      clientSnapshot: client,
      lineItems: [
        { description: 'Brand identity system', ratePaise: 18000000, qty: 1 },
        { description: 'Shopify storefront build', ratePaise: 24000000, qty: 1 },
        { description: 'Photography direction', ratePaise: 6000000, qty: 1 },
      ],
      gstRatePercent: 18,
      placeOfSupplyStateCode: '09',
    } as unknown as AdminDocument,
  },
  receipt: {
    blurb: 'Acknowledges a payment received against an invoice.',
    doc: {
      ...base,
      id: 'sample-receipt',
      type: 'REC',
      number: 'QS-REC-2627-001',
      clientId: 'sample-client',
      clientSnapshot: client,
      lineItems: [{ description: 'Brand identity system', ratePaise: 18000000, qty: 1 }],
      gstRatePercent: 18,
      placeOfSupplyStateCode: '09',
      payment: {
        date: '2026-06-12',
        method: 'Bank Transfer',
        reference: 'UTR9000012345',
        againstInvoiceNumber: 'QS-INV-2627-001',
      },
    } as unknown as AdminDocument,
  },
  'offer-letter': {
    blurb: 'Offers a role, and states the terms it is offered on.',
    doc: letter('OFR', 'employee'),
  },
  stipend: {
    blurb: 'Records a discretionary payment made to an intern.',
    doc: {
      ...base,
      id: 'sample-stipend',
      type: 'STP',
      number: 'QS-STP-2627-001',
      lineItems: [{ description: 'Monthly stipend', ratePaise: 2500000, qty: 1 }],
      employeeId: 'sample-employee',
      employeeSnapshot: employee('intern'),
      stipendMonth: '2026-06',
      stipendPeriodStart: '2026-06-01',
      stipendPeriodEnd: '2026-06-30',
      paymentMethod: 'Bank Transfer',
      deductionsNote: 'No statutory deductions (PF, ESI, TDS) are applicable.',
    } as unknown as AdminDocument,
  },
  'pay-slip': {
    blurb: 'The statutory wage record: earnings, deductions and net pay.',
    doc: {
      ...base,
      id: 'sample-pay-slip',
      type: 'PAY',
      number: 'QS-PAY-2627-001',
      issueDate: '2026-06-30',
      lineItems: [
        { description: 'Basic', ratePaise: 4000000, qty: 1 },
        { description: 'House rent allowance', ratePaise: 1600000, qty: 1 },
        { description: 'Conveyance allowance', ratePaise: 160000, qty: 1 },
        { description: 'Special allowance', ratePaise: 400000, qty: 1 },
      ],
      deductions: [
        { description: 'TDS under section 192', ratePaise: 250000, qty: 1 },
        { description: 'Professional tax', ratePaise: 20000, qty: 1 },
      ],
      employeeId: 'sample-employee',
      employeeSnapshot: employee('employee'),
      stipendMonth: '2026-06',
      stipendPeriodStart: '2026-06-01',
      stipendPeriodEnd: '2026-06-30',
      daysInPeriod: 30,
      daysPaid: 30,
      paymentMethod: 'Bank Transfer',
      deductionsNote: '',
    } as unknown as AdminDocument,
  },
  'experience-letter': {
    blurb: 'Certifies a completed engagement, to whom it may concern.',
    doc: letter('EXP', 'employee'),
  },
  'exit-letter': {
    blurb: 'Closes an engagement: relieving, or internship completion.',
    doc: letter('EXIT', 'employee'),
  },
};
