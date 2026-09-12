import { test, expect } from '@playwright/test';
import sharp from 'sharp';

/**
 * The collapsed nav rail detaches into a floating pill, and hovering it grows
 * it back to full width without re-docking.
 *
 * All of this is geometry, which is why it is here: jsdom measures every box
 * as zero, so it cannot see that the rail left the window edge, that it runs
 * the window's height, or that it stopped short of the content card. The
 * behaviour either side of the geometry (which attributes are set when) is
 * pinned in `AdminSidebar.test.tsx`.
 *
 * **It was a pill and is now a column**, and several tests here read as
 * corrections because of it. Collapsing used to shrink the box to its rows as
 * well as narrowing it; it now changes the width and nothing else, so the
 * height is the window's less its two 8px gutters in both states. What that
 * retired is written up on each test that used to assert the old shape.
 */
const RAIL = '[data-slot="sidebar"][data-side="left"] [data-slot="sidebar-container"]';
const CARD = '[data-slot="sidebar-inset"]';

/**
 * How many pixels of two same-sized screenshots differ, allowing a small
 * per-channel tolerance for antialiasing.
 *
 * `sharp` is already a dependency (Next.js pulls it for image optimisation),
 * so this needs no new vendor row.
 */
const differingPixels = async (a: Buffer, b: Buffer) => {
  const raw = (buf: Buffer) =>
    sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const [{ data: pa }, { data: pb }] = await Promise.all([raw(a), raw(b)]);
  if (pa.length !== pb.length) return Number.POSITIVE_INFINITY;

  let n = 0;
  for (let i = 0; i < pa.length; i += 3) {
    const delta =
      Math.abs(pa[i] - pb[i]) +
      Math.abs(pa[i + 1] - pb[i + 1]) +
      Math.abs(pa[i + 2] - pb[i + 2]);
    // Antialiasing moves a channel by a few units; a glyph appearing or going
    // moves them by tens.
    if (delta > 24) n++;
  }
  return n;
};

