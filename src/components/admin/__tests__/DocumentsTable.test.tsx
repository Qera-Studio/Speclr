import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminDocument } from '@/lib/domain/types';

// The row actions import server actions (which pull next/cache) — stub the
// module so importing the table under test doesn't drag server-only APIs in.
jest.mock('@/server/actions/documents', () => ({
  duplicateDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

import DocumentsTable from '../DocumentsTable';

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
    expect(screen.getByRole('link', { name: 'QS-INV-2627-001' })).toHaveAttribute('href', '/client/docs/doc-1');
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });

  /**
   * Sorting is opt-in so the table still renders without client state — pass
   * the handler and the headers become buttons, omit it and they stay text.
   */
  it('leaves the headers as plain text when no sort handler is given', () => {
    render(<DocumentsTable documents={[invoice]} />);

    expect(screen.queryByRole('button', { name: /^date/i })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Date' })).not.toHaveAttribute('aria-sort');
  });

  it('reports a sort request and reflects the current sort to assistive tech', async () => {
    const onSortChange = jest.fn();
    const user = userEvent.setup();
    render(
      <DocumentsTable
        documents={[invoice]}
        sort={{ column: 'total', direction: 'desc' }}
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByRole('columnheader', { name: /^total/i })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    // Every other column advertises itself as sortable rather than sorted.
    expect(screen.getByRole('columnheader', { name: /^date/i })).toHaveAttribute(
      'aria-sort',
      'none',
    );

    await user.click(screen.getByRole('button', { name: /^date/i }));
    expect(onSortChange).toHaveBeenCalledWith('date');
  });

  it('offers print and duplicate on a finalized row, but never edit', () => {
    render(<DocumentsTable documents={[invoice]} />);
    expect(screen.getByRole('link', { name: /print/i })).toHaveAttribute(
      'href',
      // `auto=1` prints on arrival — Print from a list row means print.
      '/client/docs/doc-1/print?auto=1',
    );
    expect(screen.getByRole('button', { name: /duplicate as new draft/i })).toBeInTheDocument();
    // Finalized documents are immutable — there is no edit action by design.
    expect(screen.queryByRole('link', { name: /edit draft/i })).not.toBeInTheDocument();
  });

  it('offers edit and delete on a draft row', () => {
    render(<DocumentsTable documents={[{ ...invoice, status: 'draft', number: undefined }]} />);
    expect(screen.getByRole('link', { name: /edit draft/i })).toHaveAttribute('href', '/client/docs/doc-1');
    expect(screen.getByRole('button', { name: /delete draft/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /print/i })).not.toBeInTheDocument();
  });

  it('renders a designed empty state when there are no documents', () => {
    render(<DocumentsTable documents={[]} />);
    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    // No CTA here — the create button lives in the page header at every state,
    // so it never moves out from under the cursor.
    expect(screen.queryByRole('link', { name: /new invoice/i })).not.toBeInTheDocument();
  });
});
