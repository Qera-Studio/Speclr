import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The tab pill can be picked up and dragged, and it selects whatever it is
 * nearest when let go (`useTabDrag`, `docs/design.md` §2.7).
 *
 * Here rather than in Jest because every assertion below is a measurement:
 * which tab a release lands on comes from the pill's box against each trigger's
 * box, and jsdom reports all of them as zero. The labels on `/preview/tabs` are
 * deliberately unequal, so a wrong rule that steps one tab per fixed distance
 * cannot pass.
 */

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return box;
}

const centreOf = async (locator: Locator) => {
  const box = await boxOf(locator);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Grab the pill and drop it on the middle of `target`. */
async function dragPillOnto(page: Page, target: Locator) {
  const pill = page.locator('[data-slot="tabs-indicator"]');
  const from = await centreOf(pill);
  const to = await centreOf(target);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // In steps: one jump would be a single pointermove, which is a teleport
  // rather than a drag and would not exercise the tracking at all.
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

test.describe('the tab pill is draggable', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/tabs');
    await expect(page.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
      'data-active',
      '',
    );
  });

  test('selects the tab it is released on', async ({ page }) => {
    await dragPillOnto(page, page.getByRole('tab', { name: 'Terms' }));
    await expect(page.getByRole('tab', { name: 'Terms' })).toHaveAttribute(
      'data-active',
      '',
    );
  });

  /** Two steps along, over a middle tab wider than either neighbour. */
  test('lands on the middle tab when released over it', async ({ page }) => {
    await dragPillOnto(page, page.getByRole('tab', { name: 'Line items and taxes' }));
    await expect(
      page.getByRole('tab', { name: 'Line items and taxes' }),
    ).toHaveAttribute('data-active', '');
  });

  test('tracks the pointer while it is held', async ({ page }) => {
    const pill = page.locator('[data-slot="tabs-indicator"]');
    const start = await boxOf(pill);
    const from = await centreOf(pill);
    const to = await centreOf(page.getByRole('tab', { name: 'Terms' }));

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 });
    // Mid-gesture, before any tab has been activated: the pill has moved and
    // the strip says it is being dragged.
    expect((await boxOf(pill)).x).toBeGreaterThan(start.x + 20);
    await expect(page.locator('[data-slot="tabs-list"]')).toHaveAttribute(
      'data-dragging',
      '',
    );
    await expect(page.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
      'data-active',
      '',
    );
    await page.mouse.up();
  });

  /** The pill stays in its trough however far the hand goes past the end. */
  test('does not leave the strip', async ({ page }) => {
    const list = await boxOf(page.locator('[data-slot="tabs-list"]'));
    const pill = page.locator('[data-slot="tabs-indicator"]');
    const from = await centreOf(pill);

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 900, from.y, { steps: 12 });
    const held = await boxOf(pill);
    expect(held.x + held.width).toBeLessThanOrEqual(list.x + list.width + 1);
    await page.mouse.up();
  });

  /** The gesture is an accelerator; an ordinary click still selects. */
  test('leaves a plain click alone', async ({ page }) => {
    await page.getByRole('tab', { name: 'Terms' }).click();
    await expect(page.getByRole('tab', { name: 'Terms' })).toHaveAttribute(
      'data-active',
      '',
    );
  });
});
