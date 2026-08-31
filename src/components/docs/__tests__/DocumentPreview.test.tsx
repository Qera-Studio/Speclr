import { act, render, screen } from '@testing-library/react';
import DocumentPreview from '../DocumentPreview';
import { A4_PADDING } from '@/components/docs/sheets/frame';

/** The packed page frames on screen — the thing an edit must not take away. */
const pageFrames = () => document.querySelectorAll('.paginatorPage.h-\\[1123px\\]');

/**
 * jsdom reports every offsetHeight as 0, so the measurement branch never
 * commits and the preview stays in its un-paginated fallback — that fallback is
 * what these assert. Real pagination, scaling and scroll-tracking can only be
 * verified in a browser.
 */
describe('DocumentPreview (un-measured jsdom fallback)', () => {
  it('renders every block', () => {
    render(
      <DocumentPreview>
        {[<div key="a">Block A</div>, <div key="b">Block B</div>]}
      </DocumentPreview>,
    );
    expect(screen.getByText('Block A')).toBeInTheDocument();
    expect(screen.getByText('Block B')).toBeInTheDocument();
  });

  it('renders a single-element sheet as one page', () => {
    render(
      <DocumentPreview>
        <div>Sheet body</div>
      </DocumentPreview>,
    );
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
  });

  it('reports a page count to the parent', () => {
    const onPageCountChange = jest.fn();
    render(
      <DocumentPreview onPageCountChange={onPageCountChange}>
        <div>Body</div>
      </DocumentPreview>,
    );
    expect(onPageCountChange).toHaveBeenCalledWith(1);
  });

  it('counts the cover as its own page and renders it', () => {
    const onPageCountChange = jest.fn();
    render(
      <DocumentPreview coverFirst firstPageClassName="cover-class" onPageCountChange={onPageCountChange}>
        {[<div key="c">Cover</div>, <div key="a">Body</div>]}
      </DocumentPreview>,
    );
    expect(screen.getByText('Cover')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    // Cover page + the un-measured flow page.
    expect(onPageCountChange).toHaveBeenCalledWith(2);
  });

  it('applies the cover class to the first page only', () => {
    render(
      <DocumentPreview coverFirst firstPageClassName="cover-class">
        {[<div key="c">Cover</div>, <div key="a">Body</div>]}
      </DocumentPreview>,
    );
    const cover = screen.getByText('Cover').parentElement;
    expect(cover?.className).toContain('cover-class');
    const body = screen.getByText('Body').parentElement;
    expect(body?.className).not.toContain('cover-class');
  });

  /**
   * Regression: a self-contained sheet already paints its own A4 margins inside
   * its 794px artwork. Adding the page frame's px-[48px] on top pushed it 48px
   * right and clipped its right edge (lost the studio brand, the totals column
   * and the place-of-supply line). jsdom can't see the clipping, so assert the
   * padding decision itself.
   */
  it('does not add page padding around a self-contained sheet', () => {
    render(
      <DocumentPreview selfPaddedSheet>
        <div>Sheet body</div>
      </DocumentPreview>,
    );
    const page = document.querySelector('.paginatorPage');
    expect(page?.className).not.toContain(A4_PADDING);
    expect(page?.className).toContain('w-[794px]');
  });

  it('adds page padding around bare content blocks', () => {
    render(
      <DocumentPreview>
        {[<div key="a">Clause A</div>, <div key="b">Clause B</div>]}
      </DocumentPreview>,
    );
    const page = document.querySelector('.paginatorPage');
    expect(page?.className).toContain(A4_PADDING);
  });

  /** The offer letter prints roomier pages than the shared A4 margin. */
  it('honours a page padding override', () => {
    render(
      <DocumentPreview pagePadding="pt-[36px] px-[36px] pb-[12px]" pagePaddingY={48}>
        {[<div key="a">Clause A</div>]}
      </DocumentPreview>,
    );
    const page = document.querySelector('.paginatorPage');
    expect(page?.className).toContain('pt-[36px] px-[36px] pb-[12px]');
    expect(page?.className).not.toContain(A4_PADDING);
  });

  /** A trailing block pins itself to the foot with `mt-auto` — needs a column. */
  it('lays pages out as a flex column', () => {
    render(
      <DocumentPreview>
        {[<div key="a">Clause A</div>]}
      </DocumentPreview>,
    );
    expect(document.querySelector('.paginatorPage')?.className).toContain('flex flex-col');
  });

  it('exposes a scrollToPage handle without throwing when unmeasured', () => {
    const ref = { current: null } as React.RefObject<{ scrollToPage: (i: number) => void } | null>;
    render(
      <DocumentPreview ref={ref}>
        <div>Body</div>
      </DocumentPreview>,
    );
    expect(ref.current).not.toBeNull();
    expect(() => ref.current?.scrollToPage(0)).not.toThrow();
  });
});

/**
 * The one thing in this file that gets past jsdom's zero-height renderer, and
 * it is here because the bug it guards was reported from a real browser: every
 * keystroke in the quotation editor made the preview flicker and jump back to
 * the top of the page.
 *
 * The cause was that a changed block list dropped the committed pagination to
 * `null`, which unmounted every packed page, put the one tall un-paginated flow
 * in their place, and restored them a frame later. The scroll container's
 * content changed height twice per keystroke, so the browser clamped the scroll
 * position, and what the reader was looking at was gone.
 *
 * Faking heights and driving the ResizeObserver by hand is enough to reach the
 * measured branch. What cannot be faked is layout, so this asserts that the
 * page frames survive an edit, never where anything landed.
 */
describe('DocumentPreview (re-measuring after an edit)', () => {
  const BLOCK_HEIGHT = 300;
  let offsetHeight: PropertyDescriptor | undefined;
  let resizeObserver: typeof window.ResizeObserver;

  /**
   * Observations waiting to be delivered.
   *
   * Deliberately *not* fired on `observe`. A ResizeObserver that answered
   * immediately would collapse the whole re-measure into one commit, and every
   * assertion below would then be made after the new pages had already
   * replaced the old — which is the state where the bug is invisible and a
   * test proves nothing. Holding the callback is how the intermediate frame,
   * the one the reader actually saw flicker, becomes something to assert on.
   */
  let pending: Array<() => void> = [];
  const settle = () => {
    const due = pending;
    pending = [];
    act(() => due.forEach((fire) => fire()));
  };

  beforeEach(() => {
    pending = [];
    offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => BLOCK_HEIGHT,
    });

    resizeObserver = window.ResizeObserver;
    window.ResizeObserver = class {
      constructor(private callback: ResizeObserverCallback) {}
      observe() {
        pending.push(() => this.callback([], this as unknown as ResizeObserver));
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof window.ResizeObserver;
  });

  afterEach(() => {
    if (offsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
    window.ResizeObserver = resizeObserver;
  });

  const blocks = (suffix: string) =>
    ['A', 'B', 'C'].map((name) => (
      <div key={name} data-page="own">
        Block {name}
        {suffix}
      </div>
    ));

  it('keeps the packed pages on screen while the edit is re-measured', () => {
    const { rerender } = render(<DocumentPreview>{blocks('')}</DocumentPreview>);
    settle();
    expect(pageFrames()).toHaveLength(3);

    // One keystroke: the same three blocks, one of them a character longer.
    // The new heights have not been delivered yet, which is exactly the frame
    // the pages used to disappear for.
    rerender(<DocumentPreview>{blocks('!')}</DocumentPreview>);

    expect(pageFrames()).toHaveLength(3);
    expect(screen.getAllByText(/Block A/).length).toBeGreaterThan(0);

    settle();
    expect(pageFrames()).toHaveLength(3);
  });

  /**
   * The page count is what the workspace bar prints and what `scrollToPage`
   * clamps against, so a mid-edit collapse to 1 does not merely look wrong: it
   * moves the reader.
   */
  it('never reports a collapsed page count mid-edit', () => {
    const onPageCountChange = jest.fn();
    const { rerender } = render(
      <DocumentPreview onPageCountChange={onPageCountChange}>{blocks('')}</DocumentPreview>,
    );
    settle();
    expect(onPageCountChange).toHaveBeenLastCalledWith(3);

    onPageCountChange.mockClear();
    rerender(
      <DocumentPreview onPageCountChange={onPageCountChange}>{blocks('!')}</DocumentPreview>,
    );
    settle();

    expect(onPageCountChange).not.toHaveBeenCalledWith(1);
  });
});
