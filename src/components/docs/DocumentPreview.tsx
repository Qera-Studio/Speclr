'use client';

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  A4_PADDING,
  A4_PADDING_Y,
  PAGE_SAFETY_MARGIN,
  SHEET_HEIGHT,
  SHEET_WIDTH,
} from './sheets/frame';
import { usePagination } from './usePagination';
import type { PackedPage } from './pagination';
import PageColumns from './PageColumns';
import PageThumbnails from './PageThumbnails';

// Vertical gap between stacked pages in the scrolling column.
const PAGE_GAP = 24;

/**
 * The page drop shadow. Neutral and light — the sheet is the artifact, the
 * shadow only lifts it off the muted viewport. Dark mode gets a faint light
 * rim instead of a dark blur, which would be invisible on a dark background.
 *
 * That rim is a *rim*, not a bloom. A 10px white blur under a white A4 page on
 * a near-black ground reads as the sheet glowing rather than sitting on
 * something: the spread is wider than the contrast it is carrying, so the eye
 * sees light leaking out of the paper. A hairline ring plus a 4px lift states
 * the edge, which is the only thing the shadow was ever for here.
 */
const PAGE_SHADOW =
  'shadow-[0_2px_8px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] ' +
  'dark:shadow-[0_1px_4px_rgba(255,255,255,0.035),0_0_0_1px_rgba(255,255,255,0.05)]';

export type DocumentPreviewHandle = {
  /** Scroll the page at `index` (0-based) to the top of the viewport. */
  scrollToPage: (index: number) => void;
};

/**
 * Running page furniture — the contract's header and footer, drawn into every
 * page frame rather than into the content flow.
 *
 * `page` is the 0-based page index and `dark` says whether this page is
 * painted black, so the chrome can invert itself. Whatever height the chrome
 * costs must be declared as `chromeHeight`: it is what pagination reserves,
 * and the two disagreeing is how content gets packed past the footer.
 */
export type PageChrome = (page: number, dark: boolean) => ReactNode;

/**
 * Block-aware A4 pagination rendered as a continuously scrolling page column —
 * the single preview engine for every document type (invoice, receipt,
 * contract, letter, stipend).
 *
 * Children are treated as atomic content blocks; each is measured and packed
 * into fixed A4 pages, breaking only *between* blocks — a clause heading can
 * never separate from its body. A block can ask for a page to itself with
 * `data-page="own"` (and a black one with `data-page-frame="dark"`), which is
 * how the contract's cover, parties page and Schedule covers work. A block
 * taller than one page gets its own page and is allowed to *overflow visibly*
 * rather than being clipped or sliced. Sheets that render as a single element
 * (invoice, receipt) simply pack as one block into one page.
 *
 * All pages are stacked and scroll vertically like a PDF viewer. Zoom and the
 * current page are *controlled* by the parent (the workspace bar owns those
 * controls); this component reports the measured page count back up and tracks
 * which page is in view while the user scrolls.
 *
 * When `coverFirst` is set, block 0 (the cover) is its own dedicated full-bleed
 * first page (no default padding/background) with `firstPageClassName` applied.
 * That predates `data-page="own"` and survives for the offer letter; the
 * contract uses the block attributes instead.
 *
 * Measuring and packing live in `usePagination` / `pagination.ts`, shared with
 * the print route so paper and preview cannot disagree.
 */
