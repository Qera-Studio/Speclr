import { needsControls, pageRuns, SIMPLE_MAX, WINDOW } from '../pageGroups';

/**
 * Which numbers a pager draws, and in how many runs.
 *
 * Every hard case in this control is arithmetic rather than markup, which is
 * why it is a pure function with its own suite: what happens when the window
 * reaches page 1, whether an anchor is drawn twice, and where the run boundary
 * falls are all questions a DOM test would have to answer by measuring boxes.
 */

/** Runs as the reader sees them: one-based, so a failure reads like the UI. */
const shown = (page: number, count: number) =>
  pageRuns(page, count).map((run) => run.map((p) => p + 1));

describe('a short list', () => {
  it('draws nothing at all for a single page', () => {
    expect(pageRuns(0, 1)).toEqual([]);
    expect(pageRuns(0, 0)).toEqual([]);
  });

  it('draws one run, with no gap, up to the threshold', () => {
    expect(shown(0, 2)).toEqual([[1, 2]]);
    expect(shown(2, 4)).toEqual([[1, 2, 3, 4]]);
    expect(shown(5, SIMPLE_MAX)).toEqual([[1, 2, 3, 4, 5, 6]]);
  });

  /**
   * Six is the threshold because six is exactly what the windowed form shows.
   * One page past it is the first list with something to elide.
   */
  it('splits as soon as there is something to leave out', () => {
    expect(shown(0, SIMPLE_MAX + 1)).toEqual([[1, 2, 3, 4], [7]]);
  });
});

describe('the sliding window', () => {
  /** The shape from the brief: an anchor, a window of four, an anchor. */
  it('anchors both ends around a window of four', () => {
    expect(shown(9, 23)).toEqual([[1], [9, 10, 11, 12], [23]]);
  });

  it('keeps the window four wide wherever it sits', () => {
    for (const page of [8, 12, 16]) {
      const runs = pageRuns(page, 40);
      expect(runs[1]).toHaveLength(WINDOW);
    }
  });

  /**
   * The window is a batch, not a rolling centre: stepping forward off the last
   * slot starts the next four rather than sliding one along. Within a batch the
   * arrow moves the pill; at the edge it turns the page of numbers.
   */
  it('turns a whole batch rather than sliding one at a time', () => {
    // Pages 9 to 12 (one-based) all show the same window.
    for (const page of [8, 9, 10, 11]) {
      expect(shown(page, 40)[1]).toEqual([9, 10, 11, 12]);
    }
    // Stepping off the end of it starts the next.
    expect(shown(12, 40)[1]).toEqual([13, 14, 15, 16]);
  });
});

describe('the ends, where the gap would strand a number', () => {
  /**
   * The rule that stops `1 … 1 2 3 4`. When the window reaches the start, the
   * anchor is part of it and the two are one run.
   */
  it('merges the leading anchor into the window', () => {
    expect(shown(0, 23)).toEqual([[1, 2, 3, 4], [23]]);
    expect(shown(2, 23)).toEqual([[1, 2, 3, 4], [23]]);
  });

  it('merges the trailing anchor the same way', () => {
    expect(shown(22, 23)).toEqual([[1], [20, 21, 22, 23]]);
  });

  /** Never a gap between neighbours: a gap claims something is missing. */
  it('draws no gap where the runs would touch', () => {
    const runs = shown(4, 8);
    for (let i = 1; i < runs.length; i++) {
      const previous = runs[i - 1].at(-1)!;
      expect(runs[i][0]).toBeGreaterThan(previous + 1);
    }
  });

  /** No page is ever drawn twice, at any position in any list. */
  it('never repeats a number', () => {
    for (const count of [7, 8, 9, 12, 23, 40]) {
      for (let page = 0; page < count; page++) {
        const flat = pageRuns(page, count).flat();
        expect(new Set(flat).size).toBe(flat.length);
      }
    }
  });

  /** The ends are always reachable in one click, whatever the window shows. */
  it('always offers the first and last page', () => {
    for (const count of [7, 12, 23, 40]) {
      for (let page = 0; page < count; page++) {
        const flat = pageRuns(page, count).flat();
        expect(flat).toContain(0);
        expect(flat).toContain(count - 1);
      }
    }
  });

  /** The current page is always among them, or the pill has nothing to sit on. */
  it('always includes the page being viewed', () => {
    for (const count of [2, 5, 7, 12, 23, 40]) {
      for (let page = 0; page < count; page++) {
        expect(pageRuns(page, count).flat()).toContain(page);
      }
    }
  });

  /** Ascending throughout, with no run out of order against its neighbour. */
  it('runs in order', () => {
    for (const count of [7, 23, 40]) {
      for (let page = 0; page < count; page++) {
        const flat = pageRuns(page, count).flat();
        expect([...flat].sort((a, b) => a - b)).toEqual(flat);
      }
    }
  });

  /**
   * A last batch shorter than the window is pulled back to fill it, so the
   * control does not shrink on the final pages of a long list.
   */
  it('keeps the window full on a list that does not divide evenly', () => {
    // 23 pages: the last batch would be 21-23 alone.
    expect(shown(21, 23)).toEqual([[1], [20, 21, 22, 23]]);
  });
});

describe('needsControls', () => {
  it('offers the arrows and the box only once numbers are being left out', () => {
    expect(needsControls(1)).toBe(false);
    expect(needsControls(SIMPLE_MAX)).toBe(false);
    expect(needsControls(SIMPLE_MAX + 1)).toBe(true);
  });
});
