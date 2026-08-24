import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentWorkspaceBar from '../DocumentWorkspaceBar';

function setup(overrides: Partial<React.ComponentProps<typeof DocumentWorkspaceBar>> = {}) {
  const props = {
    title: 'New invoice',
    currentPage: 0,
    pageCount: 5,
    onPrev: jest.fn(),
    onNext: jest.fn(),
    ...overrides,
  };
  render(<DocumentWorkspaceBar {...props} />);
  return props;
}

describe('DocumentWorkspaceBar', () => {
  it('shows the document title and the page counter', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'New invoice' })).toBeInTheDocument();
    expect(screen.getByText('Page 1 / 5')).toBeInTheDocument();
  });

  /**
   * The zoom toggle is gone: `fit` was `min(1, viewportWidth / 794)`, which on
   * any pane at least a page wide already equals 100%. It only ever differed on
   * a narrow pane, so the control read as dead. Fitting is what remains.
   */
  it('offers no zoom controls', () => {
    setup();
    expect(screen.queryByRole('button', { name: /^fit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /100%/ })).not.toBeInTheDocument();
  });

  it('disables previous on the first page', () => {
    setup({ currentPage: 0 });
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeEnabled();
  });

  it('disables next on the last page', () => {
    setup({ currentPage: 4, pageCount: 5 });
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled();
  });

  /**
   * Every invoice, receipt, credit note and slip is one page, so this is the
   * ordinary case rather than the edge one. Two dead arrows and a counter that
   * counts to one are a control whose only content is that it has nothing to
   * do.
   */
  it('shows no pager at all for a single-page document', () => {
    setup({ currentPage: 0, pageCount: 1 });
    expect(screen.queryByRole('button', { name: /previous page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next page/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Page 1 / 1')).not.toBeInTheDocument();
  });

  it('renders the autosave status beside the pager', () => {
    setup({ status: <p>Saved 14:32</p> });
    expect(screen.getByText('Saved 14:32')).toBeInTheDocument();
  });

  it('navigates with the arrows', async () => {
    const user = userEvent.setup();
    const { onNext, onPrev } = setup({ currentPage: 2 });
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onNext).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPrev).toHaveBeenCalled();
  });

  it('announces page changes politely', () => {
    setup({ currentPage: 2 });
    expect(screen.getByText('Page 3 / 5')).toHaveAttribute('aria-live', 'polite');
  });
});
