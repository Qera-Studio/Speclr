import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminDocument } from '@/lib/domain/types';

jest.mock('@/server/actions/documents', () => ({
  deleteDraftAction: jest.fn(),
  duplicateDocument: jest.fn(),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));

import DocumentsBrowser from '../DocumentsBrowser';

const line = (paise: number) => [{ description: 'Work', qty: 1, ratePaise: paise }];

const documents = [
  {
    id: 'd1',
    type: 'INV',
    status: 'finalized',
    number: 'QS-INV-2627-001',
    issueDate: '2026-06-10',
    clientSnapshot: { name: 'Acme Co.' },
    lineItems: line(100000), // ₹1,000
    gstRatePercent: 0,
  },
  {
    id: 'd2',
    type: 'REC',
    status: 'draft',
    number: null,
    issueDate: '2026-07-20',
    clientSnapshot: { name: 'Beta Ltd.' },
    lineItems: line(500000), // ₹5,000
    gstRatePercent: 0,
  },
] as unknown as AdminDocument[];

const rowCount = () => screen.getAllByRole('row').length - 1; // minus the header

/** Adds a filter row of the given field through the Add-filter menu. */
async function addFilter(user: ReturnType<typeof userEvent.setup>, field: RegExp) {
  await user.click(screen.getByRole('button', { name: /add filter/i }));
  await user.click(await screen.findByRole('menuitem', { name: field }));
}

describe('DocumentsBrowser', () => {
  it('shows every document before anything is filtered', () => {
    render(<DocumentsBrowser documents={documents} />);
    expect(rowCount()).toBe(2);
  });

  /**
   * A row is added before it has a value. If that hid anything, the table would
   * blank the moment you clicked "Add filter" — before you'd said what you want.
   */
  it('hides nothing until the new row is given a value', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^status$/i);

    expect(screen.getByRole('group', { name: /status filter/i })).toBeInTheDocument();
    expect(rowCount()).toBe(2);
  });

  /**
   * The newest condition lands next to the button you just pressed; older ones
   * move away to the right. Order is presentation only — `matchesFilters` ANDs
   * the rows — so the narrowing tests below are unaffected by it.
   */
  it('puts the newest filter first', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^status$/i);
    await addFilter(user, /^type$/i);

    const pills = screen
      .getAllByRole('group')
      .map((el) => el.getAttribute('aria-label'))
      .filter((label) => label?.endsWith('filter'));
    expect(pills).toEqual(['Type filter', 'Status filter']);
  });

  /**
   * A second row for the same field could only ever narrow to nothing (the
   * rows AND), so a field already in play drops out of the menu. The date
   * range that used to need two rows has its own `between` operator now.
   */
  it('offers each field only once', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^status$/i);
    await user.click(screen.getByRole('button', { name: /add filter/i }));

    expect(screen.queryByRole('menuitem', { name: /^status$/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: /^type$/i })).toBeInTheDocument();

    // Removing it puts the field back on offer.
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /remove status filter/i }));
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    expect(await screen.findByRole('menuitem', { name: /^status$/i })).toBeInTheDocument();
  });

  it('narrows once a value is picked, and Clear all puts everything back', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^status$/i);
    await user.click(screen.getByRole('button', { name: /status value/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /^draft$/i }));

    expect(rowCount()).toBe(1);
    expect(screen.getByText('Beta Ltd.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(rowCount()).toBe(2);
  });

  it('inverts a filter with the "is not" operator', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^type$/i);
    await user.click(screen.getByRole('button', { name: /type value/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /invoice/i }));
    expect(rowCount()).toBe(1);

    await user.click(screen.getByRole('button', { name: /type condition/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: /is not/i }));

    expect(rowCount()).toBe(1);
    expect(screen.getByText('Beta Ltd.')).toBeInTheDocument();
  });

  it('narrows by total, compared in paise', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^total$/i);
    await user.type(screen.getByRole('textbox', { name: /total value/i }), '2000');

    expect(rowCount()).toBe(1);
    expect(screen.getByText('Beta Ltd.')).toBeInTheDocument();
  });

  /** The field used to accept `werwerwe`, which sat there looking like a filter. */
  it('refuses anything but a number in the total filter', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^total$/i);
    const amount = screen.getByRole('textbox', { name: /total value/i });
    await user.type(amount, 'werwerwe');

    expect(amount).toHaveValue('');
    expect(rowCount()).toBe(2);
  });

  it('shows the amount with Indian grouping while still filtering on it', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^total$/i);
    await user.type(screen.getByRole('textbox', { name: /total value/i }), '200000');

    expect(screen.getByRole('textbox', { name: /total value/i })).toHaveValue('2,00,000');
    expect(screen.getByText(/no documents match these filters/i)).toBeInTheDocument();
  });

  it('offers a date range on one row', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /issue date/i);
    await user.click(screen.getByRole('button', { name: /issue date condition/i }));
    await user.click(await screen.findByRole('menuitemradio', { name: /between/i }));

    // Two ends, one pill — the alternative is two rows, which still works.
    expect(screen.getByRole('button', { name: /issue date from/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /issue date to/i })).toBeInTheDocument();
  });

  it('removes a single row with its × without touching the others', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await addFilter(user, /^status$/i);
    await user.click(screen.getByRole('button', { name: /status value/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /^draft$/i }));
    expect(rowCount()).toBe(1);

    await user.click(screen.getByRole('button', { name: /remove status filter/i }));

    expect(screen.queryByRole('group', { name: /status filter/i })).not.toBeInTheDocument();
    expect(rowCount()).toBe(2);
  });

  /**
   * "Nothing matches your filters" must never wear the "nothing exists yet"
   * copy — one is a filter to loosen, the other reads as data loss.
   */
  it('distinguishes no-matches from an empty list', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} emptyTitle="No invoices yet" />);

    await addFilter(user, /^total$/i);
    await user.type(screen.getByRole('textbox', { name: /total value/i }), '99999');

    expect(screen.getByText(/no documents match these filters/i)).toBeInTheDocument();
    expect(screen.queryByText(/no invoices yet/i)).not.toBeInTheDocument();
  });

  it('offers no filter builder when there is nothing to filter', () => {
    render(<DocumentsBrowser documents={[]} emptyTitle="No invoices yet" />);

    expect(screen.getByText(/no invoices yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add filter/i })).not.toBeInTheDocument();
  });

  it('does not offer a type filter on a single-type list', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} hideTypeFilter />);

    await user.click(screen.getByRole('button', { name: /add filter/i }));

    expect(await screen.findByRole('menuitem', { name: /^status$/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /^type$/i })).not.toBeInTheDocument();
  });

  it('sorts a column on click, and back to unsorted on the third', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    const header = () => screen.getByRole('button', { name: /^date/i });
    const parties = () =>
      screen.getAllByRole('row').slice(1).map((r) => r.textContent?.includes('Acme'));

    // Server order is Acme then Beta; ascending by date is the same here, so
    // check the descending flip, which only a real sort produces.
    await user.click(header());
    await user.click(header());
    expect(parties()).toEqual([false, true]);

    await user.click(header());
    expect(parties()).toEqual([true, false]);
  });
});
