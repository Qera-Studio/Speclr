import { render, screen } from '@testing-library/react';
import DocumentPreview from '../DocumentPreview';
import { A4_PADDING } from '@/components/docs/sheets/frame';

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
