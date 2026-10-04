import { test, expect } from '@playwright/test';

/**
 * The type-and-country screen, which is the first thing adding a client shows.
 *
 * Every assertion here is a *measurement*, which is why it lives in `e2e/` and
 * not beside the component: jsdom renders every box as zero, so it cannot see
 * how many rows fit in a fixed band or whether a divider has a line.
 *
 * It runs against `/preview/client-chooser` because the real screen is behind
 * Clerk. The preview renders the same component with its callbacks stubbed.
 */
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page.goto('/preview/client-chooser');
  await page.getByText('Where are they based?').waitFor();
});

/**
 * Four country rows, no more and no fewer.
 *
 * The number is a height in pixels on a scrolling band, and it has been wrong
 * twice: once sized for six rows of list and showing five, because the sticky
 * continent heading inside the band was left out of the sum, and once at four
 * rows' worth of `rem` and showing three, because a row's pitch (40px) is not
 * its height (36px). Both looked right in the class names.
 *
 * **Both counts, and the second is what makes this a real guard.** Counting
 * only whole rows passes on a band 40px too tall, because the fifth row is
 * then merely *partly* showing and a "wholly inside" filter never sees it.
 * That was this test's own first version, and it stayed green against the
 * height it was written to forbid. So the band must hold four whole rows and
 * start no fifth: `touching` counts every row that puts any pixel inside it.
 */
test('shows four country rows in the scrolling band', async ({ page }) => {
  const counts = await page.evaluate(() => {
    const band = document.querySelector('div[class*="overflow-y-auto"]') as HTMLElement;
    const box = band.getBoundingClientRect();
    const rows = [...band.querySelectorAll('li > button')] as HTMLElement[];
    // The grid is three columns, so distinct `top` values are the row count.
    const bandsOf = (cells: HTMLElement[]) =>
      new Set(cells.map((row) => Math.round(row.getBoundingClientRect().top))).size;

    return {
      whole: bandsOf(
        rows.filter((row) => {
          const r = row.getBoundingClientRect();
          return r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5;
        }),
      ),
      touching: bandsOf(
        rows.filter((row) => {
          const r = row.getBoundingClientRect();
          return r.bottom > box.top + 0.5 && r.top < box.bottom - 0.5;
        }),
      ),
    };
  });

  expect(counts.whole).toBe(4);
  expect(counts.touching).toBe(4);
});

/**
 * And the band really does scroll, rather than being tall enough for all 243.
 *
 * Without this the test above passes on a band that happens to fit four
 * countries because there are only four, which is the failure mode of every
 * "count what is visible" assertion.
 */
test('keeps the rest of the world behind a scroll', async ({ page }) => {
  const overflows = await page.evaluate(() => {
    const band = document.querySelector('div[class*="overflow-y-auto"]') as HTMLElement;
    return band.scrollHeight > band.clientHeight + 1;
  });

  expect(overflows).toBe(true);
});

/**
 * The two questions are separated by a real rule.
 *
 * Asserted on the computed background rather than on a class name, because a
 * class is what somebody writes and a painted line is what a reader sees. A
 * `border` swapped for a `bg` would keep this green, which is correct: the
 * point is that the line is there.
 */
test('rules off the type from the country', async ({ page }) => {
  const painted = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h3')].find((h) =>
      h.textContent?.includes('Where are they based?'),
    );
    const rules = [...(heading?.parentElement?.querySelectorAll('span') ?? [])];
    return rules
      .map((rule) => {
        const r = rule.getBoundingClientRect();
        const bg = getComputedStyle(rule).backgroundColor;
        return { wide: r.width > 20, thin: r.height <= 2, painted: bg !== 'rgba(0, 0, 0, 0)' };
      })
      .filter((r) => r.wide && r.thin && r.painted).length;
  });

  // One either side of the heading.
  expect(painted).toBe(2);
});

/**
 * The type icon is tall enough to stand against both lines of its card.
 *
 * It was `size-5` against a two-line card, which left it hanging off the first
 * line. The assertion is a floor rather than an exact size: what matters is
 * that the glyph is not smaller than the text block it sits beside.
 */
test('gives the type cards an icon that spans their text', async ({ page }) => {
  const icon = page.locator('button', { hasText: 'An individual' }).locator('svg').first();
  const box = (await icon.boundingBox())!;

  expect(box.height).toBeGreaterThanOrEqual(24);
});
