import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminDocument } from '@/lib/domain/types';

jest.mock('@/server/actions/documents', () => ({
  deleteDraftAction: jest.fn(),
  duplicateDocument: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client', useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));

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

    // Sorting is opt-in — the controls are off until asked for.
    await user.click(screen.getByRole('button', { name: 'Sort' }));

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

/**
 * Sorting is a control you either use often or never. Off by default keeps an
 * arrow off all six headers for the latter; the preference is remembered so the
 * former turns it on once.
 */
describe('the sorting toggle', () => {
  const toggle = () => screen.getByRole('button', { name: 'Sort' });

  beforeEach(() => localStorage.clear());

  it('leaves the headers as plain text until it is switched on', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    expect(screen.queryByRole('button', { name: /^date/i })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();

    await user.click(toggle());
    expect(screen.getByRole('button', { name: /^date/i })).toBeInTheDocument();
  });

  /**
   * Regression: hiding the arrows used to remove them from the header, which
   * with `table-auto` re-measured every column — toggling shifted the whole
   * table sideways. The slot stays, merely invisible. jsdom cannot measure
   * layout, so what is asserted is that the element is still there.
   */
  it('keeps the arrow slot occupying its space while hidden', () => {
    render(<DocumentsBrowser documents={documents} />);

    const arrow = screen.getByRole('columnheader', { name: 'Date' }).querySelectorAll('svg');
    // The reserved arrow, and only that: the column's decorative icon was
    // removed with the rest of the header icons.
    expect(arrow).toHaveLength(1);
    expect(arrow[0]).toHaveClass('invisible');
  });

  it('reports its state to assistive tech', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  });

  it('remembers being switched on', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DocumentsBrowser documents={documents} />);
    await user.click(toggle());
    unmount();

    render(<DocumentsBrowser documents={documents} />);
    expect(screen.getByRole('button', { name: /^date/i })).toBeInTheDocument();
  });

  /**
   * The eye hides the *controls*, not the order. Dropping the sort on hide
   * meant a list sorted by total could only be read with the arrows showing on
   * all six headers — so the two things you might want were mutually exclusive.
   */
  it('keeps the applied sort when switched off', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    const parties = () =>
      screen.getAllByRole('row').slice(1).map((r) => r.textContent?.includes('Acme'));

    await user.click(toggle());
    await user.click(screen.getByRole('button', { name: /^date/i }));
    await user.click(screen.getByRole('button', { name: /^date/i }));
    expect(parties()).toEqual([false, true]);

    await user.click(toggle());
    expect(screen.queryByRole('button', { name: /^date/i })).not.toBeInTheDocument();
    expect(parties()).toEqual([false, true]);
  });

  /** Turning the eye back on reveals the sort that was still in force. */
  it('shows the surviving sort again when switched back on', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await user.click(toggle());
    await user.click(screen.getByRole('button', { name: /^date/i }));
    await user.click(toggle());
    await user.click(toggle());

    expect(screen.getByRole('columnheader', { name: /^date/i })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });
});

/**
 * A long list must not push whatever follows it off the page — on the contract
 * list, that is the services section.
 */
describe('DocumentsBrowser pagination', () => {
  const many = Array.from({ length: 24 }, (_, i) => ({
    ...documents[0],
    id: `many-${i}`,
    number: `QS-INV-2627-${String(i + 1).padStart(3, '0')}`,
  })) as unknown as AdminDocument[];

  it('shows ten rows at a time and pages through the rest', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={many} />);

    expect(rowCount()).toBe(10);
    expect(screen.getByText('QS-INV-2627-001')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page of documents' }));
    expect(screen.getByText('QS-INV-2627-011')).toBeInTheDocument();
    expect(screen.queryByText('QS-INV-2627-001')).not.toBeInTheDocument();
  });

  it('does not page a list that already fits', () => {
    render(<DocumentsBrowser documents={documents} />);

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  /** Page 3 of the old result set means nothing once the filters change. */
  it('returns to the first page when the filters change', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={many} />);

    await user.click(screen.getByRole('button', { name: 'Next page of documents' }));
    expect(screen.getByText('QS-INV-2627-011')).toBeInTheDocument();

    await addFilter(user, /^status$/i);
    expect(screen.getByText('QS-INV-2627-001')).toBeInTheDocument();
  });

  describe('card view', () => {
    afterEach(() => localStorage.clear());

    it('swaps the table for cards, keeping every document', async () => {
      const user = userEvent.setup();
      render(<DocumentsBrowser documents={documents} />);

      await user.click(screen.getByRole('button', { name: 'Cards' }));

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'QS-INV-2627-001' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Draft' })).toBeInTheDocument();
      expect(screen.getByText('Acme Co.')).toBeInTheDocument();
      expect(screen.getByText('₹ 1,000.00')).toBeInTheDocument();
    });

    /** Filters and paging belong to the browser, not to either renderer. */
    it('keeps filtering working in card view', async () => {
      const user = userEvent.setup();
      render(<DocumentsBrowser documents={documents} />);

      await user.click(screen.getByRole('button', { name: 'Cards' }));
      await addFilter(user, /^status$/i);
      await user.click(screen.getByRole('button', { name: /status value/i }));
      await user.click(await screen.findByRole('menuitemcheckbox', { name: /^finalized$/i }));

      expect(screen.getByRole('link', { name: 'QS-INV-2627-001' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Draft' })).not.toBeInTheDocument();
    });

    /**
     * Sorting's only control is the column headers. Leaving the eye visible in
     * card view would offer a toggle that changes nothing on screen.
     */
    it('hides the sort toggle in card view', async () => {
      const user = userEvent.setup();
      render(<DocumentsBrowser documents={documents} />);

      expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Cards' }));
      expect(screen.queryByRole('button', { name: 'Sort' })).not.toBeInTheDocument();
    });

    it('remembers the choice across a remount', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<DocumentsBrowser documents={documents} />);
      await user.click(screen.getByRole('button', { name: 'Cards' }));
      unmount();

      render(<DocumentsBrowser documents={documents} />);
      expect(await screen.findByRole('button', { name: 'Cards' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });
});
