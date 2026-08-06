import { render } from '@testing-library/react';
import DocumentPreview from '../DocumentPreview';
import DocumentSheet from '../sheets/DocumentSheet';
import type { InvoiceDocument } from '@/lib/domain/types';

/**
 * The preview decides when to re-measure pagination from a cheap fingerprint of
 * its blocks. That fingerprint used to read only `children` — but a sheet is
 * `<DocumentSheet doc={…} />` with no children at all, so it never changed while
 * the user typed and the cached (stale) pagination was reused. These assert the
 * rendered output tracks the doc it was given.
 */
function invoice(description: string): InvoiceDocument {
  return {
    id: 'p', type: 'INV', status: 'draft', clientId: 'c1',
    clientSnapshot: { name: 'Acme', address: 'x', email: 'a@b.com', phone: '9' },
    issueDate: '2026-06-10',
    lineItems: [{ description, ratePaise: 150000, qty: 1 }],
    gstRatePercent: 18,
    createdAt: 0, updatedAt: 0,
  } as unknown as InvoiceDocument;
}

describe('DocumentPreview', () => {
  it('renders the description it is given', () => {
    const { getByText } = render(
      <DocumentPreview><DocumentSheet doc={invoice('Hosting')} /></DocumentPreview>,
    );
    expect(getByText('Hosting')).toBeInTheDocument();
  });

  it('re-renders when only the doc prop changes', () => {
    const { rerender, queryByText, getByText } = render(
      <DocumentPreview><DocumentSheet doc={invoice('Hosting')} /></DocumentPreview>,
    );
    expect(getByText('Hosting')).toBeInTheDocument();

    // The whole point: nothing structural changed, only data inside a prop.
    rerender(
      <DocumentPreview><DocumentSheet doc={invoice('Hosting for August')} /></DocumentPreview>,
    );

    expect(getByText('Hosting for August')).toBeInTheDocument();
    expect(queryByText('Hosting')).not.toBeInTheDocument();
  });
});
