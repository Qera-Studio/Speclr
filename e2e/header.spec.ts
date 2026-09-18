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
    const back = page.locator('header[data-print-hidden] button').first();
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

/**
 * The nav rail's hover fill is one surface that moves between rows, the same
 * magic move the popups use (`ui/magic-move.tsx`, `docs/design.md` §1.7a).
 *
 * The rail is the case with a second fill to protect. Hover and active are
 * deliberately different colours (`globals.css`), and the active one says
 * which page you are on, so it must **not** travel with the pointer: a
 * highlight that did would take "you are here" with it the moment the cursor
 * rested anywhere else. Both halves are asserted here, because a version that
 * moved beautifully and dragged the active fill along would look right in
 * isolation and be wrong in use.
 */
test.describe('the nav rail follows the pointer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/shell');
    await expect(page.getByRole('navigation', { name: 'Client navigation' })).toBeVisible();
  });

  const ROWS = 'nav[aria-label="Client navigation"] [data-slot="sidebar-menu-button"]';
  const FILL = 'nav[aria-label="Client navigation"] [data-slot="magic-move"]';

  /**
   * Distinct positions sampled per frame: a jump gives two, a real 200ms
   * transition gives twenty or more. Both ends are identical either way, which
   * is why the frames in between are the assertion.
   *
   * **The move is dispatched, not hovered**, and that is the difference
   * between a test that measures the transition and one that measures the
   * mouse. Playwright's `hover` walks the pointer to the target, so it crosses
   * every row in between and the fill lands on each one in turn: that produces
   * a dozen distinct positions with transitions *switched off*, and an earlier
   * version of this test passed happily against `transition: none`. One
   * synthetic `pointerover` on the far row moves the fill in a single step, so
   * every intermediate position sampled after it can only have come from the
   * transition.
   */
  test('slides its hover fill rather than repainting each row', async ({ page }) => {
    const rows = page.locator(ROWS);
    await rows.nth(0).hover();
    await page.waitForTimeout(400);

    const steps = await page.evaluate(
      ([fillSel, rowSel]) => {
        const el = document.querySelector(fillSel);
        const target = document.querySelectorAll(rowSel)[4];
        if (!el || !target) throw new Error('no fill or row');
        const seen: string[] = [];
        return new Promise<number>((resolve) => {
          let n = 0;
          const tick = () => {
            seen.push(getComputedStyle(el).transform);
            if (++n < 40) requestAnimationFrame(tick);
            else resolve(new Set(seen).size);
          };
          requestAnimationFrame(tick);
          target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        });
      },
      [FILL, ROWS] as const,
    );

    expect(steps).toBeGreaterThanOrEqual(10);
  });

  test('lands its fill exactly on the row under the pointer', async ({ page }) => {
    const row = page.locator(ROWS).nth(2);
    await row.hover();
    await page.waitForTimeout(400);

    const fill = await page.locator(FILL).boundingBox();
    const target = await row.boundingBox();
    if (!fill || !target) throw new Error('element has no box');

    expect(Math.abs(fill.y - target.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.height - target.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.x - target.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.width - target.width)).toBeLessThanOrEqual(1);
  });

  /**
   * No row on this fixture is a live destination, so the current-page mark is
   * applied by hand. That is honest for what is being tested: the question is
   * whether the *moving* fill leaves an active row's own fill alone, not how
   * the rail decides which row is active.
   */
  test('leaves the current page lit while the fill travels away from it', async ({ page }) => {
    await page.evaluate((sel) => {
      const rows = document.querySelectorAll(sel);
      rows[1].setAttribute('data-active', 'true');
    }, ROWS);

    const active = page.locator(ROWS).nth(1);
    const before = await active.evaluate((el) => getComputedStyle(el).backgroundColor);
    const activeBox = await active.boundingBox();

    await page.locator(ROWS).nth(4).hover();
    await page.waitForTimeout(400);

    const after = await active.evaluate((el) => getComputedStyle(el).backgroundColor);
    const stillThere = await active.boundingBox();
    const fill = await page.locator(FILL).boundingBox();
    if (!activeBox || !stillThere || !fill) throw new Error('element has no box');

    // The active row is unchanged, and the moving fill is somewhere else.
    expect(after).toBe(before);
    expect(stillThere.y).toBeCloseTo(activeBox.y, 0);
    expect(Math.abs(fill.y - activeBox.y)).toBeGreaterThan(20);
  });

  /**
   * And the two fills are different colours, which is the other half of the
   * same rule. `--sidebar-hover` and `--sidebar-active` are one step apart on
   * the slate ramp deliberately (`globals.css` says so, and says they move as
   * a pair): if the travelling fill were painted in the active colour, every
   * row it passed over would claim to be the current page. The previous test
   * does not catch that on its own, because the active row's own fill really
   * is untouched in that version.
   */
  test('and paints itself in the hover colour, not the active one', async ({ page }) => {
    await page.evaluate((sel) => {
      document.querySelectorAll(sel)[1].setAttribute('data-active', 'true');
    }, ROWS);

    await page.locator(ROWS).nth(4).hover();
    await page.waitForTimeout(400);

    const moving = await page.locator(FILL).evaluate((el) => getComputedStyle(el).backgroundColor);
    const active = await page
      .locator(ROWS)
      .nth(1)
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(moving).not.toBe(active);
  });

  /**
   * The case the two tests above both miss, because both move the pointer
   * *away* from the active row.
   *
   * Pointing at the page you are already on used to make the row paler. The
   * rule that strips the rail's hover fill is unconditional, so it took the
   * active row's `--sidebar-active` with it, and what showed through was the
   * travelling `--sidebar-hover` one step lighter: measured at L 90.9 idle
   * against L 95.6 hovered. "You are here" being overruled by "you are
   * pointing here" is the wrong way round, and it reads as a glitch rather
   * than as a state.
   *
   * Asserted as an exact colour match against the idle row rather than as
   * "not the hover colour", because the failure was a specific substitution
   * and any other substitution would be the same bug.
   */
  test('holds the current page lit while the pointer rests on it', async ({ page }) => {
    await page.evaluate((sel) => {
      document.querySelectorAll(sel)[1].setAttribute('data-active', 'true');
    }, ROWS);

    const active = page.locator(ROWS).nth(1);
    const idle = await active.evaluate((el) => getComputedStyle(el).backgroundColor);

    await active.hover();
    await page.waitForTimeout(400);

    expect(await active.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(idle);
    // And the exemption is the active row's alone: a plain row still carries
    // no fill of its own, or the moving one would have nothing to be.
    expect(
      await page.locator(ROWS).nth(3).evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe('rgba(0, 0, 0, 0)');
  });

  /**
   * And it does not merely survive a rest: the fill crossing it changes
   * nothing either, because `-z-10` puts the fill behind a row that paints an
   * opaque background of its own.
   *
   * Screenshots, which is heavier than the rest of this file and is what the
   * question costs. Two cheaper versions were written and both proved nothing:
   * sampling the row's own `backgroundColor` reads the same string whatever
   * covers it, and `elementFromPoint` cannot see the fill at all, because the
   * fill is `pointer-events: none`. Neither failed with the fill raised to
   * `z-20`. Only the painted pixel can tell "behind" from "in front".
   *
   * Sampled at three points across the move rather than every frame, for the
   * same reason: a screenshot per frame would make this the slowest test in
   * the suite to answer a question that does not need that resolution.
   */
  test('does not flicker the current page as the fill crosses it', async ({ page }) => {
    await page.evaluate((sel) => {
      document.querySelectorAll(sel)[3].setAttribute('data-active', 'true');
    }, ROWS);

    await page.locator(ROWS).nth(0).hover();
    await page.waitForTimeout(300);

    const active = page.locator(ROWS).nth(3);
    const idle = await active.screenshot();

    await page.evaluate((sel) => {
      document.querySelectorAll(sel)[6].dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true }),
      );
    }, ROWS);

    // Twice through the 200ms move, once after it has landed.
    for (const gap of [60, 70, 270]) {
      await page.waitForTimeout(gap);
      expect((await active.screenshot()).equals(idle)).toBe(true);
    }
  });

  test('takes the fill away when the pointer leaves the rail', async ({ page }) => {
    await page.locator(ROWS).nth(1).hover();
    await page.waitForTimeout(350);
    expect(await page.locator(FILL).evaluate((el) => getComputedStyle(el).opacity)).toBe('1');

    await page.mouse.move(900, 400);
    await page.waitForTimeout(350);
    expect(await page.locator(FILL).evaluate((el) => getComputedStyle(el).opacity)).toBe('0');
  });

  /**
   * Hovering a row moves the fill and changes nothing else.
   *
   * The primitive darkens a hovered row's text from `--sidebar-foreground` to
   * `--sidebar-accent-foreground`, which in light mode is slate-600 to
   * slate-900: a measured drop from L 33.7 to L 5.0, near enough to black.
   * That reads as pressed rather than pointed at, and it says a second time
   * what the fill already says.
   *
   * The active row is asserted too. Its text was the one that *did* change
   * under the pointer, which is backwards: darkening on hover says "hovered",
   * not "current". Worth knowing when reading this: the primitive's
   * `data-active:text-*` and `data-active:font-medium` never reach this rail
   * at all, because `MenuLink` passes `text-sm` and `cn` drops the conflicting
   * utilities on merge. An active row here is its fill, and only its fill.
   */
  test('does not darken a row it is merely pointing at', async ({ page }) => {
    const rows = page.locator(ROWS);
    const colourOf = (i: number) =>
      rows.nth(i).evaluate((el) => getComputedStyle(el).color);

    const plainRest = await colourOf(2);
    await rows.nth(2).hover();
    await page.waitForTimeout(300);
    expect(await colourOf(2)).toBe(plainRest);

    // And the same for the current page, which used to be the one row whose
    // text moved under the pointer.
    await page.evaluate((sel) => {
      document.querySelectorAll(sel)[5].setAttribute('data-active', 'true');
    }, ROWS);
    const activeRest = await colourOf(5);
    await rows.nth(5).hover();
    await page.waitForTimeout(300);
    expect(await colourOf(5)).toBe(activeRest);
  });

  /**
   * The rows are 8px apart, and that 8px is padding rather than a gap.
   *
   * The distinction is the whole test, and the spacing is deliberately the
   * same 8px the rail always had. `SidebarMenu`'s `gap-[8px]` put a *hole*
   * between each row: the fill spent a third of every one-row move over dead
   * space and read as a block jumping rather than a surface sliding. Moving
   * that same distance inside the items keeps the look and removes the hole.
   *
   * So both are asserted: 8px of visible ground between rows, and zero
   * between the items the fill travels along. The original `gap-[8px]` passes
   * the first and fails the second, which is the point.
   */
  test('spaces its rows without leaving a hole for the fill to cross', async ({ page }) => {
    const geometry = await page.evaluate((rowSel) => {
      const nav = document.querySelector('nav[aria-label="Client navigation"]');
      if (!nav) throw new Error('no rail');
      const rows = [...nav.querySelectorAll(rowSel)].map((el) => el.getBoundingClientRect());
      const items = [...nav.querySelectorAll('[data-slot="sidebar-menu-item"]')].map((el) =>
        el.getBoundingClientRect(),
      );
      const between = (boxes: DOMRect[]) =>
        boxes.slice(1).map((b, i) => Math.round(b.top - (boxes[i].top + boxes[i].height)));
      return {
        rowHeight: Math.round(rows[0].height),
        visible: between(rows),
        items: between(items),
      };
    }, ROWS);

    // 32px rows, the primitive's own height.
    expect(geometry.rowHeight).toBe(32);
    // 8px of ground between them, so the column reads as separate rows...
    expect(new Set(geometry.visible)).toEqual(new Set([8]));
    // ...but that 4px is padding inside the items, not a gap between them, so
    // the list itself is contiguous and the fill is never over a hole. This is
    // the half a plain `gap-1` would fail.
    expect(new Set(geometry.items)).toEqual(new Set([0]));
  });

  /**
   * The fill is over a row on every frame of a move, which is the point of the
   * rule above stated as behaviour rather than as geometry.
   */
  test('keeps the fill over a row for the whole of a move', async ({ page }) => {
    await page.locator(ROWS).nth(0).hover();
    await page.waitForTimeout(400);

    const strayFrames = await page.evaluate(
      ([fillSel, rowSel]) => {
        const nav = document.querySelector('nav[aria-label="Client navigation"]');
        if (!nav) throw new Error('no rail');
        const fill = nav.querySelector(fillSel);
        const items = [...nav.querySelectorAll('[data-slot="sidebar-menu-item"]')];
        const target = nav.querySelectorAll(rowSel)[4];
        if (!fill || !target) throw new Error('no fill or row');

        return new Promise<number>((resolve) => {
          let n = 0;
          let stray = 0;
          const tick = () => {
            const box = fill.getBoundingClientRect();
            const middle = box.top + box.height / 2;
            const overRow = items.some((el) => {
              const r = el.getBoundingClientRect();
              return middle >= r.top && middle <= r.bottom;
            });
            if (!overRow) stray += 1;
            if (++n < 40) requestAnimationFrame(tick);
            else resolve(stray);
          };
          requestAnimationFrame(tick);
          target.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        });
      },
      [FILL, ROWS] as const,
    );

    expect(strayFrames).toBe(0);
  });

  /**
   * A row's hint waits half a second before appearing.
   *
   * A *delay*, not a slower fade: the 75ms State-tier transition is unchanged
   * and only its start moves. It exists because the fill now follows the
   * pointer down the whole column, so running past six rows used to flash a
   * chevron on each. Leaving is immediate, or a hint would linger over a row
   * the pointer had already left.
   */
  test('holds a row hint back until the pointer settles', async ({ page }) => {
    const row = page.locator(ROWS).nth(0);
    const hint = row.locator('svg').last();

    const read = () =>
      hint.evaluate((el) => ({
        delay: getComputedStyle(el).transitionDelay,
        duration: getComputedStyle(el).transitionDuration,
        opacity: getComputedStyle(el).opacity,
      }));

    expect((await read()).opacity).toBe('0');

    await row.hover();
    // Well past the fade, well short of the delay.
    await page.waitForTimeout(200);
    const early = await read();
    expect(early.opacity).toBe('0');
    expect(early.delay).toBe('0.5s');
    // The fade itself is untouched.
    expect(early.duration).toBe('0.075s');

    await page.waitForTimeout(500);
    expect((await read()).opacity).toBe('1');

    // Gone on the way out, with no delay of its own.
    await page.mouse.move(900, 400);
    await page.waitForTimeout(200);
    const gone = await read();
    expect(gone.opacity).toBe('0');
    expect(gone.delay).toBe('0s');
  });

  /**
   * And exactly one thing is lit at a time. The rows' own `hover:bg-*` has to
   * come off, or the primitive paints the hovered row instantly underneath the
   * fill that is still travelling towards it, and for those 200ms two rows
   * claim the pointer. The suppression is scoped to this list rather than done
   * in `ui/sidebar.tsx`, because the editor rail and the mobile sheet still use
   * the primitive's own hover.
   */
  test('never lights two rows at once while the fill is in flight', async ({ page }) => {
    const rows = page.locator(ROWS);
    await rows.nth(0).hover();
    await page.waitForTimeout(400);

    // Sampled 60ms in, while a 200ms move is still under way.
    const painted = await page.evaluate(
      ([rowSel]) => {
        const all = [...document.querySelectorAll(rowSel)];
        all[4].dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        return new Promise<number>((resolve) => {
          setTimeout(() => {
            resolve(
              all.filter(
                (el) => getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)',
              ).length,
            );
          }, 60);
        });
      },
      [ROWS] as const,
    );

    expect(painted).toBe(0);
  });
});
