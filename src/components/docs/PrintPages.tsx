'use client';

import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePagination } from './usePagination';
import type { PageChrome } from './DocumentPreview';
import PageColumns from './PageColumns';
import PageThumbnails from './PageThumbnails';
import { PageHeaderSlot } from '@/components/admin/PageHeaderSlot';
import DocumentPager from './DocumentPager';
import { PAGE_SAFETY_MARGIN, SHEET_HEIGHT } from './sheets/frame';

/**
 * The paginated document, at 100%, one page per sheet of paper.
 *
 * The same blocks and the same packer as `DocumentPreview` — deliberately, so
 * the PDF cannot disagree with the preview about where a page breaks. The only
 * differences are that there is no scaling, no scroll viewport and no page
 * tracking, and that each page carries a CSS page break.
 *
 * Measurement happens on the client after hydration; before it settles the
 * flow renders un-paginated, which is also what a printer would get if it
 * printed within that first frame. In practice the user reaches the print
 * dialog long after.
 */
export default function PrintPages({
  children,
  pagePadding,
  pagePaddingY,
  selfPaddedSheet = false,
  darkPageClassName,
  pageHeader,
  pageFooter,
  chromeHeight = 0,
  columns = 1,
  columnWidth,
  columnGap = 0,
  forceDark = false,
}: {
  children: ReactNode;
  pagePadding: string;
  pagePaddingY: number;
  /** As in `DocumentPreview`: a sheet that paints its own A4 margins. */
  selfPaddedSheet?: boolean;
  darkPageClassName?: string;
  pageHeader?: PageChrome;
  pageFooter?: PageChrome;
  chromeHeight?: number;
  /** As in `DocumentPreview` — the contract prints two columns. */
  columns?: number;
  columnWidth?: number;
  columnGap?: number;
  /** Paint every flowing page dark — see `packBlocks`. Only the quotation sets this. */
  forceDark?: boolean;
}) {
  const blocks = Children.toArray(children).filter(isValidElement);
  // `pages === null`, not `measuring`: a print route's document never changes
  // under it, so this measures once and the two are the same question here.
  // The preview has to tell them apart because it is being typed into.
  const { flowRef, pages } = usePagination(
    blocks,
    SHEET_HEIGHT - pagePaddingY - chromeHeight - PAGE_SAFETY_MARGIN,
    columns,
    forceDark,
  );

  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const pageCount = pages?.length ?? 1;

  /*
    Paging scrolls whichever box is actually doing the scrolling.

    Inside `AdminShell` that is the content area, which is a nested scroll box;
    on the standalone preview route it is the window. `scrollIntoView` handles
    both and walks every ancestor, which is exactly what is wanted here and is
    why this is not `scrollTop` arithmetic against a viewport ref the way
    `DocumentPreview` does it — that component owns its scroll container and
    this one does not.

    `block: 'start'` with the smooth behaviour: the page lands at the top of
    whatever is scrolling, which is what a page rail is expected to do.
  */
  const goToPage = useCallback((index: number) => {
    const clamped = Math.min(Math.max(0, index), pageRefs.current.length - 1);
    setCurrentPage(clamped);
    pageRefs.current[clamped]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Which page is in view, so the pager and the rail's highlight stay truthful
  // while somebody scrolls rather than clicks. Same arrangement as
  // `DocumentPreview`'s, against the viewport instead of an inner box; jsdom's
  // stub never fires, which is the correct inert fallback there.
  useEffect(() => {
    const nodes = pageRefs.current.filter(Boolean) as HTMLDivElement[];
    if (nodes.length === 0) return;

    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => ratios.set(e.target, e.intersectionRatio));
        let best = -1;
        let bestRatio = 0;
        nodes.forEach((node, i) => {
          const ratio = ratios.get(node) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = i;
          }
        });
        if (best >= 0) setCurrentPage(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [pageCount]);

  // Height is added per branch rather than baked in: `h-auto` alongside
  // `h-[1123px]` is a coin toss over which rule the stylesheet emits last.
  const frame = `paginatorPage w-[794px] box-border flex flex-col [&>*]:shrink-0 ${
    selfPaddedSheet ? '' : pagePadding
  }`;

  if (pages === null) {
    return (
      <div
        ref={flowRef}
        // Measured at full page width; a column block carries its own — see
        // `DocumentPreview`.
        className={`paginatorPage w-[794px] box-border flex flex-col [&>*]:shrink-0 ${
          selfPaddedSheet ? '' : pagePadding
        } min-h-[1123px] ${forceDark ? (darkPageClassName ?? 'bg-black text-white') : 'bg-white text-black'}`}
      >
        {blocks}
      </div>
    );
  }

  /**
   * One page's content, with its furniture and its own colour.
   *
   * Built once and used twice — in the document and in the rail's thumbnail —
   * so the two cannot show different things. The page *frame* is not in here:
   * the document's carries a ref and the print break, the thumbnail's is a
   * fixed scaled box, and only the content is common to both.
   */
  const pageBody = (page: (typeof pages)[number], i: number) => (
    <>
      {pageHeader?.(i, page.dark)}
      <PageColumns
        page={page}
        blocks={blocks}
        columnWidth={columns > 1 ? columnWidth : undefined}
        columnGap={columnGap}
      />
      {pageFooter?.(i, page.dark)}
    </>
  );

  const pageClass = (page: (typeof pages)[number]) =>
    [
      frame,
      'h-[1123px]',
      page.overflows ? 'overflow-visible' : 'overflow-hidden',
      page.dark ? (darkPageClassName ?? 'bg-black text-white') : 'bg-white text-black',
    ].join(' ');

  return (
    <>
      {/*
        The signal the PDF renderer waits on (`server/pdf/render.ts`).

        Pagination measures real boxes after hydration, so a headless browser
        that printed on `load` would capture the un-paginated flow above —
        a contract as one enormous page with no breaks. Rendered here rather
        than set imperatively so it cannot get out of step with the pages: if
        they are on screen, so is this.
      */}
      <div data-paginated="ready" hidden />

      {/* The pager goes up on the app header's row, beside the finalized
          actions — the same slot and the same control the editor workspace
          uses, so paging a document works identically wherever you meet it. */}
      {pageCount > 1 ? (
        <PageHeaderSlot>
          <div data-print-hidden className="ml-auto flex shrink-0 items-center">
            <DocumentPager
              currentPage={Math.min(currentPage, pageCount - 1)}
              pageCount={pageCount}
              onPrev={() => goToPage(currentPage - 1)}
              onNext={() => goToPage(currentPage + 1)}
              onGoToPage={goToPage}
            />
          </div>
        </PageHeaderSlot>
      ) : null}

      {/*
        The rail and the pages, side by side. `items-start` so the rail's own
        scroll box is bounded by the viewport rather than growing to the height
        of the document beside it, and `sticky` so it stays put while the pages
        scroll past. Both are `data-print-hidden`-free: the rail carries its
        own, and this wrapper is what the printed flow uses.
      */}
      <div className="doc-print-body">
        <div
          data-print-hidden
          className="sticky top-2 hidden max-h-[calc(100svh-1rem)] lg:block"
        >
          <PageThumbnails
            pages={pages.map((page, i) => (
              <div key={i} className={pageClass(page)}>
                {pageBody(page, i)}
              </div>
            ))}
            currentPage={Math.min(currentPage, pageCount - 1)}
            onGoToPage={goToPage}
          />
        </div>

        <div className="doc-print-column">
          {pages.map((page, i) => (
            <div
              key={i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              className={pageClass(page)}
            >
              {pageBody(page, i)}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