export default function DocumentPreview({
  children,
  firstPageClassName,
  coverFirst = false,
  selfPaddedSheet = false,
  pagePadding = A4_PADDING,
  pagePaddingY = A4_PADDING_Y,
  darkPageClassName,
  pageHeader,
  pageFooter,
  chromeHeight = 0,
  columns = 1,
  columnWidth,
  columnGap = 0,
  forceDark = false,
  onPageCountChange,
  onCurrentPageChange,
  ref,
}: {
  children: ReactNode;
  firstPageClassName?: string;
  coverFirst?: boolean;
  /**
   * The page margin for this document type, and what it costs vertically.
   * Defaults to the shared A4 margin; the offer letter prints roomier pages.
   * The two must agree — `pagePaddingY` is the height pagination reserves, so
   * a wrong value packs too much (clipped) or too little (short pages) onto a
   * page.
   */
  pagePadding?: string;
  pagePaddingY?: number;
  /**
   * Set when `children` is a single self-contained sheet that already paints
   * the full 794×1123 page including its own margins (invoice, receipt,
   * letter, stipend). The page frame then adds no padding of its own.
   * Leave false for bare content blocks (the contract), which rely on the
   * frame for their A4 margins.
   */
  selfPaddedSheet?: boolean;
  /** Painted on a page whose block asked for `data-page-frame="dark"`. */
  darkPageClassName?: string;
  pageHeader?: PageChrome;
  pageFooter?: PageChrome;
  /** Total px the header and footer cost a page, reserved by pagination. */
  chromeHeight?: number;
  /**
   * How many columns a page of this document has, how wide each is and what
   * separates them. The contract prints two; everything else prints one.
   *
   * `columnWidth` comes from the sheet rather than being derived here: only the
   * sheet knows its own horizontal margins, and a width guessed from
   * `pagePaddingY` would be wrong the moment a document's margins stop being
   * square. It is a number, not a class — Tailwind scans source text, so an
   * interpolated arbitrary value never generates one.
   */
  columns?: number;
  columnWidth?: number;
  columnGap?: number;
  /** Paint every flowing page dark — see `packBlocks`. Only the quotation sets this. */
  forceDark?: boolean;
  onPageCountChange?: (count: number) => void;
  onCurrentPageChange?: (index: number) => void;
  ref?: Ref<DocumentPreviewHandle>;
}) {
  const blocks = Children.toArray(children).filter(isValidElement);
  const coverBlock = coverFirst ? blocks[0] : null;
  const flowBlocks = coverFirst ? blocks.slice(1) : blocks;

  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [scale, setScale] = useState(0.5);
  /** Which page the rail highlights. Reported up as well — see `reportCurrent`. */
  const [current, setCurrent] = useState(0);

  // A4 content box height minus this document's page padding, whatever its
  // running header and footer take, and PAGE_SAFETY_MARGIN. Blocks are packed
  // until the next one would overflow it.
  const pageContentHeight =
    SHEET_HEIGHT - pagePaddingY - chromeHeight - PAGE_SAFETY_MARGIN;
  const {
    flowRef,
    pages: flowPages,
    measuring: remeasuring,
  } = usePagination(flowBlocks, pageContentHeight, columns, forceDark);

  // Total pages includes the cover (if any) plus the measured flow pages.
  const coverCount = coverBlock ? 1 : 0;
  const pageCount = coverCount + (flowPages ? flowPages.length : 1);

  // Fit the A4 page *width* into the viewport — with a continuously scrolling
  // column the pane is no longer A4-shaped, so height must not bind (it would
  // shrink pages needlessly). Never upscale past 100%: the page is capped at its
  // true 794px so text stays crisp and matches print.
  //
  // The rail's width comes off **both** sides, because the page is centred in
  // the pane and the rail hangs off its left edge out of flow. Taking it off
  // once would let the page grow until it ran under the rail: the page would
  // still be centred, but centred across a width the rail is standing in.
  // Symmetric is what keeps the page both centred and clear of it.
  //
  // Measured from the rail itself rather than written down as a constant: the
  // thumbnail size lives in `PageThumbnails`, and a second copy of it here is a
  // number that would go stale the first time that one moved.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const rail = viewport.querySelector<HTMLElement>('[data-slot="page-thumbnails"]');
      // The rail plus its gutter, on each side. The 24 matches the `mr-6`.
      const reserved = rail ? (rail.offsetWidth + 24) * 2 : 0;
      setScale(Math.min(1, (viewport.clientWidth - reserved) / SHEET_WIDTH));
      // The pane's own visible height, for the rail to bound itself against.
      // Neither the window nor the scrolled content answers this — see the
      // rail's comment below.
      viewport.style.setProperty('--doc-pane-height', `${viewport.clientHeight}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
    // Re-run when the rail appears or goes: it is rendered only once there is
    // more than one page, and its width is what this reserves. Without the
    // dependency the first measurement is taken with no rail in the DOM and the
    // page stays scaled as if it had the whole pane.
  }, [pageCount]);

  // Report the page count up so the bar can render "Page n / total".
  useEffect(() => {
    onPageCountChange?.(pageCount);
  }, [pageCount, onPageCountChange]);

  // Never measured at all — there are no pages to show, so the flow itself is
  // the visible pane until one exists. A *re*-measure is a different state
  // (`remeasuring`): the previous pages stay on screen and the new flow is
  // measured out of sight, so an edit does not tear the preview down and lose
  // the scroll position with it.
  const unmeasured = flowPages === null;

  /**
   * Scroll a page to the top of the viewport.
   *
   * Lifted out of the imperative handle because the rail needs it too, and two
   * copies of this arithmetic is how the rail and the pager come to disagree
   * about where a page starts.
   */
  const scrollToPage = useCallback(
    (index: number) => {
      const page = pageRefs.current[index];
      const viewport = viewportRef.current;
      if (!page || !viewport) return;
      // offsetTop is in unscaled space; the column is transform-scaled, so
      // convert to on-screen pixels before scrolling.
      const top = page.offsetTop * scale;
      // jsdom (and very old browsers) have no Element.scrollTo — fall back to
      // assigning scrollTop so paging never throws.
      if (typeof viewport.scrollTo === 'function') {
        viewport.scrollTo({ top, behavior: 'smooth' });
      } else {
        viewport.scrollTop = top;
      }
    },
    [scale],
  );

  useImperativeHandle(ref, () => ({ scrollToPage }), [scrollToPage]);

  // Track which page occupies the viewport as the user scrolls, so the counter
  // stays truthful without the parent driving it. Uses IntersectionObserver
  // against the scroll viewport; jsdom's stub never fires, which is the correct
  // inert fallback there.
  //
  // Kept here as well as reported up: the rail's highlight is this component's
  // own business, and asking the parent to hand it back would make the rail
  // depend on a prop every caller would have to remember to wire.
  const reportCurrent = useCallback(
    (index: number) => {
      setCurrent(index);
      onCurrentPageChange?.(index);
    },
    [onCurrentPageChange],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || unmeasured) return;

    const pages = pageRefs.current.filter(Boolean) as HTMLDivElement[];
    if (pages.length === 0) return;

    const ratios = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => ratios.set(e.target, e.intersectionRatio));
        let best = -1;
        let bestRatio = 0;
        pages.forEach((page, i) => {
          const ratio = ratios.get(page) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = i;
          }
        });
        if (best >= 0) reportCurrent(best);
      },
      { root: viewport, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    pages.forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [unmeasured, pageCount, reportCurrent]);

  // Literal 794/1123 rather than the constants: Tailwind scans source text, so
  // an interpolated arbitrary value never gets a class generated.
  //
  // The shadow is separated out because the rail's thumbnails reuse the frame
  // without it: a drop shadow scaled to 17% is a smudge, and the thumbnail
  // draws its own border anyway.
  const pageFrameBase = 'w-[794px] h-[1123px] box-border';
  const pageFrame = `${pageFrameBase} ${PAGE_SHADOW}`;
  // A flex column so a trailing block can pin itself to the foot of the page
  // with `mt-auto` — how the letters' signature and footer sit at the bottom,
  // and how the contract's footer sits under its last clause. `shrink-0` keeps
  // a block taller than one page its true height rather than squashing it.
  const flowColumn = 'flex flex-col [&>*]:shrink-0';
  // Bare content blocks (the contract's clause list) need the page's own A4
  // margins. A self-contained sheet already paints its full 794px artwork
  // including its margins, so adding padding here would shrink it inside the
  // frame and clip its right edge.
  const flowFrame = selfPaddedSheet
    ? `${pageFrame} ${flowColumn}`
    : `${pageFrame} ${flowColumn} ${pagePadding}`;
  // The same frame with no drop shadow, for the rail. See `pageFrameBase`.
  const thumbFrame = selfPaddedSheet
    ? `${pageFrameBase} ${flowColumn}`
    : `${pageFrameBase} ${flowColumn} ${pagePadding}`;

  // Unscaled height of the whole stacked column, used to reserve the correct
  // on-screen footprint for the transform-scaled holder. While measuring, the
  // flow page has open height (it is the measurement source), so its true
  // height isn't known yet — fall back to `auto` rather than reserving a wrong
  // fixed footprint that would clip the un-paginated flow.
  const columnHeight = unmeasured
    ? undefined
    : pageCount * SHEET_HEIGHT + Math.max(0, pageCount - 1) * PAGE_GAP;

  const capturePage = (index: number) => (el: HTMLDivElement | null) => {
    pageRefs.current[index] = el;
  };

  // The measurement source: the whole flow in one open-height frame, at full
  // page width. A block that will sit in a column carries its own width, so the
  // same paragraph is measured in the box it will really occupy without the
  // flow having to know which blocks those are.
  const measureFrame = `paginatorPage w-[794px] ${
    selfPaddedSheet ? '' : pagePadding
  } ${flowColumn} box-border ${
    forceDark ? (darkPageClassName ?? 'bg-black text-white') : 'bg-white text-black'
  } h-auto min-h-[1123px]`;

  /**
   * One packed page's content, and the class its frame wears.
   *
   * Split in two for the same reason `PrintPages` splits them: the body is
   * built once and used twice, in the document and in the rail's thumbnail, so
   * the two cannot come to show different things. The *frame* is not shared —
   * the document's carries a page ref and the drop shadow, and the thumbnail's
   * is a fixed scaled box.
   */
  const pageBody = (page: PackedPage, index: number) => (
    <>
      {pageHeader?.(coverCount + index, page.dark)}
      <PageColumns
        page={page}
        blocks={flowBlocks}
        columnWidth={columns > 1 ? columnWidth : undefined}
        columnGap={columnGap}
      />
      {pageFooter?.(coverCount + index, page.dark)}
    </>
  );

  const pageClass = (page: PackedPage, frame: string) =>
    [
      'paginatorPage',
      frame,
      // A block too tall for its page spills rather than being cut in half.
      page.overflows ? 'overflow-visible' : 'overflow-hidden',
      page.dark ? (darkPageClassName ?? 'bg-black text-white') : 'bg-white text-black',
    ].join(' ');

  const renderPage = (page: PackedPage, index: number) => (
    <div
      key={index}
      ref={capturePage(coverCount + index)}
      className={pageClass(page, flowFrame)}
    >
      {pageBody(page, index)}
    </div>
  );

  /**
   * The rail's pages: the cover, where there is one, then every packed page.
   *
   * The cover is included by hand because it is not a `PackedPage` at all — it
   * is block 0 rendered into its own full-bleed frame — and a rail that skipped
   * it would number every thumbnail one short of the page it jumps to.
   *
   * `PAGE_SHADOW` is deliberately absent: the thumbnail draws its own border,
   * and a shadow scaled to 17% is a grey smudge under a 140px box.
   */
  const thumbnailPages: ReactNode[] = unmeasured
    ? []
    : [
        ...(coverBlock
          ? [
              <div
                key="cover"
                className={
                  firstPageClassName
                    ? `paginatorPage ${pageFrameBase} overflow-hidden ${firstPageClassName}`
                    : `paginatorPage ${pageFrameBase} overflow-hidden`
                }
              >
                {coverBlock}
              </div>,
            ]
          : []),
        ...flowPages.map((page, index) => (
          <div key={index} className={pageClass(page, thumbFrame)}>
            {pageBody(page, index)}
          </div>
        )),
      ];

  return (
    <div
      ref={viewportRef}
      className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted p-6"
      data-slot="document-preview"
    >
      {/*
        **The page is centred in the pane; the rail hangs off it.**

        This has now been built both of the obvious ways and both were wrong on
        screen, in opposite directions, which is why the arrangement is worth
        stating rather than reading off the classes.

        The rail *outside* the scroll box strands it: the page column caps at
        794px and re-centres in whatever space is left, so narrowing that space
        from the left pushes the page right and leaves the rail ~195px from the
        document it indexes. Rail and page as one centred flex group fixes the
        gap and breaks the centring instead: the *group's* midpoint lands in the
        middle of the pane, so the page sits right of centre by half the rail's
        width, and on a document this wide that reads as the preview being
        misaligned, which it is.

        So only the page is in the centring flow, and the rail is positioned
        against the page's own left edge, out of flow. Taking it out of flow is
        the whole point: an absolutely positioned box contributes no width, so
        it cannot move what it sits beside. The 24px is the same gutter the
        print route uses.

        `min-h-full` keeps the row as tall as the pane so the rail has something
        to stick within on a one-page document.
      */}
      <div className="relative flex min-h-full justify-center">
        {/*
          Sticky, so the rail stays put while the pages scroll past it. It is
          inside the scroll box, so without this it would scroll away with the
          document, which is the one thing a table of contents must not do.

          `self-start` is what makes `sticky` work at all: a stretched flex item
          is as tall as the row, so there is no room inside it to stick within
          and it simply scrolls.

          The height is bounded by **this scroll box**, never by the viewport
          and never by a container query. That is the whole of the rail's own
          scrolling and it is the mistake the print route already made and
          fixed: this pane sits inside the inset card, which is shorter than the
          window by the header band and the card's margins, so a `100svh` cap
          comes out taller than the box holding it, the rail overflows instead
          of scrolling, and its last thumbnails cannot be reached.

          `100cqh` was tried and is wrong for the same reason in reverse: a
          scroll container's query height is its *content*, so the rail came out
          852px inside a 796px pane and hung 80px below it. `--doc-pane-height`
          is the pane measured, published by the effect above, which is the one
          number that is neither the window nor the scrolled content.
        */}
        {/*
          `data-slot` marks the real pages apart from the rail's.

          Both are `.paginatorPage` and deliberately so — a thumbnail *is* the
          page it stands for — but that makes the class ambiguous the moment the
          rail moved inside this pane, and a count of `.paginatorPage` silently
          doubled. `e2e/paper.ts` had already met the same ambiguity on the print
          route and scopes to `.doc-print-column >`; this is that fix here, and
          `DocumentPreview.test.tsx` is what caught it.
        */}
        <div
          data-slot="document-pages"
          className="relative shrink-0"
          style={{
            width: SHEET_WIDTH * scale,
            height: columnHeight === undefined ? undefined : columnHeight * scale,
          }}
        >
          {/*
            The rail is a child of the page column, which is what makes
            `right-full` mean "against the page's left edge" rather than against
            the pane. It is the page that is centred, and the rail follows it.

            Two boxes, and each does one job. The outer is `absolute` and as
            tall as the whole column, which is what gives the inner one room to
            be `sticky` in: a sticky box can only travel within its own parent,
            so a parent the height of the rail would pin it for a single
            thumbnail's worth of scroll and then carry it away. The inner is the
            one that sticks, and it is bounded against the pane rather than the
            column it lives in.
          */}
          {thumbnailPages.length > 1 ? (
            <div className="absolute inset-y-0 right-full mr-6 hidden lg:block">
              <div className="sticky top-0 flex max-h-[calc(var(--doc-pane-height,100svh)-3rem)]">
                <PageThumbnails
                  className="max-h-full"
                  pages={thumbnailPages}
                  currentPage={Math.min(current, thumbnailPages.length - 1)}
                  onGoToPage={(index) => {
                    reportCurrent(index);
                    scrollToPage(index);
                  }}
                />
              </div>
            </div>
          ) : null}

        <div
          className={
            // Once measured the holder reserves the scaled footprint, so the
            // column is taken out of flow and scaled over it. While measuring
            // the footprint is unknown, so the column stays in flow (otherwise
            // an absolute child would collapse its auto-height parent).
            unmeasured
              ? 'flex flex-col [transform-origin:top_left]'
              : 'absolute top-0 left-0 flex flex-col [transform-origin:top_left]'
          }
          style={{ transform: `scale(${scale})`, gap: PAGE_GAP }}
        >
          {coverBlock ? (
            <div
              ref={capturePage(0)}
              className={
                firstPageClassName
                  ? `paginatorPage ${pageFrame} overflow-hidden ${firstPageClassName}`
                  : `paginatorPage ${pageFrame} overflow-hidden`
              }
            >
              {coverBlock}
            </div>
          ) : null}

          {unmeasured ? (
            // Nothing has ever been measured, so the flow *is* the pane. Also
            // the jsdom / SSR output, where every box reads zero and this is
            // where it stays.
            <div
              ref={(el) => {
                flowRef.current = el;
                capturePage(coverCount)(el);
              }}
              className={`${measureFrame} ${PAGE_SHADOW}`}
            >
              {flowBlocks}
            </div>
          ) : (
            flowPages.map(renderPage)
          )}

          {remeasuring && !unmeasured ? (
            // Re-measuring with pages already on screen. The flow is measured
            // out of sight instead of replacing them, so an edit never takes
            // the reader's page away and never moves the scroll.
            //
            // `h-0 overflow-hidden` on the wrapper rather than on the flow
            // itself: a clipped ancestor changes nothing about a child's own
            // `offsetHeight`, which is all the measurement reads, but it does
            // keep this from adding a second document's worth of scroll height
            // to the viewport. `invisible` rather than `hidden`, because
            // `display: none` has no layout to measure.
            <div
              aria-hidden
              className="pointer-events-none invisible absolute top-0 left-0 h-0 w-[794px] overflow-hidden"
            >
              <div ref={flowRef} className={measureFrame}>
                {flowBlocks}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}
