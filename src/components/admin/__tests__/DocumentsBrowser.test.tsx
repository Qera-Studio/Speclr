import { render, screen, within } from '@testing-library/react';
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

/**
 * The board — the third reading of the same rows. What is tested here is what
 * a reader sees: which columns, holding which documents, and the controls that
 * belong to this view and not the others. The ordering rules themselves are
 * `groupDocuments`' and are tested in `documentQuery.test.ts`.
 */
describe('board view', () => {
  afterEach(() => localStorage.clear());

  const openBoard = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Board' }));
  };

  const columns = () =>
    screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

  /** All three cuts are on the page, so re-cutting is one click. */
  const regroup = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    await user.click(within(groupRow()).getByRole('button', { name }));
  };

  const groupRow = () => screen.getByRole('group', { name: 'Group by' });

  /**
   * Type is what a list of documents is mostly read for, so it is where the
   * board opens. It is also the axis whose empty columns offer to fill
   * themselves, which none of the others can.
   */
  it('opens cut by type', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await openBoard(user);

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(columns().slice(0, 2)).toEqual(['Invoice', 'Receipt']);
    expect(
      within(groupRow()).getByRole('button', { name: 'Type' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('cuts by status, which is where a document actually moves', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await openBoard(user);

    await regroup(user, 'Status');

    expect(columns()).toEqual(['Draft', 'Finalized']);
    // Each column holds its own document, not a copy of the whole list.
    expect(
      screen.getByRole('region', { name: 'Draft' }).textContent,
    ).toContain('Beta Ltd.');
    expect(
      screen.getByRole('region', { name: 'Finalized' }).textContent,
    ).toContain('Acme Co.');
  });

  /**
   * Every type this profile can hold, not only the two on screen. An empty
   * column is the board's answer to "has a credit note ever gone out", and a
   * board whose columns appeared and vanished with the data would change shape
   * under every filter.
   */
  it("re-cuts by type from the group row, this profile's types and all", async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await openBoard(user);

    await regroup(user, 'Type');

    expect(columns()).toEqual([
      'Invoice',
      'Receipt',
      'Credit note',
      'Service Quotation',
      'Contract',
    ]);
    // The other profile's types are not columns here — they cannot arrive.
    expect(columns()).not.toContain('Pay slip');
  });

  /**
   * An empty type column names something that can be created, so it offers to,
   * and the offer is the whole column rather than a button in the corner of it.
   * Neither other axis can: a month is past and a status is what finalizing
   * produces, so "new document in June" and "new finalized document" are offers
   * the app cannot honour.
   */
  it('offers to create the type an empty column is named after', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await openBoard(user);

    await regroup(user, 'Type');

    expect(screen.getByRole('link', { name: 'New contract' })).toHaveAttribute(
      'href',
      '/client/docs/new/contract',
    );
    expect(screen.getByRole('link', { name: 'New credit note' })).toBeInTheDocument();
    // The two columns holding something show their cards instead.
    expect(screen.queryByRole('link', { name: 'New invoice' })).not.toBeInTheDocument();
  });

  it('offers nothing of the kind on an empty status column', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={[documents[0]]} />);
    await openBoard(user);

    await regroup(user, 'Status');

    expect(columns()).toEqual(['Finalized', 'Draft']);
    expect(screen.queryByRole('link', { name: /^New / })).not.toBeInTheDocument();
  });

  /** Four empty columns on a list that is one type by construction. */
  it('offers only the type it is a list of, on a per-type list', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={[documents[0]]} hideTypeFilter />);
    await openBoard(user);

    await regroup(user, 'Type');

    expect(columns()).toEqual(['Invoice']);
  });

  it('re-cuts by month, newest first', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await openBoard(user);

    await regroup(user, 'Month');

    expect(columns()).toEqual(['July 2026', 'June 2026']);
  });

  /**
   * A board is read for how much is in each column, so one that quietly held
   * back page two would misreport the only thing it is for.
   */
  it('shows every filtered document, with no pager', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 24 }, (_, i) => ({
      ...documents[0],
      id: `many-${i}`,
      number: `QS-INV-2627-${String(i + 1).padStart(3, '0')}`,
    })) as unknown as AdminDocument[];
    render(<DocumentsBrowser documents={many} />);

    await openBoard(user);

    expect(screen.getAllByRole('listitem')).toHaveLength(24);
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('still narrows to the filters, columns and all', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await openBoard(user);
    await regroup(user, 'Status');

    await addFilter(user, /^status$/i);
    await user.click(screen.getByRole('button', { name: /status value/i }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: /^draft$/i }));

    // Both columns stay: the board's shape is the lifecycle, not the result
    // set. What the filter empties is the column, which is the answer.
    expect(columns()).toEqual(['Draft', 'Finalized']);
    expect(screen.getByRole('region', { name: 'Draft' }).textContent).toContain(
      'Beta Ltd.',
    );
    expect(
      screen.getByRole('region', { name: 'Finalized' }).textContent,
    ).not.toContain('Acme Co.');
  });

  /**
   * Each view gets the one control it can act on: sorting is the table's column
   * headers, grouping is the board's columns, and cards have neither.
   */
  it('swaps the sort toggle for the group row, and only here', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    expect(screen.queryByRole('group', { name: 'Group by' })).not.toBeInTheDocument();
    await openBoard(user);

    expect(groupRow()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sort' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cards' }));
    expect(screen.queryByRole('group', { name: 'Group by' })).not.toBeInTheDocument();
  });

  /**
   * There are three cuts and they are cheap to try, so all three are on the
   * page rather than two of them behind a menu. Which one is in force is the
   * pressed state, not a word in a trigger label.
   */
  it('offers every cut at once, saying which is in force', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await openBoard(user);

    const cut = (name: string) => within(groupRow()).getByRole('button', { name });
    expect(['Type', 'Status', 'Month'].map((n) => cut(n).getAttribute('aria-pressed'))).toEqual(
      ['true', 'false', 'false'],
    );

    await user.click(cut('Month'));

    expect(cut('Month')).toHaveAttribute('aria-pressed', 'true');
    expect(cut('Status')).toHaveAttribute('aria-pressed', 'false');
    expect(columns()).toEqual(['July 2026', 'June 2026']);
  });

  it('remembers the choice across a remount, like the other two', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<DocumentsBrowser documents={documents} />);
    await openBoard(user);
    unmount();

    render(<DocumentsBrowser documents={documents} />);
    expect(await screen.findByRole('button', { name: 'Board' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

/**
 * The client side cannot hold an HR document, so offering to filter its list by
 * an employee named a party it can never contain. The label is derived from the
 * rows now (`partyFieldLabel`), which is what makes both profile homes right.
 */
describe('the party filter’s name', () => {
  it('says Client on a list of client documents', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await user.click(screen.getByRole('button', { name: /add filter/i }));

    expect(await screen.findByRole('menuitem', { name: /^client$/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /employee/i })).not.toBeInTheDocument();
  });

  it('says Employee on a list of HR documents', async () => {
    const user = userEvent.setup();
    const letter = {
      ...documents[0],
      id: 'ofr',
      type: 'OFR',
      number: null,
      status: 'draft',
      employeeSnapshot: { name: 'Ananya' },
    } as unknown as AdminDocument;
    render(<DocumentsBrowser documents={[letter]} />);

    await user.click(screen.getByRole('button', { name: /add filter/i }));

    expect(await screen.findByRole('menuitem', { name: /^employee$/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /client/i })).not.toBeInTheDocument();
  });
});
