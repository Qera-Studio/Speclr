'use client';

import { Children, isValidElement, type ReactNode } from 'react';
import { usePagination } from './usePagination';
import type { PageChrome } from './DocumentPreview';
import PageColumns from './PageColumns';
import { SHEET_HEIGHT } from './sheets/frame';

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
}) {
  const blocks = Children.toArray(children).filter(isValidElement);
  const { flowRef, pages } = usePagination(
    blocks,
    SHEET_HEIGHT - pagePaddingY - chromeHeight,
    columns,
  );

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
        } min-h-[1123px] bg-white text-black`}
      >
        {blocks}
      </div>
    );
  }

  return (
    <>
      {pages.map((page, i) => (
        <div
          key={i}
          className={[
            frame,
            'h-[1123px]',
            page.overflows ? 'overflow-visible' : 'overflow-hidden',
            page.dark ? (darkPageClassName ?? 'bg-black text-white') : 'bg-white text-black',
          ].join(' ')}
        >
          {pageHeader?.(i, page.dark)}
          <PageColumns
            page={page}
            blocks={blocks}
            columnWidth={columns > 1 ? columnWidth : undefined}
            columnGap={columnGap}
          />
          {pageFooter?.(i, page.dark)}
        </div>
      ))}
    </>
  );
}
