import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The two rules in `ui/popup.ts`, measured rather than asserted.
 *
 * Both are geometry, so Jest cannot see them: jsdom resolves no Tailwind and
 * gives every box a width and height of zero. A source rule can say the right
 * class is present; only a browser can say the class landed on the right
 * element. It had not. The combobox anchored to its bare `<input>` instead of
 * its bordered group, so the list came out ~34px narrower than the field with
 * its gap swallowed, and 1,989 green tests said nothing about it.
 *
 * Measured against the *visible* edge, which is what a reader compares: the
 * bounding box a browser reports for a ringed control excludes its ring,
 * because `ring-2` is a box-shadow. Hence the tolerance below rather than an
 * exact equality on the gap.
 */

/** `POPUP_GAP`, and the ring's 2px on either side of it. */
const GAP = 4;
const RING = 2;

/** The popup must clear the control, and must not float away from it. */
const MIN_GAP = 1;
const MAX_GAP = GAP + RING + 1;

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return box;
}

async function measure(page: Page, probe: string, popup: Locator) {
  const control = await boxOf(page.locator(`[data-probe="${probe}"]`));
  const box = await boxOf(popup);
  return {
    /** Positive means the popup clears the control. */
    gap: box.y - (control.y + control.height),
    /** Positive means the popup is wider than the control. */
    overhang: box.width - control.width,
  };
}

test.describe('a popup keeps its distance and never comes out narrower', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/popups');
    /*
      Every popup here opens through `zoom-in-95` and `slide-in-from-*`, which
      are transforms: for the first ~100ms the box a browser reports is smaller
      than the box that settles, and offset from it. Measuring into that window
      gave a different answer on each run, which is a test that cannot fail
      honestly. Killing the animation measures the resting state, which is the
      only state a reader ever compares.
    */
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important}',
    });
  });

  test('the combobox list clears its field and matches its width', async ({ page }) => {
    await page.getByPlaceholder('Client').click();
    const popup = page.locator('[data-slot="combobox-content"]');
    await expect(popup).toBeVisible();

    const { gap, overhang } = await measure(page, 'combobox', popup);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gap).toBeLessThanOrEqual(MAX_GAP);
    // The ring is painted outside the reported box, so the popup is allowed to
    // be up to 2*RING wider. It may never be narrower.
    expect(overhang).toBeGreaterThanOrEqual(0);
  });

  test('the select list clears its trigger and matches its width', async ({ page }) => {
    await page.getByRole('combobox').filter({ hasText: 'One' }).click();
    const popup = page.locator('[data-slot="select-content"]');
    await expect(popup).toBeVisible();

    const { gap, overhang } = await measure(page, 'select', popup);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gap).toBeLessThanOrEqual(MAX_GAP);
    expect(overhang).toBeGreaterThanOrEqual(0);
  });

  test('the calendar clears its date field and is never narrower', async ({ page }) => {
    await page.locator('[data-slot="date-picker-trigger"]').click();
    const popup = page.locator('[data-slot="popover-content"]');
    await expect(popup).toBeVisible();

    const { gap, overhang } = await measure(page, 'date', popup);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gap).toBeLessThanOrEqual(MAX_GAP);
    expect(overhang).toBeGreaterThanOrEqual(0);
  });

  test('the menu clears its button and is never narrower', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    const popup = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(popup).toBeVisible();

    const { gap, overhang } = await measure(page, 'menu', popup);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gap).toBeLessThanOrEqual(MAX_GAP);
    expect(overhang).toBeGreaterThanOrEqual(0);
  });

  /**
   * The one the user caught by eye. A submenu opens to the *side*, so the
   * measurement is horizontal: its left edge against the parent menu's right.
   * At `sideOffset={0}` this was negative, which is what "overlapping by about
   * two pixels" looks like from the outside.
   */
  test('the submenu clears the menu it opened from', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    const menu = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(menu).toBeVisible();
    const parent = await boxOf(menu);

    await page.getByText('Theme').hover();
    const sub = page.locator('[data-slot="dropdown-menu-sub-content"]');
    await expect(sub).toBeVisible();
    const child = await boxOf(sub);

    const gap = child.x - (parent.x + parent.width);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gap).toBeLessThanOrEqual(MAX_GAP);
  });
});
