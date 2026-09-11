import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentPager from '../DocumentPager';

/**
 * The pager, which is what survived `DocumentWorkspaceBar` when the workspace
 * bar was merged into the app header. The title and the autosave line moved to
 * `DocumentWorkspace`'s portal; the arrows, the counter and the go-to box are
 * their own component and keep the bar's tests.
 */
function setup(overrides: Partial<React.ComponentProps<typeof DocumentPager>> = {}) {
  const props = {
    currentPage: 0,
    pageCount: 5,
    onPrev: jest.fn(),
    onNext: jest.fn(),
    onGoToPage: jest.fn(),
    ...overrides,
  };
  render(<DocumentPager {...props} />);
  return props;
}

describe('DocumentPager', () => {
  it('shows the page counter', () => {
    setup();
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

/**
 * The go-to box. It is the pager's own state until it is committed, because
 * typing "1" on the way to "12" must not take the reader to page 1 and then to
 * page 12.
 */
describe('the go-to-page box', () => {
  const box = () => screen.getByRole('textbox', { name: /go to page/i });

  it('shows the current page', () => {
    setup({ currentPage: 2 });
    expect(box()).toHaveValue('3');
  });

  it('goes to the typed page on Enter, and not before', async () => {
    const user = userEvent.setup();
    const { onGoToPage } = setup({ currentPage: 0 });

    await user.clear(box());
    await user.type(box(), '4');
    expect(onGoToPage).not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    // Zero-based, so page 4 of 5 is index 3.
    expect(onGoToPage).toHaveBeenCalledWith(3);
  });

  it('takes digits only', async () => {
    const user = userEvent.setup();
    setup();
    await user.clear(box());
    await user.type(box(), '1a2');
    expect(box()).toHaveValue('12');
  });

  /**
   * A page that does not exist is not a page. It goes back to saying where the
   * reader is rather than moving them somewhere arbitrary, which is also what
   * an emptied box does.
   */
  it('refuses a page past the end and returns to the current one', async () => {
    const user = userEvent.setup();
    const { onGoToPage } = setup({ currentPage: 1, pageCount: 5 });

    await user.clear(box());
    await user.type(box(), '9{Enter}');

    expect(onGoToPage).not.toHaveBeenCalled();
    expect(box()).toHaveValue('2');
  });

  it('refuses an empty box', async () => {
    const user = userEvent.setup();
    const { onGoToPage } = setup({ currentPage: 1 });

    await user.clear(box());
    await user.keyboard('{Enter}');

    expect(onGoToPage).not.toHaveBeenCalled();
    expect(box()).toHaveValue('2');
  });

  /** Scrolling the preview moves the page, and the box has to follow it. */
  it('follows the page when it changes underneath', () => {
    const { rerender } = render(<DocumentPager currentPage={0} pageCount={5} />);
    expect(box()).toHaveValue('1');

    rerender(<DocumentPager currentPage={3} pageCount={5} />);
    expect(box()).toHaveValue('4');
  });

  /**
   * The workspace pages on the arrow keys. Inside this box they have to mean
   * "move the caret" instead, or typing a two-digit page is impossible.
   */
  it('keeps its arrow keys to itself', async () => {
    const user = userEvent.setup();
    const onKeyDown = jest.fn();
    render(
      <div onKeyDown={onKeyDown}>
        <DocumentPager currentPage={0} pageCount={5} />
      </div>,
    );

    await user.click(box());
    await user.keyboard('{ArrowRight}');
    expect(onKeyDown).not.toHaveBeenCalled();
  });
});
