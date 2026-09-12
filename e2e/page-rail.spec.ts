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

    const metrics = await rail(page).evaluate((el) => {
      /*
        The box that actually scrolls, not the window.

        This is the half the first version of this test got wrong. It asserted
        the rail against `window.innerHeight`, and on this route the two are the
        same thing — so it stayed green while the rail was, inside the app,
        sized *taller than the container holding it*: `#main-content` in the
        inset card is shorter than the window by the header band and the card's
        margins, and a rail capped at `100svh` overflowed it rather than
        scrolling, putting its last thumbnails out of reach. Finding the
        scroller by walking up is what makes the assertion mean the same thing
        on both routes.
      */
      let box: HTMLElement | null = el.parentElement;
      while (box) {
        if (/auto|scroll/.test(getComputedStyle(box).overflowY)) break;
        box = box.parentElement;
      }

      return {
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        /** The scroll box's height, or the window's where nothing else scrolls. */
        available: box ? box.clientHeight : window.innerHeight,
        /*
          The computed property, not a measured gutter.

          A gutter assertion was tried first and was worthless: headless Chromium
          draws overlay scrollbars, which take no layout width whether or not the
          bar is hidden, so it passed just as happily with `scrollbar-none`
          removed. This reads the rule itself, which is the only thing that
          distinguishes the two states on this platform.
        */
        scrollbarWidth: getComputedStyle(el).scrollbarWidth,
      };
    });

    expect(metrics.clientHeight).toBeLessThanOrEqual(metrics.available);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(metrics.scrollbarWidth).toBe('none');
  });

  /**
   * A thumbnail is the page it stands for, laid out the same way.
   *
   * This bug shipped twice. `SheetThumbnail` hit it first on the ⌘D cards and
   * fixed it with `text-left`; the rail was written afterwards, its frame said
   * nothing about its own typography, and it inherited from the `<button>`
   * wrapping it — which the UA stylesheet centres. So every heading, table
   * cell, address line and page number in the rail rendered centred while the
   * page beside it was left-aligned, and the rail advertised a document the
   * app does not produce.
   *
   * The assertion compares the two *computed* values rather than pinning one:
   * a thumbnail is only correct relative to its page, and hard-coding "left"
   * here would pass the day the sheets change their mind. `left` and `start`
   * are the same used value in an LTR document, which is why it is normalised
   * rather than compared raw.
   *
   * Confirmed to go red before it was trusted: with `text-left` removed the
   * thumbnail reads `center` against the page's `start`.
   */
  test('lays a thumbnail out the way the page it stands for is laid out', async ({
    page,
  }) => {
    const alignOf = async (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => {
          const value = getComputedStyle(el).textAlign;
          return value === 'start' ? 'left' : value;
        });

    const thumbnailFrame = '[data-slot="page-thumbnails"] button > span > span > div';

    expect(await alignOf(thumbnailFrame)).toBe(await alignOf('.doc-print-column > div'));
  });

  /**
   * The rail's first thumbnail and the document's first page start on the same
   * line, docked and scrolled.
   *
   * Both halves were wrong and by different amounts, which is why both are
   * asserted. At rest the rail carried `py-2`, so the first thumbnail began 8px
   * below the first page: the two columns share a top edge, so any padding on
   * one is a step the other does not take. Scrolled, the rail sticks, and it
   * stuck at `top-2` while the page column has no offset at all, so the gap the
   * padding opened came back a second way the moment anything moved.
   *
   * Measured against the *thumbnail box* rather than the rail, because the rail
   * is the box the padding was inside: asserting its own edge would have passed
   * with the bug present.
   */
  test('starts its first thumbnail level with the first page', async ({
    page,
  }) => {
    const topOf = async (selector: string) =>
      (await page.locator(selector).first().boundingBox())!.y;

    const thumb = '[data-slot="page-thumbnails"] button > span';

    expect(
      Math.abs((await topOf(thumb)) - (await topOf('.doc-print-column > div'))),
    ).toBeLessThanOrEqual(0.5);

    // And scrolled, where the sticky offset is what decides. The rail pins to
    // the viewport's own top, so its first thumbnail does too.
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(async () => Math.round(await topOf(thumb))).toBe(0);
  });

  /**
   * Clicking an arrow moves the counter once, and does not bounce off the page
   * it came from on the way.
   *
   * The bug was visible and is invisible to any assertion that reads the label
   * after the scroll has landed: clicking Next read **1 → 2 → 1 → 2**. The click
   * sets the page immediately, the smooth scroll takes a few hundred
   * milliseconds, and the `IntersectionObserver` fires throughout it reporting
   * whichever page covers most of the viewport — which for most of that trip is
   * still the one being left.
   *
   * So the label is sampled every frame *during* the transit and the whole
   * sequence is asserted, not its endpoint. Confirmed to go red before it was
   * trusted: with the observer ungated it records the four-step bounce above.
   */
  test('moves the pager one step per click, without bouncing back', async ({
    page,
  }) => {
    const sequence = page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const seen: string[] = [];
          const label = [...document.querySelectorAll('span')].find((s) =>
            /^Page \d+ \/ \d+$/.test(s.textContent ?? ''),
          )!;
          const tick = setInterval(() => {
            const value = label.textContent!;
            if (seen[seen.length - 1] !== value) seen.push(value);
          }, 16);
          setTimeout(() => {
            clearInterval(tick);
            resolve(seen);
          }, 2500);
        }),
    );

    // After the sampler is running, or its first reading is the click's result
    // rather than the state it started from.
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Next page' }).click();

    const seen = await sequence;
    expect(seen[0]).toMatch(/^Page 1 \//);
    expect(seen[seen.length - 1]).toMatch(/^Page 2 \//);
    // Two readings: where it was, and where it went. A third is the bounce.
    expect(seen).toHaveLength(2);
  });

  /** Chrome, so it must not reach the paper. */
  test('does not print', async ({ page }) => {
    await expect(rail(page)).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(rail(page)).toBeHidden();
  });
});
