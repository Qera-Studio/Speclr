import { test, expect } from '@playwright/test';

/**
 * Where a sheet opens, measured against the real shell.
 *
 * This is geometry and therefore jsdom-proof twice over. `sheet.test.tsx`
 * asserts the class the container swap produces, which is the mechanism; only a
 * browser can say whether the panel actually stops at the card's edge, because
 * jsdom reports every box as zero and a `fixed` panel and an `absolute` one
 * measure identically there.
 *
 * It is measured against a fixture carrying the real shell rather than
 * `/preview/clause-library`, because the bug was never in the drawer. The drawer is contained by
 * `AdminShell` publishing its card through `InsetProvider`, so a fixture with
 * no shell renders the window fallback and would pass whichever way this was
 * wired. The two drawers here are deliberately different distances from the
 * shell: the bell is its direct child and used to be handed the card as a prop,
 * and the clause library is four levels into a page and could not be, which is
 * the whole reason the prop became a context.
 *
 * **Every measurement waits for the slide-in to finish**, and that is not
 * boilerplate. The panel enters on a `translate-x` of 40px, so measured on the
 * frame it opens it reports 40px past the card's edge whatever it is positioned
 * against, and a test written without the wait fails against correct code and
 * would pass against a `fixed` panel that happened to be measured late.
 */

/** The inset card, which is what a contained sheet must not exceed. */
const INSET = '.group\\/inset';

/**
 * The open panel, once it has stopped moving. `translate` returning `none` is
 * the end of the transition, which is a stabler signal than a fixed timeout.
 */
async function settledPanel(page: import('@playwright/test').Page) {
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect
    .poll(() =>
      drawer.evaluate((el) => getComputedStyle(el).translate),
    )
    .toBe('none');
  return (await drawer.boundingBox())!;
}

test.describe('a sheet in the shell', () => {
  /**
   * The page-level drawer has its own fixture. Putting it on `/preview/shell`
   * was tried and reverted: six other specs measure that page, and the extra
   * table pushed first-hit compiles past the expect timeout under four workers,
   * failing an unrelated date-picker test.
   */
  test('keeps a page-level drawer inside the inset card', async ({ page }) => {
    await page.goto('/preview/shell-drawer');

    // Named, not `.first()` of /^Open /. Next's dev-tools button is also an
    // "Open …" and it mounts late, so a positional match could pick it.
    await page.getByRole('button', { name: 'Open Definitions and Interpretation' }).click();

    const panel = await settledPanel(page);
    const card = (await page.locator(INSET).boundingBox())!;
    const viewport = page.viewportSize()!;

    // Inside the card on all three edges that a fixed panel would escape.
    expect(panel.x + panel.width).toBeLessThanOrEqual(card.x + card.width + 1);
    expect(panel.y).toBeGreaterThanOrEqual(card.y - 1);
    expect(panel.y + panel.height).toBeLessThanOrEqual(card.y + card.height + 1);

    // And the failure it replaces, stated as itself: the card does not reach
    // the top of the window, so a panel that did would be the old behaviour.
    expect(card.y).toBeGreaterThan(0);
    expect(panel.height).toBeLessThan(viewport.height);
  });

  /**
   * The notification drawer, same rule, no prop. It was contained before this
   * change and is contained after it, which is the point: the plumbing was
   * deleted and the behaviour did not move.
   */
  test('keeps the notification drawer inside it too', async ({ page }) => {
    await page.goto('/preview/shell');
    await page.getByRole('button', { name: /notifications/i }).click();

    const panel = await settledPanel(page);
    const card = (await page.locator(INSET).boundingBox())!;

    expect(panel.x + panel.width).toBeLessThanOrEqual(card.x + card.width + 1);
    expect(panel.y).toBeGreaterThanOrEqual(card.y - 1);
  });

  /**
   * The scrim follows the panel, and it is the half that is actually visible.
   * A panel contained by the card with a backdrop still over the window would
   * dim the nav to report something happening inside the card, which is the
   * behaviour `Notifications` was given `contained` for in the first place.
   */
  test('darkens the card and not the nav', async ({ page }) => {
    await page.goto('/preview/shell');
    await page.getByRole('button', { name: /notifications/i }).click();
    await settledPanel(page);

    const scrim = (await page.locator('[data-slot="sheet-overlay"]').boundingBox())!;
    const card = (await page.locator(INSET).boundingBox())!;

    expect(scrim.x).toBeGreaterThanOrEqual(card.x - 1);
    expect(scrim.width).toBeLessThanOrEqual(card.width + 1);
    expect(scrim.height).toBeLessThanOrEqual(card.height + 1);
  });

  /**
   * How wide, which is the other half of "opens inside the card" and is the
   * half only a browser can answer.
   *
   * `sheet.test.tsx` pins which class each size asks for. Whether `w-[60%]`
   * resolves to 60% *of the card* rather than of the window is a question
   * about which box the percentage is measured against, and that depends on
   * the `absolute` swap being in effect — exactly what jsdom cannot see, since
   * it reports every box as zero and lays nothing out.
   *
   * The margin is 2 percentage points. `min-w-*` is a floor and would lift a
   * narrow card's drawer off its percentage, so this asserts the card is wide
   * enough for the floor to be inactive first; otherwise a failure here would
   * be ambiguous between "the size is wrong" and "the viewport is small".
   */
  test('takes its width as a share of the card, not of the window', async ({ page }) => {
    await page.goto('/preview/shell-drawer');
    await page.getByRole('button', { name: 'Open Definitions and Interpretation' }).click();

    const panel = await settledPanel(page);
    const card = (await page.locator(INSET).boundingBox())!;
    const viewport = page.viewportSize()!;

    // The clause drawer is `size="md"`, whose floor is md (28rem = 448px).
    // Above that the percentage governs, which is what makes the ratio the
    // thing under test. This guard is also how the floor was caught being set
    // too high, twice: at `min-w-2xl` the card's 60% fell *under* the floor, so
    // the drawer was 672px and the share meant nothing, and `min-w-lg` would
    // have done the same when the share came down to 48%.
    expect(card.width * 0.48).toBeGreaterThan(448);

    const share = (panel.width / card.width) * 100;
    expect(share).toBeGreaterThan(46);
    expect(share).toBeLessThan(50);

    // And the reason it is a share of the card at all: measured against the
    // window it would be a different number, or the card would be the window.
    expect(card.width).toBeLessThan(viewport.width);
  });

  /**
   * The narrow size, on the drawer that has always been narrow. Its floor is
   * `min-w-sm` (24rem), which is what the feed used to get as a fixed maximum,
   * so this is also the check that the percentage never made it *worse* than
   * the width it replaced.
   */
  test('gives the notification feed the narrow share, never under its floor', async ({ page }) => {
    await page.goto('/preview/shell');
    await page.getByRole('button', { name: /notifications/i }).click();

    const panel = await settledPanel(page);
    const card = (await page.locator(INSET).boundingBox())!;

    expect(panel.width).toBeGreaterThanOrEqual(384);
    expect(panel.width).toBeLessThan(card.width * 0.5);
  });
});

