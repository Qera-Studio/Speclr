import { render, screen } from '@testing-library/react';
import StipendSheet from '../StipendSheet';
import type { StipendDocument } from '@/lib/domain/types';

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
} as unknown as StipendDocument;

describe('StipendSheet', () => {
  it('renders the stipend masthead, employee name, and number', () => {
    render(<StipendSheet doc={baseStipend} />);
    expect(screen.getByText('STIPEND')).toBeInTheDocument();
    expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getAllByText('#QS-STP-2627-001').length).toBeGreaterThan(0);
  });

  it('renders the net stipend total', () => {
    render(<StipendSheet doc={baseStipend} />);
    expect(screen.getByText('NET STIPEND PAID')).toBeInTheDocument();
    expect(screen.getAllByText('₹ 15,000.00').length).toBeGreaterThan(0);
  });

  it('prints the recipient UPI QR from the snapshot', () => {
    const qr = 'data:image/png;base64,QRDATA';
    render(
      <StipendSheet
        doc={
          {
            ...baseStipend,
            employeeSnapshot: {
              ...baseStipend.employeeSnapshot,
              bank: { ...baseStipend.employeeSnapshot.bank, upiQrDataUrl: qr },
            },
          } as StipendDocument
        }
      />,
    );

    // Read from the frozen snapshot, never live — an issued slip must keep
    // showing the QR that was current when it was issued.
    expect(screen.getByAltText(/upi qr code for ravi kumar/i)).toHaveAttribute('src', qr);
    expect(screen.getByText('scan to pay')).toBeInTheDocument();
  });

  it('renders normally for a slip issued before QR codes existed', () => {
    render(<StipendSheet doc={baseStipend} />);

    // Snapshots written before this field simply have no QR; the block must
    // collapse away rather than leaving a gap or a broken image.
    expect(screen.queryByAltText(/upi qr code/i)).not.toBeInTheDocument();
    expect(screen.queryByText('scan to pay')).not.toBeInTheDocument();
    expect(screen.getByText('HDFC Bank')).toBeInTheDocument();
  });
});
