import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecordTable from '../RecordTable';

/**
 * `RecordTable` is where the table rules in `docs/design.md` §2.3 live, so
 * every test here is one of those rules rather than a behaviour of this file.
 *
 * The section exists because prose describing a default does not produce one:
 * every rule was already written down when a table shipped without paging, a
 * caption or sortable heads. What is asserted below is therefore mostly
 * *absence of a prop*: a caller who passes nothing still gets the house
 * behaviour, and losing it takes a visible opt-out at the call site.
 */

interface Row {
  id: string;
  name: string;
  city: string;
}

const rows: Row[] = Array.from({ length: 24 }, (_, i) => ({
  id: String(i + 1),
  name: `Record ${i + 1}`,
  city: i % 2 ? 'Ghaziabad' : 'Pune',
}));

const columns = [
  { key: 'name' as const, label: 'Name', cell: (r: Row) => r.name },
  { key: 'city' as const, label: 'City', cell: (r: Row) => r.city },
];

/** The least a caller can pass. Everything else must come from the component. */
const minimal = {
  rows,
  id: (r: Row) => r.id,
  columns,
  caption: 'Saved records',
  noun: 'record',
};

describe('what a table does without being asked', () => {
  it('pages at ten rows', () => {
    render(<RecordTable {...minimal} />);

    expect(screen.getByText('Record 1')).toBeInTheDocument();
    expect(screen.getByText('Record 10')).toBeInTheDocument();
    expect(screen.queryByText('Record 11')).not.toBeInTheDocument();
  });

  it('counts the rows and offers a pager', () => {
    render(<RecordTable {...minimal} />);

    expect(screen.getByText('1–10 of 24 records')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'records pagination' }),
    ).toBeInTheDocument();
  });

  it('turns the page', async () => {
    const u = userEvent.setup();
    render(<RecordTable {...minimal} />);

    // The pages are buttons now: on a list short enough to list in full there
    // are no arrows, because every page is already one click away.
    await u.click(screen.getByRole('button', { name: 'Page 2 of records' }));

    expect(screen.getByText('Record 11')).toBeInTheDocument();
    expect(screen.queryByText('Record 1')).not.toBeInTheDocument();
    expect(screen.getByText('11–20 of 24 records')).toBeInTheDocument();
  });

  /** A table with no caption is an unnamed region, and it is one string. */
  it('names itself', () => {
    render(<RecordTable {...minimal} />);
    expect(screen.getByRole('table', { name: 'Saved records' })).toBeInTheDocument();
  });

  /**
   * Ascending, then descending, then back to the order the list arrived in:
   * that last one is a real answer (a list is usually sorted meaningfully
   * before it gets here) and has to be reachable.
   *
   * The sort is numeric-aware, which is not a nicety: plain lexicographic
   * order puts 'Record 10' before 'Record 9' on every numbered list in the
   * app, and a table that claims to sort and gets 9 and 10 the wrong way round
   * is worse than one that does not sort.
   */
  it('sorts on every column heading, numerically, and back again', async () => {
    const u = userEvent.setup();
    // `sortable`, because sorting is opt-in: see the rule below.
    render(<RecordTable {...minimal} sortable />);
    const head = screen.getByRole('button', { name: 'Name' });
    // Cell 1, not 0: every row opens with the checkbox column now.
    const firstCell = () => screen.getAllByRole('cell')[1]!.textContent;

    await u.click(head);
    expect(firstCell()).toBe('Record 1');

    await u.click(head);
    expect(firstCell()).toBe('Record 24');

    await u.click(head);
    expect(firstCell()).toBe('Record 1');
  });

  /**
   * The column is present whether or not a row has anything in it, or rows
   * change width as you page.
   */
  it('reserves the actions column', () => {
    render(<RecordTable {...minimal} />);
    expect(screen.getByText('Actions')).toHaveClass('sr-only');
  });

  it('says so when there is nothing to show', () => {
    render(<RecordTable {...minimal} rows={[]} empty={{ title: 'No records yet' }} />);

    expect(screen.getByText('No records yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

/**
 * Sorting is the one default that runs the other way, and the reason is a rule
 * about pairs rather than about sorting (`docs/design.md` §2.3).
 *
 * The controls appear on a heading under the pointer, and the *only* other UI
 * sorting has is `SortToggle`, which lives in a `FilterBar` this component does
 * not own and cannot render into. So a table that sorts without its caller
 * having placed that toggle offers an affordance with no way to turn it off,
 * which is what the clause library and the employees list both did: arrows on
 * hover, no eye anywhere on the page.
 *
 * Making it opt-in is what makes the broken pairing unreachable. A caller
 * passing `sortable` is a caller that has a bar to put the toggle in.
 */
describe('sorting, which is opt-in because its toggle lives elsewhere', () => {
  it('offers no sorting unless it is asked for', () => {
    render(<RecordTable {...minimal} />);

    expect(screen.queryByRole('button', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'City' })).not.toBeInTheDocument();
    // The heading is still there, as a heading. It just does not act.
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  });

  /**
   * `aria-sort` is what tells a screen reader a column *can* be sorted, so a
   * table with no sorting must not announce it. Otherwise the two audiences
   * are told different things about the same table.
   */
  it('announces no sortability when there is none', () => {
    render(<RecordTable {...minimal} />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveAttribute('aria-sort');
  });

  /**
   * A caller that owns the order still drives it, as the documents list does.
   *
   * With `externalSort` and no handler the eye is *shut*: the order stands and
   * the controls are hidden, so there is no sortable control to announce and
   * `aria-sort` is rightly absent. Handing the handler back is what reveals
   * them, which is the eye being opened.
   */
  it('still takes an order from a caller that owns one', () => {
    const { rerender } = render(
      <RecordTable {...minimal} sort={{ column: 'name', direction: 'asc' }} externalSort />,
    );
    expect(screen.queryByRole('button', { name: 'Name' })).not.toBeInTheDocument();

    rerender(
      <RecordTable
        {...minimal}
        sort={{ column: 'name', direction: 'asc' }}
        onSortChange={jest.fn()}
        externalSort
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });
});

describe('opting out, which must be explicit', () => {
  it('drops sorting on a column that asks', () => {
    render(
      <RecordTable
        {...minimal}
        sortable
        columns={[{ ...columns[0]!, sortable: false }, columns[1]!]}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'City' })).toBeInTheDocument();
  });

  it('takes a different page size', () => {
    render(<RecordTable {...minimal} pageSize={5} />);

    expect(screen.getByText('Record 5')).toBeInTheDocument();
    expect(screen.queryByText('Record 6')).not.toBeInTheDocument();
  });
});

/**
 * The geometry rule, as far as jsdom can see it. What jsdom *cannot* see is
 * whether the overlay actually covers the row, which is why the real check is
 * `e2e/record-table.spec.ts`: both ways this breaks look identical here.
 */
describe('a row that opens its record', () => {
  it('is a real link across the whole row, on a positioned row', () => {
    render(<RecordTable {...minimal} open={(r) => ({ href: `/records/${r.id}` })} />);

    const link = screen.getByRole('link', { name: 'Record 1' });
    expect(link).toHaveAttribute('href', '/records/1');
    // Stretched over the row, and the row is what it resolves against.
    expect(link.className).toMatch(/after:absolute/);
    expect(link.closest('tr')).toHaveClass('relative');
  });

  /**
   * The link *wraps* the first cell's value rather than sitting beside it.
   * Rendering both printed the column twice ("AlphaAlpha"), and every
   * role-based query in this file missed it, because the link's accessible
   * name was correct either way. Assert the cell's text, not the link's.
   */
  it('does not print the first column twice', () => {
    render(<RecordTable {...minimal} open={(r) => ({ href: `/records/${r.id}` })} />);

    expect(screen.getAllByRole('cell')[1]).toHaveTextContent(/^Record 1$/);
  });

  /**
   * A frozen first column is positioned, so the named link's overlay covers
   * that cell alone. A pointer-only twin of it goes in the first unfrozen
   * cell: same href, out of the tab order and hidden from assistive tech, so
   * the row still has exactly one link to announce. Whether it actually
   * covers the row is `e2e/record-table.spec.ts`'s question.
   */
  it('gives a frozen table a pointer-only twin of the link in the first unfrozen cell', () => {
    const { container } = render(
      <RecordTable
        {...minimal}
        columns={[{ ...columns[0], sticky: true }, columns[1]]}
        open={(r) => ({ href: `/records/${r.id}` })}
      />,
    );

    expect(screen.getAllByRole('link', { name: /^Record \d+$/ })).toHaveLength(10);
    const twin = container.querySelector('td[data-col="city"] a[aria-hidden="true"]');
    expect(twin).toHaveAttribute('href', '/records/1');
    expect(twin).toHaveAttribute('tabindex', '-1');
  });

  it('is a button, not a row handler, when it opens something that is not a URL', async () => {
    const u = userEvent.setup();
    const onOpen = jest.fn();
    render(<RecordTable {...minimal} open={(r) => ({ onClick: () => onOpen(r.id) })} />);

    await u.click(screen.getByRole('button', { name: 'Open Record 2' }));

    expect(onOpen).toHaveBeenCalledWith('2');
    expect(screen.getByRole('button', { name: 'Open Record 2' }).closest('tr')).toHaveClass(
      'relative',
    );
  });
});

describe('row actions', () => {
  it('puts them in the reserved column, reachable by keyboard when hidden', () => {
    render(
      <RecordTable
        {...minimal}
        actions={(r) => <button type="button">Edit {r.name}</button>}
      />,
    );

    const edit = screen.getByRole('button', { name: 'Edit Record 1' });
    const wrapper = edit.parentElement!;
    // Revealed on hover, but never `hidden`: opacity keeps it in the tab order.
    expect(wrapper.className).toMatch(/opacity-0/);
    expect(wrapper.className).toMatch(/group-hover\/row:opacity-100/);
    expect(wrapper.className).toMatch(/focus-within:opacity-100/);
  });

  it('does not let a row action open the record', async () => {
    const u = userEvent.setup();
    const onOpen = jest.fn();
    const onEdit = jest.fn();
    render(
      <RecordTable
        {...minimal}
        open={() => ({ onClick: onOpen })}
        actions={() => (
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        )}
      />,
    );

    await u.click(screen.getAllByRole('button', { name: 'Edit' })[0]!);

    expect(onEdit).toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('selection', () => {
  /**
   * Unconditional, on instruction: removing a checkbox column from one table
   * is a smaller and rarer job than remembering to add it to each new one, and
   * a list where some rows can be ticked and others cannot is a list nobody
   * trusts to be tickable.
   */
  it('is there whether or not a bulk action was passed', () => {
    render(<RecordTable {...minimal} />);
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  /**
   * The bar is what a tick is *for*, so it only appears where something can
   * act on the selection. Ticks with no bar still do something useful (they
   * mark rows while you read), and the alternative is a bar with no buttons.
   */
  it('offers no bar until there is something to do with a selection', async () => {
    const u = userEvent.setup();
    render(<RecordTable {...minimal} />);

    await u.click(screen.getAllByRole('checkbox')[1]!);

    expect(screen.queryByText(/1 record selected/i)).not.toBeInTheDocument();
  });

  it('offers a bar once a bulk action exists', async () => {
    const u = userEvent.setup();
    render(<RecordTable {...minimal} onBulkDelete={jest.fn()} />);

    await u.click(screen.getAllByRole('checkbox')[1]!);

    expect(screen.getByText(/1 record selected/i)).toBeInTheDocument();
  });

  /**
   * A table may offer more than one thing to do with a selection. Delete keeps
   * its own slot because it is the destructive one and is styled as such;
   * anything else is an ordinary button beside it.
   */
  it('takes bulk actions besides delete', async () => {
    const u = userEvent.setup();
    const onArchive = jest.fn();
    render(
      <RecordTable
        {...minimal}
        bulkActions={[{ label: 'Archive', onAction: onArchive }]}
      />,
    );

    await u.click(screen.getAllByRole('checkbox')[1]!);
    await u.click(screen.getByRole('button', { name: 'Archive' }));

    expect(onArchive).toHaveBeenCalledWith([rows[0]]);
  });

  it('confirms a bulk action that says it needs confirming', async () => {
    const u = userEvent.setup();
    const onArchive = jest.fn();
    render(
      <RecordTable
        {...minimal}
        bulkActions={[
          { label: 'Archive', onAction: onArchive, confirm: 'These leave the list.' },
        ]}
      />,
    );

    await u.click(screen.getAllByRole('checkbox')[1]!);
    await u.click(screen.getByRole('button', { name: 'Archive' }));
    expect(onArchive).not.toHaveBeenCalled();

    await u.click(await screen.findByRole('button', { name: 'Archive 1 record' }));
    expect(onArchive).toHaveBeenCalledWith([rows[0]]);
  });

  it('selects the rows on screen and reports the count', async () => {
    const u = userEvent.setup();
    render(<RecordTable {...minimal} onBulkDelete={jest.fn()} />);

    await u.click(screen.getByRole('checkbox', { name: /select all/i }));

    // The page, not all 24: select-all means what you can see.
    expect(screen.getByText(/10 records selected/i)).toBeInTheDocument();
  });
});
