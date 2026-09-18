'use client';

import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  /*
    While a click's smooth scroll is in flight the observer must not answer.

    It is the fix for the pager twitching, and the twitch was real: clicking
    Next read 1 → 2 → 1 → 2. `goToPage` sets the page immediately, then the
    smooth scroll takes ~400ms to arrive, and the observer fires throughout it
    reporting whichever page currently covers most of the viewport — which for
    most of that trip is still the page being left. So the number the click set
    was overwritten by the page it came from, and only corrected once the
    scroll landed.

    A ref rather than state: nothing renders off it, and a re-render per
    scroll frame is the opposite of what this is for. Cleared by the scroll
    itself going quiet rather than by a fixed timer, because how long the trip
    takes is the browser's business and a page-1-to-page-7 jump is not a
    page-1-to-page-2 one.
  */
  const settling = useRef<number | null>(null);

  /**
   * The box that actually scrolls, and how tall it is.
   *
   * Inside `AdminShell` that is `#main-content` within the inset card; on the
   * standalone print route there is no such box and the window scrolls. The
   * rail is capped against this rather than against `100svh`, because the two
   * differ by the header band and the card's margins — and sized to the
   * viewport the rail came out *taller than its own container*, so it overflowed
   * the inset rather than scrolling inside itself and its last thumbnails could
   * not be reached.
   *
   * Published as `--doc-scroll-height` on `.doc-print-page` for the rail to
   * read, and kept in a ref for the scroll-to-top control, which has to scroll
   * whichever box this is.
   */
  const anchor = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLElement | null>(null);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    const host = anchor.current?.closest<HTMLElement>('.doc-print-page');
    if (!host) return;

    // The nearest ancestor that scrolls; `null` means the window does.
    let box: HTMLElement | null = host.parentElement;
    while (box) {
      if (/auto|scroll/.test(getComputedStyle(box).overflowY)) break;
      box = box.parentElement;
    }
    scroller.current = box;

    const publish = () => {
      host.style.setProperty(
        '--doc-scroll-height',
        `${box ? box.clientHeight : window.innerHeight}px`,
      );
    };
    publish();

    // The inset resizes with the window and with the editor rail opening, and
    // neither is a scroll event.
    const observer = new ResizeObserver(publish);
    observer.observe(box ?? document.documentElement);

    // Whether the scroll-to-top control has anything to offer. One page of
    // slack before it appears, so it does not flicker in on a stray wheel tick.
    const target: HTMLElement | Window = box ?? window;
    const onScroll = () => {
      setAtTop((box ? box.scrollTop : window.scrollY) < 400);
    };
    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      target.removeEventListener('scroll', onScroll);
      host.style.removeProperty('--doc-scroll-height');
    };
  }, [pageCount]);

  const scrollToTop = useCallback(() => {
    const box = scroller.current;
    if (box) box.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToPage = useCallback((index: number) => {
    const clamped = Math.min(Math.max(0, index), pageRefs.current.length - 1);
    setCurrentPage(clamped);
    if (settling.current !== null) window.clearTimeout(settling.current);
    settling.current = window.setTimeout(() => {
      settling.current = null;
    }, 700);
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
        // Ratios are still recorded while a click's scroll runs, so the
        // observer is current the moment it is allowed to speak again. Only
        // the answer is withheld.
        if (settling.current !== null) return;
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

      {/* Where the scroll box is found from. A zero-height node rather than a
          ref on `.doc-print-page` itself, which belongs to the route and is not
          this component's to hold. */}
      <div ref={anchor} hidden />

      {/* The pager goes up on the app header's row, beside the finalized
          actions — the same slot and the same control the editor workspace
          uses, so paging a document works identically wherever you meet it. */}
      {pageCount > 1 ? (
        <PageHeaderSlot>
          <div data-print-hidden className="ml-auto flex shrink-0 items-center">
            <DocumentPager
              currentPage={Math.min(currentPage, pageCount - 1)}
              pageCount={pageCount}
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
        {/*
          The rail sticks under the locked band, not at the top of the box.

          `top-0` was right while nothing was pinned above it, and became the
          bug the moment the sealed card was: the card holds the first 78px of
          the scroll box, so a rail pinning to 0 travelled that far before
          catching and the whole column visibly jumped as the document moved
          under it. Nothing else on the page shifts on scroll, so the rail
          shifting read as the layout coming apart.

          `--doc-locked-band` is the card's occupied height, published by
          `PrintToolbar` onto `.doc-print-page`. It falls back to `0`: a draft
          prints no card, nothing is pinned above the rail, and it sticks at the
          very top exactly as it did before any of this. That fallback is what
          `e2e/page-rail.spec.ts` measures when it asserts the scrolled rail
          reaches 0.

          **The height is bounded by the scroll box, not by the viewport**, and
          that distinction is the whole of the rail's own scrolling. This lives
          inside `#main-content` in the inset card, which is shorter than the
          window by the header band and the card's margins — so `100svh` sized
          the rail *taller than the box holding it*, it overflowed the inset
          instead of scrolling, and its last thumbnails were unreachable.
          `--doc-scroll-height` is that box measured, published beside the band.
          It falls back to `100svh` for the standalone print route, where the
          window really is the scroll box.
        */}
        <div
          data-print-hidden
          className="sticky hidden max-h-[calc(var(--doc-scroll-height,100svh)-var(--doc-locked-band,0px))] top-[var(--doc-locked-band,0px)] lg:block"
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

      {/*
        Back to the top, in the corner of the inset.

        `sticky` inside the scrolling box rather than `fixed`: fixed resolves
        against the viewport wherever it is portalled, so it would sit over the
        nav on one side and outside the card's rounded corner on the other. A
        sticky box at the foot of the flow stays in the corner of the box that
        is actually scrolling, which is the corner the reader is looking at.

        **The box has real height and the button is not transformed**, and both
        halves of that are bug fixes rather than taste. It was `h-0` with the
        button lifted by `-translate-y-full`, which put the *painted* button a
        full button-height above the strip that actually receives the pointer —
        so every click landed on the document behind it and the control did
        nothing at all. A transform moves pixels, never the hit box.

        The transform was also being overwritten. `buttonVariants` carries
        `active:translate-y-px`, so pressing it replaced the lift with a 1px
        nudge and the button visibly dropped its own height out of the inset on
        mousedown. Anything positioning a button belongs on the wrapper, where
        the variant's own transforms cannot reach it.

        `-mt-14` is what keeps it out of the document's length: the row is as
        tall as the button plus its air, and the negative margin pulls that back
        so it overlays the last page rather than adding a band after it.

        It is deliberately quiet: it appears only once there is a screenful to
        come back from, and it is the one control here that is not part of the
        document. `aria-hidden` is *not* set — this is a real control with a
        real name, and the keyboard reaches it.
      */}
      <div
        data-print-hidden
        className="pointer-events-none sticky bottom-0 z-30 -mt-14 flex h-14 items-end justify-end pr-4 pb-4"
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className={[
            'pointer-events-auto rounded-full bg-background/80 shadow-sm backdrop-blur transition-opacity',
            atTop ? 'pointer-events-none opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          <ArrowUp aria-hidden="true" />
        </Button>
      </div>
    </>
  );
}
