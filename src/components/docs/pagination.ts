/**
 * Packing measured content blocks into A4 pages.
 *
 * The rule the whole preview rests on: a page breaks only *between* blocks, so
 * a clause heading can never separate from its body. Everything here is pure —
 * it takes heights, not DOM — which is what makes it testable. jsdom reports
 * every height as 0, so this logic could not otherwise be tested at all, and it
 * is the logic that decides whether a paragraph is silently cut in half.
 *
 * Measuring is `usePagination`'s job; this module only decides.
 */

/** One block, as measured. Height *includes* its margins — see `usePagination`. */
export interface MeasuredBlock {
  height: number;
  /**
   * Wants a page to itself: nothing packs before it and nothing after. The
   * contract's cover, its parties page, every Schedule cover and every
   * signature block, which needs the full page width for two parties.
   */
  own?: boolean;
  /** Its page is painted dark (full-bleed black) rather than white. */
  dark?: boolean;
  /**
   * Belongs in a column rather than across the page — a clause's sub-points.
   * Everything else (a heading, a table, a list) takes the full measure.
   * Ignored entirely by a single-column document.
   */
  column?: boolean;
  /**
   * Must not be the last thing on a page. Section headings carry it: the block
   * after this one has to fit below it, or both move on together.
   */
  keepNext?: boolean;
}

/**
 * A horizontal slice of a page.
 *
 * Either one block across the full measure, or a run of sub-points flowing
 * through the page's columns. A section is therefore a full-width band (its
 * heading) followed by a column band (its points) followed by more full-width
 * bands (its tables and lists) — which is how a printed agreement is set.
 */
export interface PackedBand {
  /** One entry per column. A full-width band has one, holding one block. */
  columns: number[][];
  full: boolean;
}

export interface PackedPage {
  bands: PackedBand[];
  /** Every block on the page, in reading order — the bands, flattened. */
  blocks: number[];
  dark: boolean;
  /**
   * The one block on this page is taller than the page. Such a page renders
   * without clipping — content that will not fit must spill visibly rather
   * than vanish, for the same reason an unfilled blank prints as a red chip
   * (see `ContractSheet`).
   */
  overflows: boolean;
  /**
   * An `own` block's page. The renderer cannot work this out from the indices
   * alone, so the packer says it.
   */
  full: boolean;
}

const fullBand = (i: number): PackedBand => ({ columns: [[i]], full: true });

const page = (
  bands: PackedBand[],
  dark: boolean,
  overflows: boolean,
  full = false,
): PackedPage => ({
  bands,
  blocks: bands.flatMap((band) => band.columns.flat()),
  dark,
  overflows,
  full,
});

/**
 * Splits a run of blocks into `columns` columns of roughly equal height, none
 * taller than `room`.
 *
 * Only ever used on the *last* band of a run — the one that ended before it
 * filled the page. A greedy fill would leave a full left column beside a stub;
 * this evens them out.
 *
 * `room` is not a formality. A column stops at the target *or* at the room left,
 * whichever comes first, so a band can never grow past what the greedy fill
 * already proved would fit. With two columns that also bounds the second: a
 * first column that stopped on the target holds at least half the run, so what
 * is left is at most half, and half of something that fitted fits.
 */
function balance(
  run: number[],
  heights: number[],
  columns: number,
  room: number,
): number[][] {
  const total = run.reduce((sum, i) => sum + heights[i], 0);
  const target = total / columns;
  const out: number[][] = [];
  let at = 0;

  for (let c = 0; c < columns; c++) {
    const column: number[] = [];
    let height = 0;
    while (at < run.length) {
      const next = heights[run[at]];
      // A column always takes one block; past that it stops when it is full, or
      // when taking the block would leave it further from its share than
      // stopping would. Comparing the midpoint rather than the height is what
      // splits two points of 50px and 130px one apiece instead of stacking both
      // in the first column. The last column takes whatever is left, so nothing
      // can be dropped by rounding.
      if (column.length > 0) {
        if (height + next > room) break;
        if (c < columns - 1 && height + next / 2 > target) break;
      }
      column.push(run[at]);
      height += next;
      at++;
    }
    out.push(column);
  }
  return out;
}

