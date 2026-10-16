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

    /*
      Wait for the clock to have *read* the time, not merely to exist.

      `Clock` holds `now` as null until its first effect runs and renders an
      empty placeholder span until then — same classes, no content, and so no
      box at all. `span.first()` matches that placeholder perfectly well, and
      `boundingBox()` then returns null and this test dies on "element has no
      box" rather than on anything about alignment.

      It is a race that was always here and only surfaced when the profile
      switcher left this band and the header began hydrating sooner. Waiting on
      the text is waiting on the state that gives the span its box.
    */
    await expect(clock).toContainText(/\d/);

    const [clockMid, ruleMid, bellMid] = await Promise.all([
      midOf(clock),
      midOf(rule),
      midOf(bell),
    ]);

    // Half a pixel of slack, no more: the miss this guards was six.
    expect(Math.abs(ruleMid - clockMid)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(ruleMid - bellMid)).toBeLessThanOrEqual(0.5);
  });

  /**
   * The trail starts exactly where the inset card starts.
   *
   * **This test guarded the search field's centring until 18 September 2026**,
   * through two reversals: centred on the viewport so the nav could not slide
   * it, then centred on the card so it would not sit off-centre above the
   * surface it searches. Search then moved into the nav rail entirely, taking
   * both questions with it, and the trail took its place in this band. The
   * shape of the test is kept because the reasoning transfers exactly.
   *
   * Three states, for the reason the centring version had them: the bug is in
   * the *relationship* rather than in any one width, and a box aligned against
   * the wrong ancestor is exactly right at whichever width the layout happened
   * to be tuned at. Collapsing moves the card ~94px and dragging moves it
   * another 90, so either one separates two edges that agree at rest.
   *
   * It caught a real error on the way in: `pl-2` looked obviously right, since
   * the band is `pl-2` and the card is `m-2`, and it put the trail 8px past the
   * card's edge. The band and the card are siblings in one column, so their
   * paddings start from the same origin and already agree.
   */
  test('keeps the trail aligned to the inset card whatever the nav is doing', async ({
    page,
  }) => {
    const trail = page.getByRole('navigation', { name: /breadcrumb/i });
    const inset = page.locator('[data-slot="shell-inset"]');

    const leftOf = async (locator: Locator) => {
      const box = await locator.boundingBox();
      if (!box) throw new Error('element has no box');
      return box.x;
    };
    /** Both left edges, once the card has stopped moving. */
    const settled = async () => {
      // The nav animates width over 200ms and the card is the flex remainder,
      // so a reading taken too early catches an intermediate frame: an earlier
      // draft of this failed 7.7px short of the resting place, against a claim
      // that holds at both ends.
      let last = -1;
      for (let i = 0; i < 20; i++) {
        const card = await leftOf(inset);
        if (Math.round(card) === Math.round(last)) return { card, crumbs: await leftOf(trail) };
        last = card;
        await page.waitForTimeout(60);
      }
      throw new Error('the card never settled');
    };

    const open = await settled();
    expect(Math.abs(open.crumbs - open.card)).toBeLessThanOrEqual(1);

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    const collapsed = await settled();
    expect(Math.abs(collapsed.crumbs - collapsed.card)).toBeLessThanOrEqual(1);
    // It really moved. A trail pinned to the window, or to the band's own
    // padding rather than the card, would be sitting where it started and
    // every equality above would still hold.
    expect(Math.abs(collapsed.crumbs - open.crumbs)).toBeGreaterThan(20);

    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await settled();
    const handle = await page.getByRole('separator', { name: 'Resize sidebar' }).boundingBox();
    if (!handle) throw new Error('element has no box');
    await page.mouse.move(handle.x + 3, 300);
    await page.mouse.down();
    await page.mouse.move(handle.x + 3 + 90, 300);
    await page.mouse.up();

    const dragged = await settled();
    expect(Math.abs(dragged.crumbs - dragged.card)).toBeLessThanOrEqual(1);
    expect(Math.abs(dragged.crumbs - open.crumbs)).toBeGreaterThan(20);
  });

  /**
   * The back arrow says where it goes, on hover.
   *
   * Here rather than in Jest because a tooltip only exists once a real pointer
   * has rested on the trigger for the delay: jsdom has no hover and no timers
   * worth trusting for it, so `AdminHeader.test.tsx` can pin the `aria-label`
   * and nothing else.
   *
   * It matters because a document page carries **two** back controls, this one
   * leaving for the list and the editor's own stepping through the flow. The
   * word is what separates them, so a tooltip that silently stopped opening
   * would put the app back where it started with no visible breakage.
   *
   * `[data-slot=tooltip-content]`, not `[role=tooltip]`: Base UI's trigger
   * carries `aria-haspopup="dialog"` and the panel is not given the tooltip
   * role. A check written the obvious way finds nothing and reads as a missing
   * tooltip, which is exactly what it did on the first pass here.
   */
  test('says where back goes, on hover', async ({ page }) => {
    // By its label, not its role: back is a link wherever nothing can be lost
    // and a dialog's button only on a document editor (`AdminHeader`).
    const back = page.locator('header[data-print-hidden]').getByLabel(/^Back to /);
    await expect(back).toHaveAttribute('aria-label', /^Back to /);

    await back.hover();
    const tip = page.locator('[data-slot="tooltip-content"]');
    await expect(tip).toBeVisible();

    // The tooltip names the destination and the label keeps its verb (§1.5),
    // so the two agree without being the same string.
    const destination = (await tip.textContent())?.trim();
    expect(destination).toBeTruthy();
    await expect(back).toHaveAttribute('aria-label', `Back to ${destination}`);
  });

  test('puts the bell last, after the date and time', async ({ page }) => {
    const end = page.locator('[data-slot="top-panel-end"]');
    const rule = await end.locator('[data-slot="separator"]').boundingBox();
    const bell = await end.getByRole('button', { name: /notifications/i }).boundingBox();
    if (!rule || !bell) throw new Error('element has no box');

    expect(bell.x).toBeGreaterThan(rule.x);
  });

});
