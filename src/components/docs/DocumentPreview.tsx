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

// Vertical gap between stacked pages in the scrolling column.
const PAGE_GAP = 24;

/**
 * The page drop shadow. Neutral and light — the sheet is the artifact, the
 * shadow only lifts it off the muted viewport. Dark mode gets a faint light
 * rim instead of a dark blur, which would be invisible on a dark background.
 */
const PAGE_SHADOW =
  'shadow-[0_2px_8px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] ' +
  'dark:shadow-[0_2px_10px_rgba(255,255,255,0.07),0_1px_3px_rgba(255,255,255,0.04)]';

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

  // A4 content box height minus this document's page padding, whatever its
  // running header and footer take, and PAGE_SAFETY_MARGIN. Blocks are packed
  // until the next one would overflow it.
  const pageContentHeight =
    SHEET_HEIGHT - pagePaddingY - chromeHeight - PAGE_SAFETY_MARGIN;
  const { flowRef, pages: flowPages } = usePagination(
    flowBlocks,
    pageContentHeight,
    columns,
    forceDark,
  );

  // Fit the A4 page *width* into the viewport — with a continuously scrolling
  // column the pane is no longer A4-shaped, so height must not bind (it would
  // shrink pages needlessly). Never upscale past 100%: the page is capped at its
  // true 794px so text stays crisp and matches print.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setScale(Math.min(1, viewport.clientWidth / SHEET_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Total pages includes the cover (if any) plus the measured flow pages.
  const coverCount = coverBlock ? 1 : 0;
  const pageCount = coverCount + (flowPages ? flowPages.length : 1);

  // Report the page count up so the bar can render "Page n / total".
  useEffect(() => {
    onPageCountChange?.(pageCount);
  }, [pageCount, onPageCountChange]);

  // Phase 1 — not yet measured: render the flow un-paginated so heights can be
  // read. The visible pane shows all blocks until measured.
  const measuring = flowPages === null;

  useImperativeHandle(
    ref,
    () => ({
      scrollToPage: (index: number) => {
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
    }),
    [scale],
  );

  // Track which page occupies the viewport as the user scrolls, so the counter
  // stays truthful without the parent driving it. Uses IntersectionObserver
  // against the scroll viewport; jsdom's stub never fires, which is the correct
  // inert fallback there.
  const reportCurrent = useCallback(
    (index: number) => onCurrentPageChange?.(index),
    [onCurrentPageChange],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || measuring) return;

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
  }, [measuring, pageCount, reportCurrent]);

  // Literal 794/1123 rather than the constants: Tailwind scans source text, so
  // an interpolated arbitrary value never gets a class generated.
  const pageFrame = `w-[794px] h-[1123px] box-border ${PAGE_SHADOW}`;
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

  // Unscaled height of the whole stacked column, used to reserve the correct
  // on-screen footprint for the transform-scaled holder. While measuring, the
  // flow page has open height (it is the measurement source), so its true
  // height isn't known yet — fall back to `auto` rather than reserving a wrong
  // fixed footprint that would clip the un-paginated flow.
  const columnHeight = measuring
    ? undefined
    : pageCount * SHEET_HEIGHT + Math.max(0, pageCount - 1) * PAGE_GAP;

  const capturePage = (index: number) => (el: HTMLDivElement | null) => {
    pageRefs.current[index] = el;
  };

  /** One packed page, with its furniture and its own colour. */
  const renderPage = (page: PackedPage, index: number) => (
    <div
      key={index}
      ref={capturePage(coverCount + index)}
      className={[
        'paginatorPage',
        flowFrame,
        // A block too tall for its page spills rather than being cut in half.
        page.overflows ? 'overflow-visible' : 'overflow-hidden',
        page.dark ? (darkPageClassName ?? 'bg-black text-white') : 'bg-white text-black',
      ].join(' ')}
    >
      {pageHeader?.(coverCount + index, page.dark)}
      <PageColumns
        page={page}
        blocks={flowBlocks}
        columnWidth={columns > 1 ? columnWidth : undefined}
        columnGap={columnGap}
      />
      {pageFooter?.(coverCount + index, page.dark)}
    </div>
  );

  return (
    <div
      ref={viewportRef}
      className="min-h-0 flex-1 overflow-auto overscroll-contain bg-muted p-6"
      data-slot="document-preview"
    >
      <div
        className="relative mx-auto"
        style={{
          width: SHEET_WIDTH * scale,
          height: columnHeight === undefined ? undefined : columnHeight * scale,
        }}
      >
        <div
          className={
            // Once measured the holder reserves the scaled footprint, so the
            // column is taken out of flow and scaled over it. While measuring
            // the footprint is unknown, so the column stays in flow (otherwise
            // an absolute child would collapse its auto-height parent).
            measuring
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

          {measuring ? (
            // Un-measured: render the whole flow in one open-height frame so
            // per-block heights can be read. Also the jsdom / SSR output.
            <div
              ref={(el) => {
                flowRef.current = el;
                capturePage(coverCount)(el);
              }}
              // Measured at full page width. A block that will sit in a column
              // carries its own width, so the same paragraph is measured in the
              // box it will really occupy without the flow having to know which
              // blocks those are.
              className={`paginatorPage w-[794px] ${
                selfPaddedSheet ? '' : pagePadding
              } ${flowColumn} box-border ${
                forceDark ? (darkPageClassName ?? 'bg-black text-white') : 'bg-white text-black'
              } h-auto min-h-[1123px] ${PAGE_SHADOW}`}
            >
              {flowBlocks}
            </div>
          ) : (
            flowPages.map(renderPage)
          )}
        </div>
      </div>
    </div>
  );
}
