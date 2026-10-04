import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { contractDoc, serviceByCode } from '@/lib/domain/contract/__tests__/fixture';
import { feeBlankOf } from '@/lib/domain/contract/listing';
import type { ContractService } from '@/lib/domain/service';
import type { AdminDocument } from '@/lib/domain/types';
import { NIL } from '@/lib/utils';

// The row actions import server actions (which pull next/cache): stub the
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

const draft = { ...invoice, id: 'draft-1', status: 'draft', number: null } as unknown as AdminDocument;

/** The row's actions sit behind one button, named for the row. */
async function openMenu(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('button', { name }));
}

describe('DocumentsTable', () => {
  it('renders a row with number link, client, status', () => {
    render(<DocumentsTable documents={[invoice]} />);
    // Straight to the print view: a finalized document lives there, and
    // `/client/docs/doc-1` would only redirect to it.
    expect(screen.getByRole('link', { name: 'QS-INV-2627-001' })).toHaveAttribute(
      'href',
      '/client/docs/doc-1/print',
    );
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByText('Finalized')).toBeInTheDocument();
  });

  /**
   * The number column is titled "Title" and is preceded by the row's place in
   * the list: page two starts at eleven, not at one.
   */
  it('numbers the rows from where the page starts, before the Title column', () => {
    const { container, rerender } = render(<DocumentsTable documents={[invoice]} />);
    const headings = screen.getAllByRole('columnheader').map((th) => th.textContent?.trim());
    expect(headings.indexOf('No.')).toBeLessThan(headings.indexOf('Title'));
    expect(container.querySelector('td[data-col="index"]')).toHaveTextContent('1');

    rerender(
      <DocumentsTable
        documents={[invoice]}
        paging={{ page: 1, pageCount: 2, onPageChange: jest.fn(), start: 10, total: 11 }}
      />,
    );
    expect(container.querySelector('td[data-col="index"]')).toHaveTextContent('11');
  });

  /**
   * A draft opens in its editor, which is the whole difference, and it shows
   * the gray status tag where its number will be rather than the word. Nothing
   * to copy yet, so no copy control either.
   */
  it('links a draft to its editor, as a tag rather than a word', () => {
    render(<DocumentsTable documents={[draft]} />);
    const link = screen.getByRole('link', { name: 'Draft' });
    expect(link).toHaveAttribute('href', '/client/docs/draft-1');
    expect(within(link).getByText('Draft')).toHaveClass('rounded-sm');
    expect(screen.queryByRole('button', { name: /copy document number/i })).not.toBeInTheDocument();
  });

  /** Every type carries its hue as a solid swatch before its name; the name is still the answer. */
  it('draws the type with its colour swatch beside the word', () => {
    const { container } = render(<DocumentsTable documents={[invoice]} />);
    const type = container.querySelector('td[data-col="type"]');
    expect(type).toHaveTextContent('Invoice');
    expect(type?.querySelector('.bg-accent-violet')).not.toBeNull();
  });

  /**
   * Sorting is opt-in so the table still renders without client state: pass
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
    // Every other sortable column advertises itself as sortable rather than sorted.
    expect(screen.getByRole('columnheader', { name: /^date/i })).toHaveAttribute(
      'aria-sort',
      'none',
    );

    await user.click(screen.getByRole('button', { name: /^date/i }));
    expect(onSortChange).toHaveBeenCalledWith('date');
  });

  it('offers print and duplicate on a finalized row, but never edit', async () => {
    const user = userEvent.setup();
    render(<DocumentsTable documents={[invoice]} />);

    await openMenu(user, /more actions for qs-inv-2627-001/i);
    expect(await screen.findByRole('menuitem', { name: /print/i })).toHaveAttribute(
      'href',
      // `auto=1` prints on arrival: Print from a list row means print.
      '/client/docs/doc-1/print?auto=1',
    );
    expect(screen.getByRole('menuitem', { name: /duplicate as new draft/i })).toBeInTheDocument();
    // Finalized documents are immutable: there is no edit action by design.
    expect(screen.queryByRole('menuitem', { name: /edit draft/i })).not.toBeInTheDocument();
  });

  it('offers edit and delete on a draft row', async () => {
    const user = userEvent.setup();
    render(<DocumentsTable documents={[{ ...invoice, status: 'draft', number: undefined }]} />);

    await openMenu(user, /more actions for draft invoice/i);
    expect(await screen.findByRole('menuitem', { name: /edit draft/i })).toHaveAttribute(
      'href',
      '/client/docs/doc-1',
    );
    expect(screen.getByRole('menuitem', { name: /delete draft/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /print/i })).not.toBeInTheDocument();
  });

  it('renders a designed empty state when there are no documents', () => {
    render(<DocumentsTable documents={[]} />);
    expect(screen.getByText(/no documents yet/i)).toBeInTheDocument();
    // No CTA here: the create button lives in the page header at every state,
    // so it never moves out from under the cursor.
    expect(screen.queryByRole('link', { name: /new invoice/i })).not.toBeInTheDocument();
  });

  /**
   * A contract's figure is the fee its Parts state, a retainer's marked as a
   * month's, and its Services column names the Schedules those Parts run
   * under, in canonical order. An invoice names no Service, so that column
   * is empty for it.
   */
  it("shows a contract's fees and the Schedules its Parts run under", () => {
    const blank = feeBlankOf(serviceByCode('15'));
    if (!blank) throw new Error('Part 15 has no fee blank');
    const contract = contractDoc({
      codes: ['15', '05'],
      blanks: { [blank.key]: '₹45,000' },
    }) as AdminDocument;

    const { container, unmount } = render(<DocumentsTable documents={[contract]} />);
    expect(container.querySelector('td[data-col="total"]')).toHaveTextContent('45,000.00');
    expect(container.querySelector('td[data-col="total"]')).toHaveTextContent('/mo');
    expect(container.querySelector('td[data-col="services"]')?.textContent).toBe('BuildRetainer');
    unmount();

    const invoiceOnly = render(<DocumentsTable documents={[invoice]} />);
    expect(invoiceOnly.container.querySelector('td[data-col="services"]')).toHaveTextContent(NIL);
    expect(invoiceOnly.container.querySelector('td[data-col="total"]')).not.toHaveTextContent('/mo');
  });

  /**
   * An invoice's lines name the Service they bill by code, and the catalogue
   * says which Schedule that is. Without the catalogue the column is empty
   * rather than guessed from the description.
   */
  it("names the Schedules an invoice's lines bill, through the catalogue", () => {
    const billed = {
      ...invoice,
      lineItems: [{ ...invoice.lineItems[0], serviceCode: 'SOC' }],
    } as AdminDocument;
    const catalogue = [{ code: 'SOC', scheduleKey: 'retainer' }] as ContractService[];

    const withCatalogue = render(<DocumentsTable documents={[billed]} catalogue={catalogue} />);
    expect(withCatalogue.container.querySelector('td[data-col="services"]')).toHaveTextContent('Retainer');
    withCatalogue.unmount();

    const without = render(<DocumentsTable documents={[billed]} />);
    expect(without.container.querySelector('td[data-col="services"]')).toHaveTextContent(NIL);
  });
});
