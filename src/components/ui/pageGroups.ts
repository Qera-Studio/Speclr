/**
 * Which page numbers a pager shows, and how they are grouped.
 *
 * The pager reads as a tab group: a trough with the current page raised on it.
 * That shape only works while the numbers are a short run, so past six pages it
 * becomes three runs — the first page, a sliding window of four, and the last
 * page — separated by a gap, with the background of each doing the grouping
 * that the gap alone could not.
 *
 * **Pure, and separate from the markup, because every hard case is here.** What
 * happens when the window reaches the first page, what the arrows do at a
 * window's edge, when the whole thing collapses to a plain run: none of that is
 * a rendering question, and testing it through a DOM would mean asserting on
 * boxes to find out whether the arithmetic is right.
 */

/**
 * Pages in the sliding middle run.
 *
 * **The window serves neighbours, not distance, and that is what sizes it.** A
 * sliding window covers a rounding error of a long list however wide it is: on
 * 23 pages, four slots put the page you want on screen 24% of the time and one
 * slot 13%, which are both useless. Distant pages are the go-to box's job, in
 * one interaction whatever this number is.
 *
 * What the width actually decides is how often your *immediate* neighbours are
 * already there, which is the motion people make when reading through a list:
 * next, next, back one. Of the pages within two of where you are, on a list of
 * any length:
 *
 * | W=1 | W=2 | **W=4** | W=6 |
 * |-----|-----|---------|-----|
 * |  1% | 26% | **63%** | 76% |
 *
 * At one slot the numbers stop being a control and become a readout of where
 * you are, which is the `Page 3 / 9` label this component replaced. Six buys 13
 * points for two more slots (9 wide to 11), and on a 23-page list it is the
 * whole list minus the anchors, at which point the window is not a window.
 *
 * Four is also the largest width that still elides something at `SIMPLE_MAX`:
 * at six, a seven-page list would draw every page, so the simple and windowed
 * forms would be the same shape and the threshold would mean nothing.
 */
export const WINDOW = 4;

/**
 * At or below this, every page is shown in one run with no arrows and no box.
 *
 * Six is not arbitrary: it is exactly what the windowed form displays (one
 * anchor + four + one anchor), so below it there is nothing to elide and the
 * extra machinery would be answering a question nobody asked.
 */
export const SIMPLE_MAX = 6;

/**
 * One run of consecutive pages, drawn as a single trough.
 *
 * Runs are what the reader sees as a group. Two runs separated by a gap say
 * "there are pages between these"; that is the whole job, and it is why a run
 * is a list of numbers rather than a marker like an ellipsis.
 */
export type PageRun = number[];

/**
 * The runs to draw, for a zero-based current page.
 *
 * Returns one run below the threshold, and otherwise up to three. **Runs that
 * touch or overlap are merged**, which is what stops page 1 appearing twice
 * when the window reaches the start, and stops a gap being drawn between
 * neighbours. That merge is the reason the shape is computed rather than
 * assembled from three fixed slots: near either end the answer genuinely is two
 * runs, and pretending otherwise would print `1 … 1 2 3 4` or leave a gap with
 * nothing behind it.
 */
export function pageRuns(page: number, pageCount: number): PageRun[] {
  if (pageCount <= 1) return [];
  if (pageCount <= SIMPLE_MAX) {
    return [Array.from({ length: pageCount }, (_, i) => i)];
  }

  const last = pageCount - 1;

  /*
    The window is a *batch*, not a rolling centre. Page 10 in a batch of
    7-8-9-10 is the last slot, and stepping forward from it starts the next
    batch at 11 rather than sliding one along to 8-9-10-11. That is what makes
    the arrow predictable: within a batch it moves the pill, and at the edge it
    turns the page of numbers.
  */
  const batch = Math.floor(page / WINDOW);
  let start = batch * WINDOW;
  let end = Math.min(start + WINDOW - 1, last);

  // A final batch shorter than the window is pulled back to fill it, so the
  // control never shrinks on the last page of a long list.
  if (end - start + 1 < WINDOW) start = Math.max(0, end - WINDOW + 1);

  const runs: PageRun[] = [];
  const range = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  // The leading anchor, merged into the window when they touch or overlap.
  if (start <= 1) {
    runs.push(range(0, end));
  } else {
    runs.push([0]);
    runs.push(range(start, end));
  }

  // The trailing anchor, same rule from the other side. `at(-1)` rather than a
  // second variable: the leading branch may have produced one run or two.
  const tail = runs.at(-1)!;
  if (end >= last - 1) {
    const from = tail[0];
    runs[runs.length - 1] = range(from, last);
  } else {
    runs.push([last]);
  }

  return runs;
}

/**
 * Whether the arrows and the go-to box are worth showing.
 *
 * They are the tools for a list too long to click through, so they appear
 * exactly when the numbers stop being the whole list.
 */
export function needsControls(pageCount: number): boolean {
  return pageCount > SIMPLE_MAX;
}
