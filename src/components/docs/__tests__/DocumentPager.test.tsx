import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentPager from '../DocumentPager';

/**
 * The pager, which is what survived `DocumentWorkspaceBar` when the workspace
 * bar was merged into the app header. The title and the autosave line moved to
 * `DocumentWorkspace`'s portal; the pages, the arrows and the go-to box are
 * their own component and keep the bar's tests.
 *
 * **Nine pages, not five.** The pager shows every page as a button and brings
 * the arrows and the box in only once there are more than six, so a five-page
 * document has nothing to test them with. Nine is the first count comfortably
 * past that, and it is what a long contract actually runs to.
 *
 * `onPrev`/`onNext` are gone with this change: they existed because the
 * preview's arrows animate a scroll, but the box already went through
 * `onGoToPage` and every caller pointed all three at one function.
 */
const LONG = 9;

function setup(overrides: Partial<React.ComponentProps<typeof DocumentPager>> = {}) {
  const props = {
    currentPage: 0,
    pageCount: LONG,
    onGoToPage: jest.fn(),
    ...overrides,
  };
  render(<DocumentPager {...props} />);
  return props;
}

describe('DocumentPager', () => {
  /** The pages are buttons now, where a "Page 1 / 5" label was a readout. */
  it('offers the pages as buttons', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
  });

  /** The ends stay one click away however long the document. */
  it('keeps the first and last page reachable', () => {
    setup({ currentPage: 4 });
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Page ${LONG}` })).toBeInTheDocument();
  });

  /** A short document lists every page and needs no arrows at all. */
  it('drops the arrows and the box on a document short enough to list', () => {
    setup({ pageCount: 4 });
    expect(screen.queryByRole('button', { name: /previous page/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    for (const n of [1, 2, 3, 4]) {
      expect(screen.getByRole('button', { name: `Page ${n}` })).toBeInTheDocument();
    }
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
    setup({ currentPage: LONG - 1 });
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeEnabled();
  });

  /**
   * One way in. The arrows and a number both go through `onGoToPage`, which is
   * what makes a number click scroll the strip exactly as an arrow does.
   */
  it('navigates with the arrows', async () => {
    const user = userEvent.setup();
    const { onGoToPage } = setup({ currentPage: 2 });

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(onGoToPage).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onGoToPage).toHaveBeenCalledWith(1);
  });

  it('navigates by clicking a page, through the same callback', async () => {
    const user = userEvent.setup();
    const { onGoToPage } = setup({ currentPage: 0 });

    await user.click(screen.getByRole('button', { name: 'Page 3' }));

    expect(onGoToPage).toHaveBeenCalledWith(2);
  });

  it('announces page changes politely', () => {
    setup({ currentPage: 2 });
    expect(screen.getByText(`Page 3 of ${LONG}`)).toHaveAttribute('aria-live', 'polite');
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
    const { onGoToPage } = setup({ currentPage: 1 });

    await user.clear(box());
    await user.type(box(), '99{Enter}');

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
    const { rerender } = render(<DocumentPager currentPage={0} pageCount={LONG} />);
    expect(box()).toHaveValue('1');

    rerender(<DocumentPager currentPage={3} pageCount={LONG} />);
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
        <DocumentPager currentPage={0} pageCount={LONG} />
      </div>,
    );

    await user.click(box());
    await user.keyboard('{ArrowRight}');
    expect(onKeyDown).not.toHaveBeenCalled();
  });
});