/**
 * The pager's number box, on a table, which is the surface that did not have
 * one. `pagination.test.tsx` owns the behaviour; this asserts the control is on
 * the page at all, since the whole failure was that it existed in exactly one
 * place and nobody could see the difference from inside either one.
 */
test('a table pager carries the go-to-page box', async ({ page }) => {
  // `?long=1`, because the box only appears once there are pages to hide: a
  // short list shows every page as its own button and needs no way to type one.
  await page.goto('/preview/record-table?long=1');

  const box = page.getByRole('textbox', { name: /go to page/i });
  await expect(box).toBeVisible();

  // A page well outside the window, which is the whole point of typing one: it
  // is the move the numbers cannot offer, because that page is not on screen.
  await box.fill('12');
  await box.press('Enter');

  await expect(page.getByRole('button', { name: 'Page 12 of records' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

/**
 * The footer's two rules, which are both computed values jsdom cannot see: it
 * resolves no stylesheet, so a class name is all a unit test can check and a
 * class name is not a colour.
 *
 * The box is **one shade** off the band (`docs/design.md` §2.10), and what that
 * means depends on the theme, which is why it is a token rather than a literal.
 * In light the footer is slate-50 and the box slate-100, so the box is darker.
 * In dark the footer is slate-950, the ramp's floor, and the box is slate-900:
 * one shade *up*, because there is nothing below the floor. Both are checked,
 * because writing only the light one is how a token gets nudged in one theme
 * with nobody looking at the other.
 *
 * **It is measured against the container it sits in**, which is what changed
 * when the box moved inside the pager. Asserting against the footer band still
 * passed afterwards, because the numbers happened to stay in range: a test
 * measuring the wrong pair can be right by luck, and this one was.
 *
 * The *direction* is the load-bearing half. Everything else filled in this
 * control steps up from the container; the box steps down, because it is the
 * one thing you type into rather than press.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`the pager's box is one shade off its band in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/preview/record-table?long=1');

    const box = page.getByRole('textbox', { name: /go to page/i });
    await expect(box).toBeVisible();

    const { boxL, containerL, inside, padRight, padLeft } = await box.evaluate((el) => {
      const container = el.closest('[data-slot="page-runs"]') as HTMLElement | null;
      const footer = el.closest('div[class*="min-h-11"]') as HTMLElement;
      const lightness = (c: string) => Number(/lab\(([-\d.]+)/.exec(c)?.[1] ?? NaN);
      const footerStyle = getComputedStyle(footer);
      return {
        boxL: lightness(getComputedStyle(el).backgroundColor),
        containerL: container
          ? lightness(getComputedStyle(container).backgroundColor)
          : NaN,
        inside: container !== null,
        padRight: footerStyle.paddingRight,
        padLeft: footerStyle.paddingLeft,
      };
    });

    // Filled at all: transparent would read as the counter beside it.
    expect(Number.isNaN(boxL)).toBe(false);

    // In the pager's container, not floating beside it. It is part of the
    // control and moves with it.
    expect(inside).toBe(true);

    /*
      One shade *down* from the container, in both themes, and the direction is
      the assertion rather than a detail. Everything else filled in this control
      steps up (the active page, a hovered one), because a pill is lifted off a
      surface. The box is the one thing you type into rather than press, so it
      is a well sunk into it. `--hover` is the token that means that step in
      whichever direction the theme needs (slate-200 in light, slate-950 in
      dark), which is why a literal "darker" cannot be written here: slate-950
      is the ramp's floor and has nothing below it.
    */
    expect(boxL).toBeLessThan(containerL);
    expect(Math.abs(boxL - containerL)).toBeGreaterThan(1);

    // And the footer's own asymmetry, measured rather than read off a class.
    expect(padRight).toBe('8px');
    expect(padLeft).toBe('36px');
  });
}

/**
 * The pager's three tiers, measured, in both themes.
 *
 * The numbers are a tab group: a trough on the footer band, and the page you
 * are on raised on the trough (`docs/design.md` §2.10). That is three surfaces
 * that must stay distinguishable, and **the first version of this shipped with
 * two of them identical**: `--raised` and `--muted` are the same ramp step in
 * dark, so a pill on the tab list's own `bg-muted` trough had a lightness delta
 * of exactly 0.0 and the active page was invisible but for its border. jsdom
 * resolves no stylesheet, so nothing short of a browser could have caught it.
 *
 * The direction differs per theme and that is correct rather than sloppy: light
 * steps *down* the ramp to raise (the app's own tab group does the same), dark
 * steps *up*, because slate-950 is the floor. What is asserted is that each
 * tier is distinct from the one behind it, not which way it moved.
 *
 * **The pill is allowed to be carried by its border, and that is why this
 * asserts fill *or* stroke rather than a lightness floor.** `--card` and
 * `--sidebar-field` are both slate-900 in dark, so the active page's fill
 * separates by 0.0 there and only the border and shadow say which page you are
 * on (§2.10, recorded as a deliberate compromise). An earlier version of this
 * test demanded a fill delta above 3, which was true of the arrangement it was
 * written against and would now fail correct code. What must never happen is
 * the active page having *neither*: same fill and no stroke is the invisible
 * pill this file exists to catch.
 */
for (const theme of ['light', 'dark'] as const) {
  test(`the pager's pill reads as raised in ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/preview/record-table?long=1');

    const lightness = (colour: string) =>
      Number(/lab\(([-\d.]+)/.exec(colour)?.[1] ?? NaN);

    const trough = lightness(
      await page
        .locator('[data-slot="page-runs"]')
        .evaluate((el) => getComputedStyle(el).backgroundColor),
    );
    const pill = await page.locator('[aria-current="page"]').evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        fill: style.backgroundColor,
        borderColour: style.borderTopColor,
        borderWidth: parseFloat(style.borderTopWidth),
      };
    });
    const band = lightness(
      await page.locator('[data-slot="pagination"]').evaluate((el) => {
        const footer = el.closest('div[class*="min-h-11"]') as HTMLElement;
        return getComputedStyle(footer).backgroundColor;
      }),
    );

    for (const value of [band, trough]) expect(Number.isNaN(value)).toBe(false);

    // The container is clear of the band it sits in. The floor is deliberately
    // low: what is ruled out is two surfaces resolving to one value.
    expect(Math.abs(trough - band)).toBeGreaterThan(1);

    // The active page is separated from the container by its fill, its stroke,
    // or both. A stroke counts only while it is actually painted: a
    // `border-transparent` at 1px is a border that draws nothing.
    const fillDelta = Math.abs(lightness(pill.fill) - trough);
    const stroked =
      pill.borderWidth > 0 && !/^rgba\(.*,\s*0\)$/.test(pill.borderColour);
    expect(fillDelta > 1 || stroked).toBe(true);
  });
}
