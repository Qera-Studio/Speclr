import { render, screen } from '@testing-library/react';
import DocumentSheet from '../DocumentSheet';
import type { InvoiceDocument } from '@/lib/domain/types';

const baseInvoice = {
  type: 'INV', status: 'finalized', number: 'QS-INV-2627-001', issueDate: '2026-06-10',
  gstRatePercent: 18, placeOfSupplyStateCode: '09',
  clientSnapshot: { name: 'Acme Co.', address: 'Road', phone: '9', email: 'a@b.com', gstin: '' },
  lineItems: [{ description: 'Design', detail: 'logo', ratePaise: 100000, qty: 2 }],
  gstLabel: null, notes: '',
} as unknown as InvoiceDocument;

describe('DocumentSheet', () => {
  it('renders the invoice masthead, client, and number', () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText(/billed to/i)).toBeInTheDocument();
    expect(screen.getAllByText('#QS-INV-2627-001').length).toBeGreaterThan(0);
  });

  it('shows CGST+SGST for an intra-state (state 09) GST invoice', () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText(/CGST \(9%\)/)).toBeInTheDocument();
    expect(screen.getByText(/SGST \(9%\)/)).toBeInTheDocument();
  });

  it('shows a single IGST row for an inter-state invoice', () => {
    render(<DocumentSheet doc={{ ...baseInvoice, placeOfSupplyStateCode: '07' } as InvoiceDocument} />);
    expect(screen.getByText(/IGST \(18%\)/)).toBeInTheDocument();
  });
});
