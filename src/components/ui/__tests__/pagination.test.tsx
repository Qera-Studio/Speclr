import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { PAGE_SIZE, Pagination, usePagedRows } from '@/components/ui/pagination';

/** A minimal host so the hook and the control can be exercised together. */
function Paged({ rows }: { rows: string[] }) {
  const { page, pageCount, visible, setPage } = usePagedRows(rows);
  return (
    <div>
      <ul>
        {visible.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} label="rows" />
    </div>
  );
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => `Row ${i + 1}`);

describe('usePagedRows', () => {
  it(`shows at most ${PAGE_SIZE} rows at a time`, () => {
    render(<Paged rows={rows(24)} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(PAGE_SIZE);
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.queryByText('Row 11')).not.toBeInTheDocument();
  });

  it('walks forward and back through the pages', async () => {
    const user = userEvent.setup();
    render(<Paged rows={rows(24)} />);

    await user.click(screen.getByRole('button', { name: 'Next page of rows' }));
    expect(screen.getByText('Row 11')).toBeInTheDocument();
    expect(screen.queryByText('Row 1')).not.toBeInTheDocument();

    // 24 rows over 10 per page leaves a short final page.
    await user.click(screen.getByRole('button', { name: 'Next page of rows' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Previous page of rows' }));
    expect(screen.getByText('Row 11')).toBeInTheDocument();
  });

  /**
   * Deleting or filtering can shrink the list under the page being viewed. The
   * page is clamped during render, so that shows the last real page rather than
   * an empty table for a page that no longer exists.
   */
  it('clamps to the last page when the list shrinks beneath it', async () => {
    const user = userEvent.setup();

    function Shrinking() {
      const [all, setAll] = useState(rows(24));
      return (
        <div>
          <button type="button" onClick={() => setAll(rows(3))}>
            Shrink
          </button>
          <Paged rows={all} />
        </div>
      );
    }

    render(<Shrinking />);
    await user.click(screen.getByRole('button', { name: 'Next page of rows' }));
    await user.click(screen.getByRole('button', { name: 'Shrink' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Row 1')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  /** A pager whose every control is disabled is noise under a short table. */
  it('renders nothing when everything fits on one page', () => {
    render(<Paged rows={rows(PAGE_SIZE)} />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('disables the arrow at each end of the range', async () => {
    const user = userEvent.setup();
    render(<Paged rows={rows(12)} />);

    expect(screen.getByRole('button', { name: 'Previous page of rows' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page of rows' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next page of rows' }));
    expect(screen.getByRole('button', { name: 'Next page of rows' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page of rows' })).toBeEnabled();
  });
});
