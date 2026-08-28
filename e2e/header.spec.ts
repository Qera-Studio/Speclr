import { expect, test, type Locator } from '@playwright/test';

/**
 * The header band's right-hand end: the clock, a hairline, and the bell.
 *
 * Here rather than in Jest because the only thing worth asserting is where the
 * three sit relative to each other, and jsdom reports every box as zero. The
 * bug this pins shipped past a green suite and past a class-name check: the
 * separator carried `self-center` and still rendered `align-self: stretch`,
 * because `ui/separator.tsx` sets it through `data-vertical:self-stretch` and
 * an attribute-selector utility outranks a bare one whatever the class order.
 * Reading the class would have passed. Reading the computed style, or the box,
 * is what caught it.
 */

const midOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return box.y + box.height / 2;
};

test.describe('the header band', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/shell');
  });

  test('centres the clock, the rule and the bell on one line', async ({ page }) => {
    const end = page.locator('[data-slot="top-panel-end"]');
    await expect(end).toBeVisible();

    const clock = end.locator('span').first();
    const rule = end.locator('[data-slot="separator"]');
    const bell = end.getByRole('button', { name: /notifications/i });

    const [clockMid, ruleMid, bellMid] = await Promise.all([
      midOf(clock),
      midOf(rule),
      midOf(bell),
    ]);

    // Half a pixel of slack, no more: the miss this guards was six.
    expect(Math.abs(ruleMid - clockMid)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(ruleMid - bellMid)).toBeLessThanOrEqual(0.5);
  });

  test('puts the bell last, after the date and time', async ({ page }) => {
    const end = page.locator('[data-slot="top-panel-end"]');
    const rule = await end.locator('[data-slot="separator"]').boundingBox();
    const bell = await end.getByRole('button', { name: /notifications/i }).boundingBox();
    if (!rule || !bell) throw new Error('element has no box');

    expect(bell.x).toBeGreaterThan(rule.x);
  });
});
