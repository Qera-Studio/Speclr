'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// A4 at 96dpi.
const SHEET_WIDTH = 794;
const SHEET_HEIGHT = 1123;
// A4 content box height minus the page padding the sheets use (space-8 top +
// bottom ≈ 96px). Blocks are packed until the next one would overflow this.
const PAGE_CONTENT_HEIGHT = SHEET_HEIGHT - 96;

/**
 * A cheap content fingerprint of the block list: block count plus the length of
 * each block's serialized text. Changes whenever a block is added/removed or its
 * text grows/shrinks — i.e. whenever the pagination could change — without a
 * deep structural compare. Used to decide when to re-measure.
 */
function blocksSignature(blocks: ReactNode[]): string {
  const textLength = (node: ReactNode): number => {
    if (node === null || node === undefined || typeof node === 'boolean') return 0;
    if (typeof node === 'string' || typeof node === 'number') return String(node).length;
    if (Array.isArray(node)) return node.reduce((sum, n) => sum + textLength(n), 0);
    if (isValidElement(node)) {
      return textLength((node.props as { children?: ReactNode }).children);
    }
    return 0;
  };
  return `${blocks.length}:${blocks.map(textLength).join(',')}`;
}

/**
 * Block-aware A4 pagination shown as a one-page-at-a-time carousel. Children are
 * treated as atomic content blocks; each is measured and packed into fixed A4
 * pages, breaking only *between* blocks — a clause heading can never separate
 * from its body. Exactly one page is shown at a time (so there is no inter-page
 * "gap" to get wrong), with prev/next arrows, a page counter, and a Fit / 100%
 * zoom toggle. "Fit" scales the whole A4 page into the pane; "100%" shows true
 * size and scrolls within the single page.
 *
 * A block taller than one page (rare) gets its own page and is allowed to
 * overflow rather than being sliced — deterministic and never mangled.
 *
 * When `coverFirst` is set, block 0 (the cover) is its own dedicated full-bleed
 * first page (no default padding/background) with `firstPageClassName` applied —
 * e.g. the black contract / offer-letter cover.
 */
