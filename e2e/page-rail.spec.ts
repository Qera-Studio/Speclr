import { expect, test } from '@playwright/test';
import { pagesOf, settled, SHEET_HEIGHT, SHEET_WIDTH } from './paper';

/**
 * The print view's page rail: every page down the left, click to jump.
 *
 * Entirely geometry, which is why it is here and not in Jest. jsdom gives every
 * box a height of zero, so it can say the thumbnails are in the DOM and nothing
 * more — not that they are the size they should be, not that the rail scrolls
 * on its own rather than growing the page, and not that clicking one moves the
 * document. Each of those is the kind of thing that looks right in a snapshot
 * and is wrong on screen.
 *
 * The quotation fixture is the subject because it is the longest fixed-page
 * document in the app: four pages plain, seven crowded.
 */

/** As `SheetThumbnail` and `PageThumbnails`: 794px of paper at ~140px. */
const SCALE = 0.176;

const rail = (page: import('@playwright/test').Page) =>
  page.locator('[data-slot="page-thumbnails"]');

test.describe('the page rail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/quotation');
    await settled(page);
  });

  /**
   * One thumbnail per page, and the count is taken from the document rather
   * than written down: a rail that shows four pages of a seven-page document is
   * the failure this exists to catch.
   */
  test('shows one thumbnail per page, at the ⌘D card size', async ({ page }) => {
    const pageCount = await pagesOf(page).count();
    expect(pageCount).toBeGreaterThan(1);

    const thumbs = rail(page).getByRole('button');
    await expect(thumbs).toHaveCount(pageCount);

    // The size the user asked for: the same box the ⌘D dialog draws.
    const box = await thumbs.first().locator('span').first().boundingBox();
    expect(box?.width).toBeCloseTo(SHEET_WIDTH * SCALE, 0);
    expect(box?.height).toBeCloseTo(SHEET_HEIGHT * SCALE, 0);
  });

  /**
   * The whole point of the control. Clicking page 3's thumbnail has to bring
   * page 3 to the top of the viewport, which is a scroll — invisible to any
   * renderer that does not lay out.
   */
  test('scrolls the document to the page that was clicked', async ({ page }) => {
    const before = await page.evaluate(() => window.scrollY);
    await rail(page).getByRole('button', { name: 'Page 3' }).click();

    /*
      Poll the thing being asserted, not a proxy for it. The scroll is smooth,
      so it is still in flight for several frames after the click; an earlier
      version of this waited for `scrollY` to merely *start* moving and then
      measured, which reported the page still 2380px down and read as a broken
      control rather than as a test measuring too early.
    */
    await expect
      .poll(async () => {
        const box = await pagesOf(page).nth(2).boundingBox();
        return Math.abs(box?.y ?? Infinity);
      })
      .toBeLessThan(80);

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  });

  /**
   * Asked for explicitly: the rail scrolls inside itself when the document is
   * longer than the viewport, and it shows no scrollbar doing it.
   *
   * The height assertion is the load-bearing half. Without its own bounded box
   * the rail simply grows, the page gets taller than the document, and the
   * "scroll" is the window's.
   */
  test('scrolls within itself, with no visible bar', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await settled(page);

    const metrics = await rail(page).evaluate((el) => ({
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
      viewport: window.innerHeight,
      /*
        The computed property, not a measured gutter.

        A gutter assertion was tried first and was worthless: headless Chromium
        draws overlay scrollbars, which take no layout width whether or not the
        bar is hidden, so it passed just as happily with `scrollbar-none`
        removed. This reads the rule itself, which is the only thing that
        distinguishes the two states on this platform.
      */
      scrollbarWidth: getComputedStyle(el).scrollbarWidth,
    }));

    expect(metrics.clientHeight).toBeLessThanOrEqual(metrics.viewport);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(metrics.scrollbarWidth).toBe('none');
  });

  /** Chrome, so it must not reach the paper. */
  test('does not print', async ({ page }) => {
    await expect(rail(page)).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(rail(page)).toBeHidden();
  });
});