/**
 * Packs blocks into pages `pageHeight` usable px tall, `columnsPerPage` columns
 * wide.
 *
 * With one column this is a straight fill: blocks in order until the next one
 * would overflow. With two, the page becomes a stack of bands — full-width
 * blocks across the measure, runs of `column` blocks flowing newspaper-style
 * (the whole left column, then the right) between them.
 *
 * Always returns at least one page, so a caller never has to special-case an
 * empty document.
 */
export function packBlocks(
  blocks: MeasuredBlock[],
  pageHeight: number,
  columnsPerPage = 1,
): PackedPage[] {
  const pages: PackedPage[] = [];
  const heights = blocks.map((b) => b.height);

  let bands: PackedBand[] = [];
  /** Height the bands so far have taken off this page. */
  let used = 0;

  const breakPage = () => {
    if (bands.length === 0) return;
    pages.push(page(bands, false, false));
    bands = [];
    used = 0;
  };

  /** A block across the whole measure — a heading, a table, a list. */
  const placeFull = (i: number) => {
    // A heading has to bring the block after it; alone at the foot of a page it
    // is a promise the page does not keep.
    const withNext =
      heights[i] +
      (blocks[i].keepNext && blocks[i + 1] && !blocks[i + 1].own
        ? heights[i + 1]
        : 0);
    if (used > 0 && used + withNext > pageHeight) breakPage();
    bands.push(fullBand(i));
    used += heights[i];
  };

  /**
   * A run of sub-points, filling column by column to the foot of the page and
   * continuing on the next.
   */
  const placeRun = (run: number[]) => {
    let at = 0;
    while (at < run.length) {
      // Nothing worth starting a band with down here — take it to a fresh page
      // rather than dropping one line into the gutter.
      if (used > 0 && used + heights[run[at]] > pageHeight) {
        breakPage();
        continue;
      }

      const room = pageHeight - used;
      const columns: number[][] = [];
      let tallest = 0;

      for (let c = 0; c < columnsPerPage && at < run.length; c++) {
        const column: number[] = [];
        let height = 0;
        // At least one block per column: a block taller than the room left has
        // to go somewhere, and it overflows visibly rather than looping.
        while (
          at < run.length &&
          (column.length === 0 || height + heights[run[at]] <= room)
        ) {
          column.push(run[at]);
          height += heights[run[at]];
          at++;
        }
        columns.push(column);
        tallest = Math.max(tallest, height);
      }

      if (at >= run.length) {
        // The run ended inside this band: even the columns up.
        const evened = balance(columns.flat(), heights, columnsPerPage, room);
        bands.push({ columns: evened, full: false });
        used += Math.max(
          ...evened.map((column) =>
            column.reduce((sum, i) => sum + heights[i], 0),
          ),
        );
      } else {
        bands.push({ columns, full: false });
        used += tallest;
        breakPage();
      }
    }
  };

  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];

    if (block.own) {
      breakPage();
      pages.push(
        page([fullBand(i)], Boolean(block.dark), block.height > pageHeight, true),
      );
      i++;
      continue;
    }

    if (columnsPerPage > 1 && block.column) {
      const run: number[] = [];
      while (i < blocks.length && blocks[i].column && !blocks[i].own) {
        run.push(i);
        i++;
      }
      placeRun(run);
      continue;
    }

    placeFull(i);
    i++;
  }

  breakPage();

  if (pages.length === 0) return [page([], false, false)];

  // A block that fills a page on its own, without having asked for one, is
  // still too tall to clip.
  return pages.map((p) =>
    p.blocks.length === 1 && heights[p.blocks[0]] > pageHeight
      ? { ...p, overflows: true }
      : p,
  );
}
