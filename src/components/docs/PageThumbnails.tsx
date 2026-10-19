'use client';

import { cn } from '@/lib/utils';
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
  className,
}: {
  /** One node per page, already packed and framed by the caller. */
  pages: React.ReactNode[];
  currentPage: number;
  onGoToPage: (index: number) => void;
  /**
   * Overrides the height cap, for a caller whose own box already bounds the
   * rail.
   *
   * The default cap is measured against `--doc-scroll-height`, which only the
   * print route publishes (`PrintPages`). The editor preview has no such
   * variable and no window-height scroll box — the rail sits in a flex row
   * inside the inset card — so it passes `max-h-full` and bounds the wrapper
   * instead. Falling back to `100svh` there would size the rail taller than the
   * row holding it, which is the same overflow the print route hit and fixed.
   */
  className?: string;
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

        **The bound is the box that scrolls, not the viewport.** It was
        `100svh-5rem`, and inside the app that is simply the wrong ruler: the
        rail sits in `#main-content` within the inset card, which is shorter
        than the window by the header band and the card's own margins. So the
        cap came out *taller than the container*, the rail overflowed the inset
        rather than scrolling inside itself, and its last thumbnails could not
        be reached at all. `--doc-scroll-height` is that box measured (see
        `PrintToolbar`), less whatever the locked band holds above it; the
        `100svh` fallback is the standalone print route, where the window really
        is the scroll box.
      */
      /*
        No vertical padding, and that is an alignment fix rather than a
        tightening. It was `py-2`, which started the first thumbnail 8px below
        the first full-size page beside it: the rail and the page column both
        begin at the same y, so any padding here is a step the column does not
        take, and the two tops read as misaligned by exactly that much.

        Measured, not reasoned about — `e2e/page-rail.spec.ts` pins the two
        tops together now, and it was confirmed to go red with the padding back
        in. The gap the padding was buying is `pb-2` alone, at the foot, where
        there is no page edge to line up against.
      */
      className={cn(
        'scrollbar-none flex max-h-[calc(var(--doc-scroll-height,100svh)-var(--doc-locked-band,5rem))] shrink-0 flex-col items-center gap-3 overflow-y-auto overscroll-contain pb-2',
        className,
      )}
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
            className="group/thumb flex cursor-pointer flex-col items-center gap-1 rounded-md focus-ring"
          >
            <span
              className={[
                'block overflow-hidden rounded-sm border bg-white transition-colors',
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
              {/*
                `text-left` and `font-normal` are not decoration, and this is
                the same bug `SheetThumbnail` fixed on the ⌘D cards — caught
                there, then written again here because the rail was built
                afterwards and the frame had nothing saying it could not
                inherit.

                A sheet never sets `text-align` on its own root, so it takes
                the caller's. The caller here is a `<button>`, which the UA
                stylesheet centres, so every heading, table cell, address line
                and footer on every thumbnail rendered centred while the page
                it stood for was left-aligned. The rail was not a small copy of
                the document, it was a different document.

                The frame states the page's own typography so no caller can
                lend it theirs. Measured, not assumed: `e2e/page-rail.spec.ts`
                compares the computed `text-align` of the thumbnail's page
                frame against the real page's, which reads `center` against
                `start` with this removed.
              */}
              <span
                aria-hidden
                className="pointer-events-none block origin-top-left text-left font-normal select-none"
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
                'text-caption tabular-nums transition-colors',
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
