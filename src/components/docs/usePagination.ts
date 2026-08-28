'use client';

import {
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { packBlocks, type MeasuredBlock, type PackedPage } from './pagination';

/**
 * Measuring a flat block list and packing it into A4 pages.
 *
 * Two consumers: `DocumentPreview` (the scrolling on-screen column) and
 * `PrintPages` (the same pages at 100%, one per sheet of paper). They must
 * agree page for page, which is why the measuring lives here rather than in
 * either of them.
 *
 * Phase 1 renders the flow un-paginated into `flowRef` so heights can be read;
 * phase 2 renders the packed pages. `pages` is `null` until measured.
 */

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
export function blocksSignature(blocks: ReactNode[]): string {
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
 * What one block occupies, **including its margins**.
 *
 * `offsetHeight` alone excludes them, and the sheets space their blocks with
 * margins — the contract's sections with `mt-[48px]`, the letters' with `mb`.
 * Five uncounted margins on a page under-count it by hundreds of px, which the
 * page frame then clips: the foot of a page losing a paragraph with nothing
 * said about it. The flow is a flex column, so margins never collapse and each
 * one is exactly the gap it draws.
 *
 * The **last** block's top margin is the one exception: the letters pin their
 * closing block with `mt-auto`, which resolves to the free space left on the
 * page rather than to a gap. Counting it would make that block a page tall.
 */
function occupiedHeight(node: HTMLElement, isLast: boolean): number {
  const style = getComputedStyle(node);
  const px = (value: string) => (Number.isFinite(parseFloat(value)) ? parseFloat(value) : 0);
  return (
    node.offsetHeight + px(style.marginBottom) + (isLast ? 0 : px(style.marginTop))
  );
}

export function usePagination(
  blocks: ReactNode[],
  columnHeight: number,
  columnsPerPage = 1,
  forceDark = false,
) {
  const flowRef = useRef<HTMLDivElement>(null);
  const signature = blocksSignature(blocks);

  // Committed pagination tagged with the signature it was measured against; a
  // mismatch means content changed since measuring, so we re-render phase 1.
  const [computed, setComputed] = useState<{ signature: string; pages: PackedPage[] } | null>(
    null,
  );
  const pages = computed && computed.signature === signature ? computed.pages : null;

  // Measure the un-paginated flow and pack blocks into pages. Runs inside a
  // ResizeObserver callback so it also re-fires if the flow settles late.
  useLayoutEffect(() => {
    const container = flowRef.current;
    if (!container || pages !== null) return;

    const measure = () => {
      const nodes = Array.from(container.children) as HTMLElement[];
      // No real measurements (jsdom / pre-layout) → stay un-paginated.
      if (nodes.every((n) => n.offsetHeight === 0)) return;

      const measured: MeasuredBlock[] = nodes.map((node, i) => ({
        height: occupiedHeight(node, i === nodes.length - 1),
        own: node.dataset.page === 'own',
        dark: node.dataset.pageFrame === 'dark',
        column: node.dataset.span === 'column',
        keepNext: node.dataset.keepNext !== undefined,
      }));

      setComputed({
        signature,
        pages: packBlocks(measured, columnHeight, columnsPerPage, forceDark),
      });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [pages, signature, columnHeight, columnsPerPage, forceDark]);

  return { flowRef, pages };
}
