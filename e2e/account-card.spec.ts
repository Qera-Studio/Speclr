import { expect, test } from '@playwright/test';

/**
 * The account card opens on hover as well as on click.
 *
 * Here rather than in Jest for the reason `AdminSidebar.test.tsx` already
 * records about this control: Base UI's menu does not open under jsdom's
 * pointer events when the trigger holds an Avatar, so the assertion there stops
 * at `aria-haspopup`. A real browser is what can tell "hover opens it" from
 * "the prop is spelled right".
 */
test.describe('the account card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/shell');
  });

  test('opens on hover, without a click', async ({ page }) => {
    const trigger = page.locator('[data-slot="sidebar-footer"] button').first();
    await expect(trigger).toBeVisible();

    await trigger.hover();
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('still opens on click', async ({ page }) => {
    const trigger = page.locator('[data-slot="sidebar-footer"] button').first();
    await trigger.click();
    await expect(page.getByRole('menu')).toBeVisible();
  });

  /**
   * Geometry, so it is here rather than in Jest for the ordinary reason: jsdom
   * measures every box as zero.
   *
   * The popover is anchored to a rail *row*, and there are two 8px insets
   * between that row's right edge and the surface it has to clear: the
   * sidebar's own `p-2`, and the `m-2` that floats the inset card off the
   * sidebar. So a side offset measured from the anchor is spent crossing both
   * before it reaches the edge a reader sees.
   *
   * **It is measured against the inset card, not the rail**, and that is the
   * whole point of the test. The first version asserted 2px past the *rail*,
   * which the popover cleared while still sitting in the 8px channel between
   * the rail and the card: over the shell's ground, which looks exactly like
   * opening over the sidebar. It passed on a live bug, because it checked the
   * wrong edge.
   *
   * The assertion is the 4px rather than "somewhere to the right", because the
   * failure being guarded is an offset measured against the wrong box, and
   * every wrong box still puts the popover to the right of something.
   */
  test('opens clear of the inset card, not over the rail', async ({ page }) => {
    const trigger = page.locator('[data-slot="sidebar-footer"] button').first();
    await trigger.hover();
    await expect(page.getByRole('menu')).toBeVisible();

    const inset = await page.locator('[data-slot="shell-inset"]').boundingBox();
    const popover = await page.getByRole('menu').boundingBox();
    if (!inset || !popover) throw new Error('element has no box');

    expect(popover.x - inset.x).toBeCloseTo(4, 0);
  });

  /**
   * The other axis, and the same two insets read downwards.
   *
   * `align="end"` lands the popover's bottom on the *anchor's* bottom, and the
   * anchor is a footer row inset from the shell's bottom by the footer's `p-2`
   * and the card's `m-2`. So the corner curved against nothing, 16px short.
   *
   * Asserted as 4px *inside* the card's bottom edge rather than past it,
   * because this axis clears nothing: the radii read against each other, so
   * the seam is air inside the corner. It is the sign, not just the distance,
   * that this guards.
   */
  test('its bottom corner nests with the card, not 16px above it', async ({ page }) => {
    const trigger = page.locator('[data-slot="sidebar-footer"] button').first();
    await trigger.hover();
    await expect(page.getByRole('menu')).toBeVisible();

    const inset = await page.locator('[data-slot="shell-inset"]').boundingBox();
    const popover = await page.getByRole('menu').boundingBox();
    if (!inset || !popover) throw new Error('element has no box');

    const insetBottom = inset.y + inset.height;
    const popoverBottom = popover.y + popover.height;
    // Within a pixel rather than `toBeCloseTo(4, 0)`'s half: the popup's box
    // lands on a subpixel (the horizontal assertion above measures 247.96 for
    // its 248), and here that puts the answer exactly on the half-pixel
    // boundary. A pixel is the resolution this is visible at anyway; every
    // wrong box the test exists to catch is out by 8 or more.
    expect(Math.abs(insetBottom - popoverBottom - 4)).toBeLessThan(1);
  });
});
