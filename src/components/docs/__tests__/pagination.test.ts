import { packBlocks } from '../pagination';

const b = (
  height: number,
  extra: { own?: boolean; dark?: boolean; keepNext?: boolean } = {},
) => ({ height, ...extra });

/** A sub-point: sits in one of the page's columns rather than across it. */
const col = (height: number) => ({ height, column: true });

/** Each page's bands, as their columns — the shape the renderer draws. */
const bands = (pages: { bands: { columns: number[][] }[] }[]) =>
  pages.map((page) => page.bands.map((band) => band.columns));

describe('packBlocks', () => {
  it('packs blocks until the next one would overflow', () => {
    const pages = packBlocks([b(400), b(400), b(400)], 1000);
    expect(pages.map((p) => p.blocks)).toEqual([[0, 1], [2]]);
  });

  it('fills a page exactly without spilling', () => {
    const pages = packBlocks([b(500), b(500), b(1)], 1000);
    expect(pages.map((p) => p.blocks)).toEqual([[0, 1], [2]]);
  });

  it('always returns a page, even with nothing to pack', () => {
    expect(packBlocks([], 1000)).toEqual([
      { bands: [], blocks: [], dark: false, overflows: false, full: false },
    ]);
  });

  /**
   * The reason this is a pure function. Heights come from the DOM measured with
   * their margins; getting this wrong is how the foot of a page gets clipped.
   */
  it('respects the height it is given, margins included', () => {
    // Three 300px blocks each carrying a 24px margin — 972px, one page.
    expect(packBlocks([b(324), b(324), b(324)], 1000).map((p) => p.blocks)).toEqual([
      [0, 1, 2],
    ]);
    // The same blocks measured without their margins would have fitted a
    // fourth; with them, it goes over.
    expect(packBlocks([b(324), b(324), b(324), b(324)], 1000).map((p) => p.blocks)).toEqual([
      [0, 1, 2],
      [3],
    ]);
  });

  describe('a block that wants a page to itself', () => {
    it('takes one, and nothing follows it there', () => {
      const pages = packBlocks([b(100), b(100, { own: true }), b(100)], 1000);
      expect(pages.map((p) => p.blocks)).toEqual([[0], [1], [2]]);
    });

    it('opens the document without leaving a blank page before it', () => {
      const pages = packBlocks([b(100, { own: true }), b(100)], 1000);
      expect(pages.map((p) => p.blocks)).toEqual([[0], [1]]);
    });

    it('carries its dark page with it', () => {
      const pages = packBlocks([b(100, { own: true, dark: true }), b(100)], 1000);
      expect(pages.map((p) => p.dark)).toEqual([true, false]);
    });
  });

  describe('a block taller than the page', () => {
    it('gets a page of its own', () => {
      const pages = packBlocks([b(100), b(2000), b(100)], 1000);
      expect(pages.map((p) => p.blocks)).toEqual([[0], [1], [2]]);
    });

    /** It spills visibly rather than being silently cut. */
    it('is marked as overflowing so the page does not clip it', () => {
      const pages = packBlocks([b(2000)], 1000);
      expect(pages[0].overflows).toBe(true);
    });

    it('does not mark a page that merely holds one short block', () => {
      const pages = packBlocks([b(100)], 1000);
      expect(pages[0].overflows).toBe(false);
    });
  });

  /**
   * The contract sets a section's heading across the page and its points in two
   * columns beneath it. So a page is a stack of bands: full-width blocks, and
   * runs of points flowing newspaper-style — the whole left column, then the
   * right, which is the only order that can be paginated.
   */
  describe('two columns to a page', () => {
    it('fills the left column before starting the right', () => {
      const pages = packBlocks([col(600), col(600), col(600)], 1000, 2);
      expect(pages).toHaveLength(2);
      expect(bands(pages)).toEqual([
        [[[0], [1]]],
        // A run that ends is evened out; with one block left there is nothing
        // to even, so the second column stays empty.
        [[[2], []]],
      ]);
    });

    it('reads a page in column order', () => {
      const pages = packBlocks([col(400), col(400), col(400), col(400)], 1000, 2);
      expect(pages).toHaveLength(1);
      expect(bands(pages)).toEqual([
        [
          [
            [0, 1],
            [2, 3],
          ],
        ],
      ]);
      expect(pages[0].blocks).toEqual([0, 1, 2, 3]);
    });

    it('closes the page once both columns are full', () => {
      const pages = packBlocks(
        [col(600), col(600), col(600), col(600), col(100)],
        1000,
        2,
      );
      expect(bands(pages)).toEqual([[[[0], [1]]], [[[2], [3, 4]]]]);
    });

    /** A heading, a table, a list: they head or hold the whole measure. */
    it('sets a block that is not a point across the page', () => {
      const pages = packBlocks([b(100), col(200), col(200)], 1000, 2);
      expect(pages).toHaveLength(1);
      expect(pages[0].bands[0]).toEqual({ columns: [[0]], full: true });
      expect(pages[0].bands[1]).toEqual({ columns: [[1], [2]], full: false });
    });

    /**
     * A heading alone at the foot of a page is a promise the page does not
     * keep. It travels with what follows it instead.
     */
    it('will not strand a heading at the foot of a page', () => {
      const pages = packBlocks(
        [col(800), b(100, { keepNext: true }), col(200)],
        1000,
        2,
      );
      expect(bands(pages)).toEqual([
        [[[0], []]],
        [[[1]], [[2], []]],
      ]);
    });

    /**
     * The band a section ends in is evened out, so a full left column never
     * sits beside a stub — but never past what the page has left.
     */
    it('evens the last band of a run without overfilling it', () => {
      expect(bands(packBlocks([col(100), col(100), col(100)], 1000, 2))).toEqual([
        [
          [
            [0, 1],
            [2],
          ],
        ],
      ]);
      // Evening these into one column would need 1200px of a 1000px page.
      expect(bands(packBlocks([col(600), col(600), col(100)], 1000, 2))).toEqual([
        [
          [
            [0],
            [1, 2],
          ],
        ],
      ]);
    });

    /** A cover or a signature block needs the whole page, not half of it. */
    it('gives an own block the whole page and abandons the half-filled one', () => {
      const pages = packBlocks([col(100), b(100, { own: true }), col(100)], 1000, 2);
      expect(bands(pages)).toEqual([[[[0], []]], [[[1]]], [[[2], []]]]);
    });
  });

  /**
   * The Service Quotation is dark on every page, not just a cover — added for
   * it. Default `false` leaves every other document type (which paints normal
   * flowing pages white via `own`/`dark` only) unchanged.
   */
  describe('forceDark', () => {
    it('defaults to false — every existing document type is unaffected', () => {
      const pages = packBlocks([b(400), b(400)], 1000);
      expect(pages.every((p) => p.dark === false)).toBe(true);
    });

    it('paints every flowing page dark when set', () => {
      const pages = packBlocks([b(600), b(600), b(600)], 1000, 1, true);
      expect(pages).toHaveLength(3);
      expect(pages.every((p) => p.dark === true)).toBe(true);
    });

    it('paints the sole page of an empty document dark too', () => {
      expect(packBlocks([], 1000, 1, true)).toEqual([
        { bands: [], blocks: [], dark: true, overflows: false, full: false },
      ]);
    });

    it('does not override an own block’s own dark flag', () => {
      // An own block that is explicitly light should stay light even inside a
      // forced-dark document — `own`/`dark` is a stronger, per-block signal.
      const pages = packBlocks([b(100, { own: true, dark: false })], 1000, 1, true);
      expect(pages[0].dark).toBe(false);
    });
  });
});
