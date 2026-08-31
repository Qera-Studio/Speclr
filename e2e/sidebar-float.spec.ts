import { test, expect } from '@playwright/test';

/**
 * The collapsed nav rail detaches into a floating pill, and hovering it grows
 * it back to full width without re-docking.
 *
 * All of this is geometry, which is why it is here: jsdom measures every box
 * as zero, so it cannot see that the pill left the window edge, that it shrank
 * to its rows, or that it stopped short of the content card. The behaviour
 * either side of the geometry (which attributes are set when) is pinned in
 * `AdminSidebar.test.tsx`.
 */
const RAIL = '[data-slot="sidebar"][data-side="left"] [data-slot="sidebar-container"]';
const CARD = '[data-slot="sidebar-inset"]';

test.describe('the floating nav rail', () => {
  test('detaches from every edge when collapsed', async ({ page }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();

    const docked = (await rail.boundingBox())!;
    expect(docked.x).toBe(0);

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    const pill = (await rail.boundingBox())!;
    // Off the left edge, clear of the top, and short of the viewport floor.
    expect(pill.x).toBeGreaterThan(0);
    expect(pill.y).toBeGreaterThan(docked.y);
    expect(pill.height).toBeLessThan(docked.height);
    // The icon strip's width, not the full rail's.
    expect(pill.width).toBeLessThan(60);

    // Anchored just under the docked rail's own top edge, not centred on the
    // viewport. Centring was tried and reverted: a pill taller than the space
    // ran off both edges at once, and the first nav row ended up above the
    // window. The two are only distinguishable by measuring, since both are
    // off every edge.
    expect(pill.y - docked.y).toBeLessThan(16);
  });

  /**
   * The pill is as tall as its rows and no taller, and it never grows past the
   * viewport: a profile with more destinations than fit scrolls inside the box
   * rather than hanging off the bottom of the screen.
   *
   * The short viewport is the whole test. At a normal height every nav here
   * fits, so the cap is never reached and a missing `max-height` looks
   * identical to a present one.
   */
  test('fits its rows, and stays inside the viewport when they do not fit', async ({
    page,
  }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    // Shrink-to-content: shorter than the rail it collapsed from, and taller
    // than a single row, so "fits its content" is not just "collapsed to zero".
    const roomy = (await rail.boundingBox())!;
    expect(roomy.height).toBeLessThan(page.viewportSize()!.height);
    expect(roomy.height).toBeGreaterThan(100);

    await page.setViewportSize({ width: 1280, height: 260 });
    await page.waitForTimeout(400);
    const cramped = (await rail.boundingBox())!;
    expect(cramped.y).toBeGreaterThanOrEqual(0);
    expect(cramped.y + cramped.height).toBeLessThanOrEqual(260);
    expect(cramped.height).toBeLessThan(roomy.height);
  });

  /**
   * "Its rows" means the *shown* profile's rows. Both profiles' navs are
   * rendered side by side in the swipe track, and as flex siblings they stretch
   * to the taller of the two — so the admin rail (4 rows) was padded out to the
   * client rail's 6 and the pill carried a band of dead space under its last
   * row. The off-screen copy is zero-height, which is what makes the pill's
   * height the live nav's.
   *
   * Measured rather than asserted on a class, because the fix is three CSS
   * properties interacting (`h-0`, `p-0` and the track's `items-start`) and any
   * one of them missing leaves the height wrong while the markup looks right:
   * `h-0` alone left 16px of padding behind, and without `items-start` the
   * default `stretch` grows the box back.
   */
  test('is as tall as the profile on screen, not the taller one', async ({ page }) => {
    await page.goto('/preview/shell');
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    const pill = (await page.locator(RAIL).first().boundingBox())!;
    const live = page.locator('nav[aria-label$="navigation"]:not([inert])');
    const dead = page.locator('nav[aria-label$="navigation"][inert]');

    // The two really do differ, or this test would pass on a broken build.
    expect(await dead.locator('[data-slot="sidebar-menu-button"]').count()).not.toBe(
      await live.locator('[data-slot="sidebar-menu-button"]').count(),
    );

    expect((await dead.boundingBox())!.height).toBe(0);
    const nav = (await live.boundingBox())!;
    // Header above, the `pb-2` that closes the box below, and nothing else.
    expect(pill.height).toBeCloseTo(nav.height + (nav.y - pill.y) + 8, 0);
  });

  /**
   * The whole point of a rail that floats *over* the page: content must never
   * end up behind it. The card's left edge stays clear of the pill's right
   * edge in the collapsed state, and does not move when the pill grows.
   */
  test('never sits over the content card, docked, floating or peeking', async ({
    page,
  }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();
    const card = page.locator(CARD).first();

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    const pill = (await rail.boundingBox())!;
    const collapsedCard = (await card.boundingBox())!;
    expect(collapsedCard.x).toBeGreaterThanOrEqual(pill.x + pill.width);

    // Growing on hover must not reflow the card — that is the difference
    // between floating over the page and pushing it.
    await rail.hover();
    await page.waitForTimeout(500);
    const grown = (await rail.boundingBox())!;
    const peekedCard = (await card.boundingBox())!;

    expect(grown.width).toBeGreaterThan(pill.width);
    expect(grown.x).toBe(pill.x);
    expect(peekedCard.x).toBe(collapsedCard.x);
    expect(peekedCard.width).toBe(collapsedCard.width);
  });

  /**
   * A floating rail carries destinations and nothing else. The account card and
   * the wordmark are both hidden for the whole float, peek included — a pill
   * that grew wide enough to label its rows did not become the app's masthead.
   *
   * `isVisible` rather than a className check: these are CSS variants, and
   * jsdom would only be reading the source back.
   */
  test('carries no account card and no wordmark while floating, peeking included', async ({
    page,
  }) => {
    await page.goto('/preview/shell');
    const footer = page.locator('[data-slot="sidebar-footer"]').first();
    const wordmark = page.getByText('speclr', { exact: true }).first();
    await expect(footer).toBeVisible();
    await expect(wordmark).toBeVisible();

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect(footer).toBeHidden();
    await expect(wordmark).toBeHidden();

    await page.locator(RAIL).first().hover();
    await page.waitForTimeout(500);
    await expect(footer).toBeHidden();
    await expect(wordmark).toBeHidden();
  });

  /**
   * The toggle stays in the nav icons' column at the peeked width too. That is
   * the case worth measuring: at 48px the box is too narrow for it to be
   * anywhere else, but at 236px `justify-between` would put it hard right if
   * anything ever shared the row with it again.
   */
  test('keeps the toggle in the icons column at the peeked width', async ({ page }) => {
    await page.goto('/preview/shell');
    const toggle = page.getByRole('button', { name: 'Toggle sidebar' });
    const anIcon = page.locator('[data-slot="sidebar-menu-button"] svg').first();

    await toggle.click();
    await page.locator(RAIL).first().hover();
    await page.waitForTimeout(500);

    const rail = (await page.locator(RAIL).first().boundingBox())!;
    expect(rail.width).toBeGreaterThan(200);

    const t = (await toggle.boundingBox())!;
    const i = (await anIcon.boundingBox())!;
    expect(t.x + t.width / 2).toBeCloseTo(i.x + i.width / 2, 0);
  });

  /**
   * The motion is the feature: a pill that *appears* on collapse rather than
   * travelling there is a different product. Sampling mid-transition is the
   * only way to tell the two apart, since both settle in the same place.
   *
   * Height is asserted alongside width because it was the one that snapped:
   * releasing the bottom edge dropped the box 672px → 360px in a single frame
   * before the transition ran. Stating both heights as lengths is what fixed
   * it, and this is what would catch a revert.
   */
  test('travels between the two shapes rather than snapping', async ({ page }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();
    const start = (await rail.boundingBox())!;

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    // One frame in. The transition is 200ms, so a later sample is close enough
    // to the endpoint that a snap and a tween become indistinguishable — which
    // is exactly how a version of this test passed with the transition
    // deleted. 16ms is where the two still differ by hundreds of pixels.
    await page.waitForTimeout(16);
    const mid = (await rail.boundingBox())!;
    await page.waitForTimeout(500);
    const end = (await rail.boundingBox())!;

    for (const axis of ['width', 'height'] as const) {
      expect(mid[axis], `${axis} mid-transition`).toBeLessThan(start[axis]);
      expect(mid[axis], `${axis} mid-transition`).toBeGreaterThan(end[axis]);
    }
  });
});
