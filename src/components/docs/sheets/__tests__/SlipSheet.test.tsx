import { render, screen } from '@testing-library/react';
import SlipSheet from '../SlipSheet';
import type { SlipDocument } from '@/lib/domain/types';

const baseStipend = {
  type: 'STP',
  status: 'finalized',
  number: 'QS-STP-2627-001',
  issueDate: '2026-06-10',
  gstRatePercent: 0,
  gstLabel: 'not applicable',
  lineItems: [{ description: 'Monthly stipend', detail: '', ratePaise: 1500000, qty: 1 }],
  employeeId: 'emp-1',
  employeeSnapshot: {
    name: 'Ravi Kumar',
    address: 'Sector 12, Ghaziabad',
    email: 'ravi@example.com',
    phone: '+91 90000 00000',
    role: 'Design Intern',
    engagementType: 'intern',
    pronoun: 'he',
    joiningDate: '2026-01-01',
    bank: { bankName: 'HDFC Bank', accountNo: '1234567890', ifsc: 'HDFC0001234', upiId: 'ravi@upi' },
  },
  stipendPeriod: '1 Jun 2026 - 30 Jun 2026',
  stipendMonth: 'June 2026',
  paymentMethod: 'Bank Transfer',
  deductionsNote: 'No deductions applicable.',
} as unknown as SlipDocument;

describe('SlipSheet', () => {
  it('renders the stipend masthead, employee name, and number', () => {
    render(<SlipSheet doc={baseStipend} />);
    expect(screen.getByText('STIPEND')).toBeInTheDocument();
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getAllByText('#QS-STP-2627-001').length).toBeGreaterThan(0);
  });

  it('renders the net stipend total', () => {
    render(<SlipSheet doc={baseStipend} />);
    expect(screen.getByText('NET STIPEND PAID')).toBeInTheDocument();
    expect(screen.getAllByText('₹ 15,000.00').length).toBeGreaterThan(0);
  });

  it('prints the recipient UPI QR from the snapshot', () => {
    const qr = 'data:image/png;base64,QRDATA';
    render(
      <SlipSheet
        doc={
          {
            ...baseStipend,
            employeeSnapshot: {
              ...baseStipend.employeeSnapshot,
              bank: { ...baseStipend.employeeSnapshot.bank, upiQrDataUrl: qr },
            },
          } as SlipDocument
        }
      />,
    );

    // Read from the frozen snapshot, never live — an issued slip must keep
    // showing the QR that was current when it was issued.
    expect(screen.getByAltText(/upi qr code for ravi kumar/i)).toHaveAttribute('src', qr);
    expect(screen.getByText('Scan to pay')).toBeInTheDocument();
  });

  it('renders normally for a slip issued before QR codes existed', () => {
    render(<SlipSheet doc={baseStipend} />);

    // Snapshots written before this field simply have no QR; the block must
    // collapse away rather than leaving a gap or a broken image.
    expect(screen.queryByAltText(/upi qr code/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Scan to pay')).not.toBeInTheDocument();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
  });
});

/**
 * The five fixed terms, matching the issued slip design. Two of them (Stipend,
 * Record) were missing entirely.
 */
describe('SlipSheet terms', () => {
  it('prints all five terms', () => {
    render(<SlipSheet doc={baseStipend} />);
    for (const title of [
      'Nature of engagement.',
      'Confidentiality & IP.',
      'Stipend.',
      'Record.',
      'Jurisdiction.',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
  });

  /**
   * `deductionsNote` is a legal assertion whose truth depends on the
   * engagement, so it must stay editable rather than become fixed boilerplate
   * (CONTEXT.md). It is saved on every slip — if it stops printing, the slip
   * silently drops an assertion the issuer believed they were making.
   */
  it('prints the editable deductions note inside the Stipend term', () => {
    render(
      <SlipSheet
        doc={{ ...baseStipend, deductionsNote: 'TDS deducted at 10%.' } as SlipDocument}
      />,
    );
    expect(screen.getByText(/TDS deducted at 10%\./)).toBeInTheDocument();
  });
});

/**
 * The stipend slip's wording is internship wording, all of it.
 *
 * This used to branch on the snapshot's engagement type, so a slip issued to an
 * employee said "EMPLOYEE ACCOUNT" above five terms insisting the payment was
 * an internship stipend creating no employer–employee relationship. The branch
 * is gone: a stipend slip only ever names an intern, and an employee gets a pay
 * slip — which is the same fix the exit letter got, made structural instead of
 * conditional (CONTEXT.md §6, §6a).
 */
describe('SlipSheet — stipend slip wording', () => {
  it('uses internship wording throughout', () => {
    render(<SlipSheet doc={baseStipend} />);
    expect(screen.getByText('INTERN ACCOUNT')).toBeInTheDocument();
    expect(screen.getByText(/paid for an internship/i)).toBeInTheDocument();
    expect(screen.getByText(/creates no employer–employee relationship/i)).toBeInTheDocument();
  });

  /**
   * The heading follows the document, not the snapshot. A snapshot frozen
   * before the two slips were separated could say "employee" on a stipend slip;
   * the document is what decides which account block this is.
   */
  it('heads the account block from the slip type, not the snapshot', () => {
    render(
      <SlipSheet
        doc={
          {
            ...baseStipend,
            employeeSnapshot: {
              ...baseStipend.employeeSnapshot,
              engagementType: 'employee',
            },
          } as SlipDocument
        }
      />,
    );
    expect(screen.getByText('INTERN ACCOUNT')).toBeInTheDocument();
    expect(screen.queryByText('EMPLOYEE ACCOUNT')).not.toBeInTheDocument();
  });

  it('keeps the editable deductions note', () => {
    const note = 'TDS deducted at 10%.';
    render(<SlipSheet doc={{ ...baseStipend, deductionsNote: note } as SlipDocument} />);
    expect(screen.getByText(new RegExp(note.replace('.', '\\.')))).toBeInTheDocument();
  });
});
