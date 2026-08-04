import { render, screen } from '@testing-library/react';
import DocumentSheet from '../DocumentSheet';
import { STUDIO_INFO } from '@/lib/domain/studio';
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

  /**
   * Notes were retired: the editor no longer offers the field, and the sheet no
   * longer prints it. Checked against a document that still carries one, since
   * the value stays in stored JSONB — nothing was migrated away.
   */
  it('does not print notes', () => {
    const doc = { ...baseInvoice, notes: 'Internal reminder, not for the client' };
    render(<DocumentSheet doc={doc} />);
    expect(screen.queryByText(/internal reminder/i)).not.toBeInTheDocument();
  });

  it('shows CGST+SGST for an intra-state (state 09) GST invoice', () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText(/CGST \(9%\)/)).toBeInTheDocument();
    expect(screen.getByText(/SGST \(9%\)/)).toBeInTheDocument();
  });

  it('prints the client’s legal company name, not the short one', () => {
    const doc = {
      ...baseInvoice,
      clientSnapshot: { ...baseInvoice.clientSnapshot, companyName: 'Acme Company Private Limited' },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    // The short name is for dropdowns; a tax invoice must carry the legal name.
    expect(screen.getByText('Acme Company Private Limited')).toBeInTheDocument();
    expect(screen.queryByText('Acme Co.')).not.toBeInTheDocument();
  });

  it('falls back to the short name for a snapshot frozen before company names', () => {
    render(<DocumentSheet doc={baseInvoice} />);
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
  });

  it('prints the studio details frozen onto the document', () => {
    const doc = {
      ...baseInvoice,
      studioSnapshot: { ...STUDIO_INFO, address: 'Old office\nIndia', gstin: '09OLDGSTIN1Z0' },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    // Editing the studio settings must never rewrite an issued invoice: the
    // supplier address as at issue is what the record has to keep.
    expect(screen.getByText(/Old office/)).toBeInTheDocument();
    expect(screen.getByText(/09OLDGSTIN1Z0/)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(STUDIO_INFO.gstin))).not.toBeInTheDocument();
  });

  it('splits GST against the studio’s own state as at issue', () => {
    // The studio was registered in Delhi (07) when this was issued, so an
    // invoice with place of supply 07 is intra-state — even though the studio's
    // current registration (09) would make it inter-state.
    const doc = {
      ...baseInvoice,
      placeOfSupplyStateCode: '07',
      studioSnapshot: { ...STUDIO_INFO, stateCode: '07', stateName: 'Delhi' },
    } as InvoiceDocument;
    render(<DocumentSheet doc={doc} />);

    expect(screen.getByText(/CGST \(9%\)/)).toBeInTheDocument();
    expect(screen.queryByText(/IGST/)).not.toBeInTheDocument();
  });

  it('shows a single IGST row for an inter-state invoice', () => {
    render(<DocumentSheet doc={{ ...baseInvoice, placeOfSupplyStateCode: '07' } as InvoiceDocument} />);
    expect(screen.getByText(/IGST \(18%\)/)).toBeInTheDocument();
  });
});
