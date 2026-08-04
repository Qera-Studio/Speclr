'use client';

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';

// A4 at 96dpi.
const SHEET_WIDTH = 794;
const SHEET_HEIGHT = 1123;
// A4 content box height minus the page padding the sheets use (space-8 top +
// bottom ≈ 96px). Blocks are packed until the next one would overflow this.
const PAGE_CONTENT_HEIGHT = SHEET_HEIGHT - 96;
// Vertical gap between stacked pages in the scrolling column.
const PAGE_GAP = 24;

export type DocumentPreviewHandle = {
  /** Scroll the page at `index` (0-based) to the top of the viewport. */
  scrollToPage: (index: number) => void;
};

/**
 * A cheap content fingerprint of the block list, used to decide when to
 * re-measure pagination.
 *
 * It walks a block's `children` for text AND its remaining props. The props
 * matter: a sheet like `<DocumentSheet doc={…} />` has no children at all, it
 * renders everything from `doc`. A children-only fingerprint was therefore
 * constant while the user typed, so the cached pagination — and the stale
 * render with it — was reused and the preview never updated.
 *
 * Props are reduced to a length, not deep-compared, keeping this cheap. Any
 * edit that could change the layout also changes some prop's serialized size.
 */
function blocksSignature(blocks: ReactNode[]): string {
  const textLength = (node: ReactNode): number => {
    if (node === null || node === undefined || typeof node === 'boolean') return 0;
    if (typeof node === 'string' || typeof node === 'number') return String(node).length;
    if (Array.isArray(node)) return node.reduce((sum: number, n) => sum + textLength(n), 0);
    if (isValidElement(node)) {
      const { children, ...rest } = node.props as { children?: ReactNode };
      return textLength(children) + dataLength(rest);
    }
    return 0;
  };

  /** Serialized size of a block's data props, ignoring functions. */
  const dataLength = (props: object): number => {
    try {
      return (
        JSON.stringify(props, (_key, value) =>
          typeof value === 'function' ? undefined : value,
        )?.length ?? 0
      );
    } catch {
      // Circular or non-serializable props. Return 0 rather than a sentinel:
      // such a block contributes nothing to the fingerprint, so it relies on
      // its siblings to trigger a re-measure. No sheet has such props today.
      return 0;
    }
  };

  return `${blocks.length}:${blocks.map(textLength).join(',')}`;
}

/**
 * Block-aware A4 pagination rendered as a continuously scrolling page column —
 * the single preview engine for every document type (invoice, receipt,
 * contract, letter, stipend).
 *
 * Children are treated as atomic content blocks; each is measured and packed
 * into fixed A4 pages, breaking only *between* blocks — a clause heading can
 * never separate from its body. A block taller than one page (rare) gets its
 * own page and is allowed to overflow rather than being sliced — deterministic
 * and never mangled. Sheets that render as a single element (invoice, receipt)
 * simply pack as one block into one page.
 *
 * All pages are stacked and scroll vertically like a PDF viewer. Zoom and the
 * current page are *controlled* by the parent (the workspace bar owns those
 * controls); this component reports the measured page count back up and tracks
 * which page is in view while the user scrolls.
 *
 * When `coverFirst` is set, block 0 (the cover) is its own dedicated full-bleed
 * first page (no default padding/background) with `firstPageClassName` applied —
 * e.g. the black contract / offer-letter cover.
 *
 * The sheet itself owns its A4 sizing; this component never changes it, so the
 * print route can keep rendering the same sheet unscaled.
 */
export default function DocumentPreview({
  children,
  firstPageClassName,
  coverFirst = false,
  selfPaddedSheet = false,
  onPageCountChange,
  onCurrentPageChange,
  ref,
}: {
  children: ReactNode;
  firstPageClassName?: string;
  coverFirst?: boolean;
  /**
   * Set when `children` is a single self-contained sheet that already paints
   * the full 794×1123 page including its own margins (invoice, receipt,
   * letter, stipend). The page frame then adds no padding of its own.
   * Leave false for bare content blocks (the contract), which rely on the
   * frame for their A4 margins.
   */
  selfPaddedSheet?: boolean;
  onPageCountChange?: (count: number) => void;
  onCurrentPageChange?: (index: number) => void;
  ref?: Ref<DocumentPreviewHandle>;
}) {
  const blocks = Children.toArray(children).filter(isValidElement);
  const coverBlock = coverFirst ? blocks[0] : null;
  const flowBlocks = coverFirst ? blocks.slice(1) : blocks;

  const flowRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const signature = blocksSignature(flowBlocks);

  // Committed pagination tagged with the signature it was measured against; a
  // mismatch means content changed since measuring, so we re-render phase 1.
  const [computed, setComputed] = useState<{ signature: string; pages: number[][] } | null>(null);
  const flowPages = computed && computed.signature === signature ? computed.pages : null;

  const [scale, setScale] = useState(0.5);

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

  const pageFrame =
    'w-[794px] h-[1123px] box-border overflow-hidden shadow-[0_8px_32px_rgba(20,42,87,0.32),0_4px_8px_rgba(20,42,87,0.16)]';
  // Bare content blocks (the contract's clause list) need the page's own A4
  // margins. A self-contained sheet already paints its full 794px artwork
  // including its margins, so adding padding here would shrink it inside the
  // frame and clip its right edge.
  const flowFrame = selfPaddedSheet
    ? `${pageFrame} bg-white text-black`
    : `${pageFrame} py-[64px] px-[48px] bg-white text-black`;

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
                firstPageClassName ? `paginatorPage ${pageFrame} ${firstPageClassName}` : `paginatorPage ${pageFrame}`
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
              className={`paginatorPage w-[794px] ${
                selfPaddedSheet ? '' : 'py-[64px] px-[48px]'
              } box-border bg-white text-black h-auto min-h-[1123px] shadow-[0_8px_32px_rgba(20,42,87,0.32),0_4px_8px_rgba(20,42,87,0.16)]`}
            >
              {flowBlocks}
            </div>
          ) : (
            flowPages.map((blockIndices, i) => (
              <div key={i} ref={capturePage(coverCount + i)} className={`paginatorPage ${flowFrame}`}>
                {blockIndices.map((blockIndex) => flowBlocks[blockIndex])}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
