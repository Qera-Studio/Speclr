'use client';

import { SHEET_HEIGHT, SHEET_WIDTH } from './sheets/frame';

/**
 * The page rail: every page of the document down the left, click to jump.
 *
 * Each thumbnail is the **real packed page**, scaled as one box — the same
 * argument `SheetThumbnail` makes for the ⌘D cards, one step further along. A
 * picture would need generating and would go stale; re-rendering the sheet from
 * `doc` would show page one and only page one, because nothing but the packer
 * knows where the breaks fall. So the caller hands over the pages it has
 * already measured and packed, and a thumbnail cannot disagree with the page it
 * stands for, because it *is* that page.
 *
 * `SCALE` matches `SheetThumbnail`'s, so a page reads at the same size here as
 * it does in the ⌘D dialog. One number, two rails, no drift.
 *
 * The rail scrolls on its own when the document is longer than the viewport,
 * with the bar hidden: it sits against the document rather than in a panel, and
 * a scrollbar down the middle of the screen would draw a column edge where
 * there is deliberately no container.
 */

/** As `SheetThumbnail`: 794px of paper at ~140px. Keep the two equal. */
const SCALE = 0.176;

export default function PageThumbnails({
  pages,
  currentPage,
  onGoToPage,
}: {
  /** One node per page, already packed and framed by the caller. */
  pages: React.ReactNode[];
  currentPage: number;
  onGoToPage: (index: number) => void;
}) {
  // One page is not a table of contents. Same rule as the pager, which hides
  // itself rather than printing "Page 1 / 1" with both arrows greyed out.
  if (pages.length <= 1) return null;

  return (
    <nav
      aria-label="Pages"
      data-print-hidden
      data-slot="page-thumbnails"
      /*
        No background and no border: the rail is a column of pages against the
        preview's own ground, not a panel holding them.

        `scrollbar-none` is the asked-for behaviour and it is safe here because
        the rail is not the only way to reach a page — the pager on the header
        row moves between them, and the preview itself scrolls. A scroll
        container whose only affordance was a hidden bar would be a trap.
      */
      /*
        The height cap is on the scrolling box itself, not on a wrapper: a
        `max-h` one element out leaves this one free to grow to the height of a
        seven-page document, and then the "scroll" is the window's and the rail
        runs off the bottom of the screen. Measured, not assumed — see
        `e2e/page-rail.spec.ts`, which failed on exactly that.

        `100svh` minus the header band and the page's own padding.
      */
      className="scrollbar-none flex max-h-[calc(100svh-5rem)] shrink-0 flex-col items-center gap-3 overflow-y-auto overscroll-contain py-2"
    >
      {pages.map((page, i) => {
        const current = i === currentPage;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onGoToPage(i)}
            aria-label={`Page ${i + 1}`}
            aria-current={current ? 'page' : undefined}
            className="group/thumb flex cursor-pointer flex-col items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={[
                'block overflow-hidden rounded-[2px] border bg-white transition-colors',
                current ? 'border-primary ring-1 ring-primary' : 'border-border',
              ].join(' ')}
              style={{ width: SHEET_WIDTH * SCALE, height: SHEET_HEIGHT * SCALE }}
            >
              {/*
                The page at full size, scaled down as one box. `aria-hidden` and
                inert: the accessible name is on the button, and a screen reader
                offered the full text of every page twice over would be read the
                document once for the rail and once for the document.
              */}
              <span
                aria-hidden
                className="pointer-events-none block origin-top-left select-none"
                style={{
                  width: SHEET_WIDTH,
                  height: SHEET_HEIGHT,
                  transform: `scale(${SCALE})`,
                }}
              >
                {page}
              </span>
            </span>
            <span
              className={[
                'text-[10px] tabular-nums transition-colors',
                current ? 'text-foreground' : 'text-muted-foreground',
              ].join(' ')}
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