export default function Paginator({
  children,
  firstPageClassName,
  coverFirst = false,
}: {
  children: ReactNode;
  firstPageClassName?: string;
  coverFirst?: boolean;
}) {
  const blocks = Children.toArray(children).filter(isValidElement);
  const coverBlock = coverFirst ? blocks[0] : null;
  const flowBlocks = coverFirst ? blocks.slice(1) : blocks;

  const flowRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const signature = blocksSignature(flowBlocks);

  // Committed pagination tagged with the signature it was measured against; a
  // mismatch means content changed since measuring, so we re-render phase 1.
  const [computed, setComputed] = useState<{ signature: string; pages: number[][] } | null>(null);
  const flowPages = computed && computed.signature === signature ? computed.pages : null;

  const [scale, setScale] = useState(0.5);
  const [zoom, setZoom] = useState<'fit' | 'full'>('fit');
  const [pageIndex, setPageIndex] = useState(0);

  // Measure the un-paginated flow and pack blocks into pages. Runs inside a
  // ResizeObserver callback so it also re-fires if the flow settles late.
  useLayoutEffect(() => {
    const container = flowRef.current;
    if (!container || flowPages !== null) return;

    const measure = () => {
      const nodes = Array.from(container.children) as HTMLElement[];
      const heights = nodes.map((n) => n.offsetHeight);
      // No real measurements (jsdom / pre-layout) → stay un-paginated.
      if (heights.every((h) => h === 0)) return;

      const next: number[][] = [];
      let current: number[] = [];
      let used = 0;
      heights.forEach((h, i) => {
        if (current.length > 0 && used + h > PAGE_CONTENT_HEIGHT) {
          next.push(current);
          current = [];
          used = 0;
        }
        current.push(i);
        used += h;
      });
      if (current.length > 0) next.push(current);
      setComputed({ signature, pages: next.length > 0 ? next : [[]] });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [flowPages, signature]);

  // Fit the WHOLE A4 page inside the viewport — bounded by both width and
  // height so the full page is always visible (never cropped). The viewport is
  // A4-shaped (see className below), so width is normally the binding
  // dimension; the height bound guards odd pane sizes. Never upscale past 100%.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () =>
      setScale(
        Math.min(
          1,
          viewport.clientWidth / SHEET_WIDTH,
          viewport.clientHeight / SHEET_HEIGHT,
        ),
      );
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

  // Clamp during render so a shrinking page count (content edits) never leaves
  // us on a page that no longer exists — no reset effect, no cascading render.
  const currentPage = Math.min(pageIndex, Math.max(0, pageCount - 1));

  const fitting = zoom === 'fit';
  const effectiveScale = fitting ? scale : 1;

  // Phase 1 — not yet measured: render the flow un-paginated so heights can be
  // read. The visible pane shows all blocks (or the cover) until measured.
  const measuring = flowPages === null;

  // Resolve the block set for the currently visible page.
  const showingCover = coverBlock && currentPage === 0;
  const flowPageForIndex =
    !measuring && flowPages ? flowPages[Math.max(0, currentPage - coverCount)] : null;

  const atFirst = currentPage === 0;
  const atLast = currentPage >= pageCount - 1;

  return (
    <div
      className="w-fit max-w-full bg-[#1A1917] border border-[rgba(178,190,214,0.08)] rounded-[8px] p-[16px]"
      role="group"
      aria-label="Document pages"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' && !atLast) setPageIndex(currentPage + 1);
        if (e.key === 'ArrowLeft' && !atFirst) setPageIndex(currentPage - 1);
      }}
    >
      <div className="flex items-center justify-between gap-[16px] mb-[16px]">
        <div className="flex items-center gap-[8px]" role="group" aria-label="Preview zoom">
          <button
            type="button"
            className="bg-transparent border border-[rgba(178,190,214,0.16)] text-[#B2BED6] font-inherit text-[8px] py-[4px] px-[8px] rounded-[4px] cursor-pointer aria-pressed:bg-[#252422] aria-pressed:text-white hover:bg-[#252422] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none"
            aria-pressed={fitting}
            onClick={() => setZoom('fit')}
          >
            Fit
          </button>
          <button
            type="button"
            className="bg-transparent border border-[rgba(178,190,214,0.16)] text-[#B2BED6] font-inherit text-[8px] py-[4px] px-[8px] rounded-[4px] cursor-pointer aria-pressed:bg-[#252422] aria-pressed:text-white hover:bg-[#252422] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none"
            aria-pressed={!fitting}
            onClick={() => setZoom('full')}
          >
            100%
          </button>
        </div>

        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            className="bg-transparent border border-[rgba(178,190,214,0.16)] text-[#B2BED6] font-inherit text-[24px] leading-none w-[26px] h-[26px] inline-flex items-center justify-center rounded-[4px] cursor-pointer hover:not-disabled:bg-[#252422] hover:not-disabled:text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none"
            onClick={() => setPageIndex(Math.max(0, currentPage - 1))}
            disabled={atFirst}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="text-[#B2BED6] text-[8px] min-w-[84px] text-center [font-variant-numeric:tabular-nums]" aria-live="polite">
            Page {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="bg-transparent border border-[rgba(178,190,214,0.16)] text-[#B2BED6] font-inherit text-[24px] leading-none w-[26px] h-[26px] inline-flex items-center justify-center rounded-[4px] cursor-pointer hover:not-disabled:bg-[#252422] hover:not-disabled:text-white disabled:opacity-40 disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none"
            onClick={() => setPageIndex(Math.min(pageCount - 1, currentPage + 1))}
            disabled={atLast}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={
          fitting
            ? 'h-[82vh] [aspect-ratio:794/1123] max-w-full flex items-start justify-center'
            : 'overflow-auto max-h-[82vh]'
        }
      >
        <div
          className="relative overflow-hidden"
          style={{ width: SHEET_WIDTH * effectiveScale, height: SHEET_HEIGHT * effectiveScale }}
        >
          <div
            className="absolute top-0 left-0 [transform-origin:top_left]"
            style={{ transform: `scale(${effectiveScale})` }}
          >
            {showingCover ? (
              <div
                className={
                  firstPageClassName
                    ? `paginatorPage w-[794px] h-[1123px] box-border overflow-hidden shadow-[0_8px_32px_rgba(20,42,87,0.32),0_4px_8px_rgba(20,42,87,0.16)] ${firstPageClassName}`
                    : 'paginatorPage w-[794px] h-[1123px] box-border overflow-hidden shadow-[0_8px_32px_rgba(20,42,87,0.32),0_4px_8px_rgba(20,42,87,0.16)]'
                }
              >
                {coverBlock}
              </div>
            ) : measuring ? (
              // Un-measured: show all flow blocks in one page frame (also the
              // jsdom / SSR output). This visible page is the measurement source.
              <div
                ref={flowRef}
                className="paginatorPage w-[794px] py-[64px] px-[48px] box-border bg-white text-black overflow-hidden shadow-[0_8px_32px_rgba(20,42,87,0.32),0_4px_8px_rgba(20,42,87,0.16)] h-auto min-h-[1123px] !overflow-visible"
              >
                {flowBlocks}
              </div>
            ) : (
              <div className="paginatorPage w-[794px] h-[1123px] py-[64px] px-[48px] box-border bg-white text-black overflow-hidden shadow-[0_8px_32px_rgba(20,42,87,0.32),0_4px_8px_rgba(20,42,87,0.16)]">
                {(flowPageForIndex ?? []).map((blockIndex) => flowBlocks[blockIndex])}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* While measuring, if the cover is the visible page the flow isn't shown
          above — render it off-screen so its per-block heights can still be
          read. Hidden from the eye and AT; gone once pagination is committed. */}
      {measuring && showingCover ? (
        <div
          ref={flowRef}
          className="absolute top-0 left-0 w-[794px] py-[64px] px-[48px] box-border invisible pointer-events-none -z-10"
          aria-hidden="true"
        >
          {flowBlocks}
        </div>
      ) : null}
    </div>
  );
}
