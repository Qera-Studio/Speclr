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
    const footer = (await page
      .locator('[data-slot="sidebar-footer"]')
      .first()
      .boundingBox())!;
    // Header above; below the nav, the content's own 8px and then the account
    // card, whose box carries the pill's closing 8px in its padding.
    expect(pill.height).toBeCloseTo(
      nav.height + (nav.y - pill.y) + 8 + footer.height,
      0,
    );
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
   * The account card survives the float and the wordmark does not, and the two
   * go different ways for different reasons. The card is the only route to
   * settings, the theme and sign-out, so a pill without it is a nav you have to
   * dock before you can leave; the wordmark is a masthead, and a strip of icons
   * that grew wide enough to label itself did not become one.
   *
   * `toBeVisible` rather than a className check: these are CSS variants, and
   * jsdom would only be reading the source back.
   */
  test('keeps the account card while floating but drops the wordmark, peek included', async ({
    page,
  }) => {
    await page.goto('/preview/shell');
    const footer = page.locator('[data-slot="sidebar-footer"]').first();
    const wordmark = page.getByText('speclr', { exact: true }).first();
    await expect(footer).toBeVisible();
    await expect(wordmark).toBeVisible();

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);
    await expect(footer).toBeVisible();
    await expect(wordmark).toBeHidden();

    // Inside the pill, not merely in the DOM beside it: a footer that overflowed
    // the box would still report visible.
    const pill = (await page.locator(RAIL).first().boundingBox())!;
    const box = (await footer.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(pill.y + pill.height + 1);

    await page.locator(RAIL).first().hover();
    await page.waitForTimeout(500);
    await expect(footer).toBeVisible();
    await expect(wordmark).toBeHidden();
  });

  /**
   * The air asked for around it, measured. 24px between the last destination
   * and the avatar, which is what the header leaves above the first one, and
   * 8px under it, which is the margin either side of the icon column.
   *
   * Worth a test of its own because it is three paddings in two files adding
   * up (`SidebarContent`'s `pb-2`, the footer's `pt-4`, its `p-2`), and any one
   * of them changing leaves the markup looking right.
   */
  test('holds the account card off the rows by the header\'s own gap', async ({ page }) => {
    await page.goto('/preview/shell');
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    const pill = (await page.locator(RAIL).first().boundingBox())!;
    const rows = page.locator('nav[aria-label$="navigation"]:not([inert]) [data-slot="sidebar-menu-button"]');
    const lastRow = (await rows.last().boundingBox())!;
    // The footer's own button, not `[data-slot="sidebar-menu-button"]`: the
    // account row is a `DropdownMenuTrigger` *rendering* one, so the trigger's
    // slot is what ends up on the element.
    const avatar = (await page
      .locator('[data-slot="sidebar-footer"] button')
      .first()
      .boundingBox())!;
    const toggle = (await page.getByRole('button', { name: 'Toggle sidebar' }).boundingBox())!;
    const firstRow = (await rows.first().boundingBox())!;

    expect(avatar.y - (lastRow.y + lastRow.height)).toBeCloseTo(
      firstRow.y - (toggle.y + toggle.height),
      0,
    );
    expect(pill.y + pill.height - (avatar.y + avatar.height)).toBeCloseTo(8, 0);
  });

  /**
   * The account card travels with the box on expand instead of arriving late.
   *
   * It presented as a fault of the card and was not: the pill's floating height
   * was `fit-content`, which does not animate, so *everything* inside stayed at
   * the collapsed height for the whole 200ms and then jumped ~310px in the
   * closing frame. The card is simply the row far enough down the box for
   * 310px to be obvious. See `--rail-height` in `AdminSidebar`.
   *
   * Sampling mid-transition is the only way to see it: the endpoints are
   * identical either way, which is how it survived a suite that measures both.
   */
  test('carries the account card down with the box, not after it', async ({ page }) => {
    await page.goto('/preview/shell');
    const footer = page.locator('[data-slot="sidebar-footer"]').first();

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);
    const collapsed = (await footer.boundingBox())!.y;

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    // Early in the 200ms, because `ease-standard` front-loads: by 90ms the card
    // is already within 40px of home, and a window that late cannot tell a
    // travelling card from one that has arrived.
    await page.waitForTimeout(30);
    const mid = (await footer.boundingBox())!.y;
    await page.waitForTimeout(500);
    const docked = (await footer.boundingBox())!.y;

    // Genuinely between the two, not still parked at the collapsed position
    // waiting to jump. The margins keep this away from both endpoints: pinned,
    // `mid` equals `collapsed`; snapping early, it equals `docked`.
    expect(docked).toBeGreaterThan(collapsed + 200);
    expect(mid).toBeGreaterThan(collapsed + 40);
    expect(mid).toBeLessThan(docked - 40);
  });

  /**
   * Switching profile in the pill changes its height, because the two navs have
   * different row counts, and that change has to travel too.
   *
   * It is driven here by moving `--rail-height`, which is exactly what a
   * profile change does: the pill's floating height is that variable, measured
   * from the live nav in `AdminSidebar`. The fixture sits outside both profiles
   * so its swipe has nowhere to commit to, and the variable is the seam.
   *
   * Why a variable at all, rather than the `fit-content` this replaced:
   * `height: fit-content` never changes as a *computed* value when its content
   * changes, only as a used one, and transitions fire on computed values. So
   * the old pill snapped to the new profile's height in a single frame while
   * the track was still sliding sideways.
   */
  test('interpolates the height when the profile changes', async ({ page }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();
    const wrapper = page.locator('[data-slot="sidebar"][data-side="left"]').first();

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);
    const start = (await rail.boundingBox())!.height;

    const target = start - 96;
    await wrapper.evaluate(
      (node, height) =>
        (node as HTMLElement).style.setProperty('--rail-height', `${height}px`),
      target,
    );
    await page.waitForTimeout(60);
    const mid = (await rail.boundingBox())!.height;
    await page.waitForTimeout(400);

    expect((await rail.boundingBox())!.height).toBeCloseTo(target, 0);
    // Under way, and not there yet. A snap satisfies neither bound.
    expect(mid).toBeLessThan(start - 10);
    expect(mid).toBeGreaterThan(target + 5);
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
