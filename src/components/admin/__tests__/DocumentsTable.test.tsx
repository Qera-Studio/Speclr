import { render, screen } from '@testing-library/react';
import DocumentsTable from '../DocumentsTable';
import type { AdminDocument } from '@/lib/domain/types';

const invoice = {
  id: 'doc-1',
  type: 'INV',
  status: 'finalized',
  number: 'QS-INV-2627-001',
  issueDate: '2026-06-10',
  gstRatePercent: 18,
  lineItems: [{ description: 'Design', detail: '', ratePaise: 100000, qty: 1 }],
  clientSnapshot: { name: 'Acme Co.' },
} as unknown as AdminDocument;

describe('DocumentsTable', () => {
  it('renders a row with number link, client, status', () => {
    render(<DocumentsTable documents={[invoice]} />);
    expect(screen.getByRole('link', { name: 'QS-INV-2627-001' })).toHaveAttribute('href', '/docs/doc-1');
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });

  it('renders a designed empty state when there are no documents', () => {
    render(<DocumentsTable documents={[]} />);
    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new invoice/i })).toHaveAttribute('href', '/docs/new/invoice');
  });
});