test.describe('the floating nav rail', () => {
  test('detaches from every edge when collapsed', async ({ page }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();

    const docked = (await rail.boundingBox())!;
    expect(docked.x).toBe(0);

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    const float = (await rail.boundingBox())!;
    // Off the left edge and clear of the top.
    expect(float.x).toBeGreaterThan(0);
    expect(float.y).toBeGreaterThan(docked.y);
    // The icon strip's width, not the full rail's.
    expect(float.width).toBeLessThan(60);

    // Anchored just under the docked rail's own top edge, not centred on the
    // viewport. Centring was tried and reverted: the first nav row ended up
    // above the window. The two are only distinguishable by measuring, since
    // both are off every edge.
    expect(float.y - docked.y).toBeLessThan(16);
  });

  /**
   * Full height, and floating is the whole of what collapsing changes besides
   * the width: the box runs the window less an 8px gutter at each end.
   *
   * It shrank to its rows once, which is what made it a pill. Three tests here
   * measured that and are gone or rewritten with it, and the machinery under it
   * went too: a measured `--rail-height`, published because `fit-content` does
   * not animate. A column's height is a length in both states, so there is no
   * height transition left to get wrong.
   *
   * Asserted against the viewport rather than a number, so this still means
   * something at another window size, and the top and bottom gutters are
   * checked separately: one number for the total would pass on a box that had
   * slid down as far as it had shrunk.
   */
  test('runs the full height of the window, inset at both ends', async ({ page }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    const { height } = page.viewportSize()!;
    const box = (await rail.boundingBox())!;
    expect(box.y).toBeCloseTo(8, 0);
    expect(height - (box.y + box.height)).toBeCloseTo(8, 0);
  });

  /**
   * And it follows the window rather than being a number written down once.
   *
   * The short viewport is the whole test: at a normal height a height that
   * tracked the viewport and one that happened to fit look identical.
   */
  test('follows the viewport when it shrinks', async ({ page }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);
    const roomy = (await rail.boundingBox())!;

    await page.setViewportSize({ width: 1280, height: 260 });
    await page.waitForTimeout(400);
    const cramped = (await rail.boundingBox())!;
    expect(cramped.y).toBeCloseTo(8, 0);
    expect(260 - (cramped.y + cramped.height)).toBeCloseTo(8, 0);
    expect(cramped.height).toBeLessThan(roomy.height);
  });

  /**
   * The off-screen profile's nav takes no height.
   *
   * Both are rendered side by side in the swipe track, and as flex siblings
   * they stretch to the taller of the two — so the admin rail (4 rows) was
   * padded out to the client rail's 6. That used to show as a band of dead
   * space under the pill's last row, and the pill is a full-height column now,
   * so the symptom is gone. The cause is not: a stretched off-screen copy still
   * makes the track taller than the live nav, which is what `SidebarContent`
   * would scroll against on a short window.
   *
   * Measured rather than asserted on a class, because the fix is three CSS
   * properties interacting (`h-0`, `p-0` and the track's `items-start`) and any
   * one of them missing leaves the height wrong while the markup looks right:
   * `h-0` alone left 16px of padding behind, and without `items-start` the
   * default `stretch` grows the box back.
   */
  test('gives the off-screen profile no height', async ({ page }) => {
    await page.goto('/preview/shell');
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    const live = page.locator('nav[aria-label$="navigation"]:not([inert])');
    const dead = page.locator('nav[aria-label$="navigation"][inert]');

    // The two really do differ, or this test would pass on a broken build.
    expect(await dead.locator('[data-slot="sidebar-menu-button"]').count()).not.toBe(
      await live.locator('[data-slot="sidebar-menu-button"]').count(),
    );

    expect((await dead.boundingBox())!.height).toBe(0);
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
   * The peek covers the card **whole**, and that is a paint assertion rather
   * than a geometric one.
   *
   * The test above pins that the card does not move. It cannot see the failure
   * this one exists for: the card's fill is drawn by `SidebarInset` at
   * `z-auto` and goes under the peek's `z-20`, while `AdminHeader` carried a
   * `z-30` that lifted the back chip and the breadcrumb trail back out on
   * their own. The header row is transparent, so what showed between those
   * glyphs was the nav's own panel, and one band of the screen had two
   * columns' text interleaved on it.
   *
   * Sampled at the header row's own height, which is the only band where the
   * two ever competed, and by colour rather than by `elementFromPoint`: hit
   * testing walks straight past the peek's transparent outer container and
   * reports the header underneath it either way, which is how a first pass at
   * this test passed against the bug.
   */
  test('covers the card whole while peeking, header row included', async ({
    page,
  }) => {
    await page.goto('/preview/shell');
    const rail = page.locator(RAIL).first();

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);
    await rail.hover();
    await page.waitForTimeout(500);

    const grown = (await rail.boundingBox())!;
    const header = (await page.locator('header[data-print-hidden]').boundingBox())!;

    // The peek genuinely reaches across the header row, or the rest of this
    // passes on a rail that never overlapped it.
    expect(grown.x + grown.width).toBeGreaterThan(header.x + 40);

    // The back chip: card content sitting fully inside the peek's box, and the
    // thing that used to climb back out of it.
    const chip = (await page
      .getByRole('button', { name: /back/i })
      .first()
      .boundingBox())!;
    expect(chip.x + chip.width).toBeLessThan(grown.x + grown.width);

    // What that rectangle must look like: exactly what it looks like with the
    // chip taken out of the page. Behind an opaque panel the chip contributes
    // nothing to those pixels, so removing it can change none of them. The bug
    // painted its glyphs over the nav's own "Dashboard" label in this same
    // 28px, and removing it is what took them away again.
    //
    // Asserted as an identity against a re-render rather than as a flat fill:
    // the peek's own label crosses this band, so "the panel is blank here" was
    // never true, and a shade count cannot tell one column's text from two.
    // Hiding the *chip* rather than the card, because the card is the chip's
    // own ancestor and hiding it removes the glyphs from both renders, which
    // is how two earlier versions of this test passed against the bug.
    const clip = {
      x: chip.x,
      y: chip.y,
      width: Math.round(chip.width),
      height: Math.round(chip.height),
    };

    const before = await page.screenshot({ clip });

    // Held as an element handle, not a locator: `visibility: hidden` takes the
    // button out of the accessibility tree, so a role query cannot find it
    // again to put it back and simply waits until the test times out.
    const button = await page
      .getByRole('button', { name: /back/i })
      .first()
      .elementHandle();
    await button!.evaluate((el) => el.style.setProperty('visibility', 'hidden'));
    // A frame for the change to reach the compositor. Without it the second
    // shot can be the first one again, which makes the two agree whatever the
    // z-order is.
    await page.waitForTimeout(100);
    const without = await page.screenshot({ clip });
    await button!.evaluate((el) => el.style.removeProperty('visibility'));

    // Counted with a tolerance rather than compared byte-for-byte: two shots
    // of an unchanged region still differ in a handful of antialiased
    // subpixels, so `Buffer.equals` reports a difference either way and proves
    // nothing. Removing a hidden chip moves a few dozen pixels at most;
    // removing a *visible* one clears ~65x28 of text.
    expect(await differingPixels(before, without)).toBeLessThan(100);
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
   * The account card sits at the bottom of the box, 8px off it, which is the
   * margin either side of the icon column.
   *
   * It used to be asserted the other way round: 24px between the last
   * destination and the footer, matching the air the header leaves above the
   * first one, bought with a `pb-2` and a `pt-4` that existed only in the
   * float. Both are gone with the pill. `SidebarContent` stretches in a
   * full-height column, so the card is held at the bottom of the window and
   * the gap above it is the remainder rather than a number anyone chose.
   *
   * What is still worth measuring is the closing 8px, because it comes from the
   * footer's own `p-2` rather than from the box, and a card flush to the bottom
   * edge looks like a clipped one.
   */
  test('rests the account card on the foot of the box', async ({ page }) => {
    await page.goto('/preview/shell');
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await page.waitForTimeout(400);

    const box = (await page.locator(RAIL).first().boundingBox())!;
    const rows = page.locator('nav[aria-label$="navigation"]:not([inert]) [data-slot="sidebar-menu-button"]');
    const lastRow = (await rows.last().boundingBox())!;
    // The footer's own button, not `[data-slot="sidebar-menu-button"]`: the
    // account row is a `DropdownMenuTrigger` *rendering* one, so the trigger's
    // slot is what ends up on the element.
    const avatar = (await page
      .locator('[data-slot="sidebar-footer"] button')
      .last()
      .boundingBox())!;

    expect(box.y + box.height - (avatar.y + avatar.height)).toBeCloseTo(8, 0);
    // At the foot rather than trailing the rows, which is the half a stretched
    // `SidebarContent` is responsible for: without it the card rides up under
    // the last destination and the box has a column of empty rail beneath it.
    expect(avatar.y - (lastRow.y + lastRow.height)).toBeGreaterThan(200);
  });

  /**
   * The account card does not move on collapse, at any point during it.
   *
   * This replaces two tests and is a stronger claim than either. The card used
   * to travel ~310px between the two states, and both of those tests existed
   * because it travelled *badly*: the float's height was `fit-content`, which
   * does not animate, so everything inside stayed at the collapsed height for
   * the whole 200ms and then jumped in the closing frame. The fix at the time
   * was a measured `--rail-height`, and both tests sampled mid-transition to
   * prove the interpolation was real.
   *
   * A full-height column has nowhere to travel to: the card's foot is 8px off
   * the bottom of the window collapsed, docked and at every frame between. So
   * the assertion is that it is *still*, which is what retires the height
   * animation, the variable and the measurement pass behind it.
   *
   * **Its foot, not its top**, and the difference is a real 19px rather than a
   * choice of edge. The footer holds the profile switcher above the card, and
   * that row loses its labels at the icon width, so the footer's own height
   * changes on collapse and its top moves with it. What is pinned is the bottom
   * of the box, which is what "rests on the foot" means and what the card
   * arriving late was measured against.
   *
   * Sampled mid-transition rather than at the endpoints, because that is where
   * the old bug lived and where a height transition creeping back in would
   * show first.
   */
  test('holds the account card still through the collapse', async ({ page }) => {
    await page.goto('/preview/shell');
    const foot = async () => {
      const b = (await page.locator('[data-slot="sidebar-footer"]').first().boundingBox())!;
      return b.y + b.height;
    };

    const docked = await foot();

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    // Early in the 200ms: `ease-standard` front-loads, so a late sample cannot
    // tell a box that never moved from one that has finished moving.
    await page.waitForTimeout(30);
    const mid = await foot();
    await page.waitForTimeout(500);
    const collapsed = await foot();

    // 8px either way: the box gains its bottom gutter on collapse and that is
    // the whole of the movement, against the ~310px it used to make.
    expect(Math.abs(mid - docked)).toBeLessThanOrEqual(9);
    expect(Math.abs(collapsed - docked)).toBeLessThanOrEqual(9);
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
