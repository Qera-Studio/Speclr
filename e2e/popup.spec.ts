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

  /**
   * The calendar keeps the gap rule and is **exempt from the width rule**,
   * which is the one deliberate exception in `popup.ts`.
   *
   * A month grid is sized by its seven columns of numbers, so a full-width
   * date field would stretch the same 28 numbers across the page. The
   * assertion is therefore that it stays its own size rather than that it
   * matches: it must not collapse to nothing, and it must not have been
   * stretched to the field.
   */
  test('the calendar clears its date field and keeps its own width', async ({ page }) => {
    await page.locator('[data-slot="date-picker-trigger"]').click();
    const popup = page.locator('[data-slot="popover-content"]');
    await expect(popup).toBeVisible();

    const { gap } = await measure(page, 'date', popup);
    expect(gap).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gap).toBeLessThanOrEqual(MAX_GAP);

    // Wide enough to be a month grid, and not the stretched field. The floor
    // catches a collapse; the ceiling is what would go red if the width rule
    // were put back on this control.
    const box = await boxOf(popup);
    expect(box.width).toBeGreaterThan(200);
    expect(box.width).toBeLessThan(360);
  });

  /**
   * The field matches the calendar, rather than the calendar matching the
   * field. See `CALENDAR_WIDTH` / `CALENDAR_FIELD_WIDTH`: a grid cannot be
   * stretched to a full-width field without spreading 28 numbers over more
   * page, so the field is what gives way.
   *
   * Measured rather than asserted as a class, and that is the point of having
   * it here. The first two attempts at this were classes that *rendered* and
   * did nothing: `w-[calc(7*2rem+1rem)]`, which Tailwind will not generate a
   * rule for, and then `w-60`, which `Field`'s `*:w-full` outranks. Both left
   * the markup looking correct and the field 264px wide.
   */
  test('the date field is exactly as wide as the calendar it opens', async ({ page }) => {
    const trigger = page.locator('[data-slot="date-picker-trigger"]');
    const field = await boxOf(trigger);

    await trigger.click();
    const popup = page.locator('[data-slot="popover-content"]');
    await expect(popup).toBeVisible();
    const calendar = await boxOf(popup);

    expect(Math.abs(calendar.width - field.width)).toBeLessThan(1);
    // And they start at the same edge, or equal widths would still look wrong.
    expect(Math.abs(calendar.x - field.x)).toBeLessThan(1);
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

/**
 * The highlight behind the active row is one surface that slides, not a fill
 * painted on whichever row is under the pointer.
 *
 * Here rather than in Jest for the usual reason and one more. jsdom gives
 * every box a width and height of zero, so there is no position to measure and
 * nothing to interpolate between; it also runs no compositor, so a transition
 * that never starts looks exactly like one that finishes instantly.
 *
 * **The assertion is the frames in between, not the endpoints.** Both ends are
 * identical whether the highlight glides or jumps, which is the whole reason
 * this bug survived being looked at: the class said `duration-200`, the
 * computed style agreed, and the element still arrived in a single frame.
 * Three separate causes were found that way, each invisible from the endpoints
 * — a ref read during render leaving the transition class one move stale, a
 * `translate` value the browser normalises to a non-interpolable shape, and
 * the class being dropped for the one frame a select has no row marked.
 */
const magicMoveSteps = async (page: Page, popup: string, rows: string, from: number, to: number) => {
  await page.locator(`${popup} ${rows}`).nth(from).hover();
  await page.waitForTimeout(400);

  /*
    The recorder runs until the highlight has *arrived and stopped*, rather
    than for a fixed number of frames.

    It counted 30 frames from whenever it was installed, and the round trip to
    move the pointer afterwards could, under five competing workers, take long
    enough that the transition began after those frames were spent: zero
    distinct positions recorded, and a failure that never reproduced in
    isolation. That is a test measuring the harness rather than the page.

    Waiting for the value to settle instead is immune to when the move starts.
    The pointer is still moved by a real `hover`, because a synthetic
    `pointerover` does not mark a row in Base UI's select or combobox: they
    track the pointer internally, unlike the nav rail, whose handler is ours.
  */
  await page.evaluate((sel) => {
    const el = document.querySelector(`${sel} [data-slot="magic-move"]`);
    if (!el) throw new Error('no highlight');
    const seen: string[] = [];
    const store = window as unknown as { __magicMove: string[]; __magicMoveDone: boolean };
    store.__magicMove = seen;
    store.__magicMoveDone = false;

    let unchanged = 0;
    const tick = () => {
      const now = getComputedStyle(el).transform;
      const last = seen[seen.length - 1];
      seen.push(now);
      // Ten consecutive identical frames means it has arrived and stopped.
      unchanged = now === last ? unchanged + 1 : 0;
      if (unchanged >= 10 && seen.length > 12) store.__magicMoveDone = true;
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, popup);

  await page.locator(`${popup} ${rows}`).nth(to).hover();
  await page.waitForFunction(
    () => (window as unknown as { __magicMoveDone: boolean }).__magicMoveDone,
    undefined,
    { timeout: 5000 },
  );
  const frames = await page.evaluate(
    () => (window as unknown as { __magicMove: string[] }).__magicMove,
  );
  return new Set(frames).size;
};

test.describe('the highlight glides between rows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/popups');
    /*
      Wait for the controls to be *interactive*, not merely present.

      `goto` resolves on load, before React has hydrated, and a click that
      lands in that window reaches a trigger with no handler attached yet: the
      popup never opens and the test dies on `toBeVisible` rather than on
      anything it is about. It failed roughly one full-suite run in three with
      five workers competing for the dev server, and never in isolation, which
      is the signature of a hydration race rather than a bug in the page.

      Waiting for a trigger to report itself enabled is waiting for the state
      that makes a click mean something.
    */
    await expect(page.getByRole('combobox').first()).toBeEnabled();
  });

  /**
   * More than a handful of distinct positions is the whole assertion: a jump
   * produces exactly two (where it was, where it went), and every genuine
   * 200ms transition sampled per frame produces twenty or more. Ten is well
   * clear of both, so this neither flakes on a slow frame nor passes on a
   * snap.
   */
  const MIN_STEPS = 10;

  test('a select slides its highlight rather than repainting it', async ({ page }) => {
    await page.getByRole('combobox').nth(1).click();
    await expect(page.locator('[data-slot="select-content"]')).toBeVisible();
    const steps = await magicMoveSteps(page, '[data-slot="select-content"]', '[role="option"]', 0, 1);
    expect(steps).toBeGreaterThanOrEqual(MIN_STEPS);
  });

  test('a combobox does too', async ({ page }) => {
    await page.getByRole('combobox').first().click();
    await expect(page.locator('[data-slot="combobox-content"]')).toBeVisible();
    const steps = await magicMoveSteps(page, '[data-slot="combobox-content"]', '[role="option"]', 0, 2);
    expect(steps).toBeGreaterThanOrEqual(MIN_STEPS);
  });

  /**
   * The menu is the one that cannot be found by looking for `data-highlighted`:
   * Base UI marks a menu's active row by moving DOM focus and flipping
   * `tabindex`, and sets that attribute only on a select and a combobox. An
   * earlier cut of the hook matched the attribute alone and so did nothing at
   * all in every menu in the app while passing every other check.
   */
  test('and so does a menu, which marks its rows differently', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    const menu = page.locator('[data-slot="dropdown-menu-content"]');
    await expect(menu).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const el = document.querySelector(
        '[data-slot="dropdown-menu-content"] [data-slot="magic-move"]',
      );
      if (!el) throw new Error('no highlight');
      const seen: string[] = [];
      (window as unknown as { __magicMove: string[] }).__magicMove = seen;
      let n = 0;
      const tick = () => {
        seen.push(getComputedStyle(el).transform);
        if (++n < 30) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(700);
    const frames = await page.evaluate(
      () => (window as unknown as { __magicMove: string[] }).__magicMove,
    );
    expect(new Set(frames).size).toBeGreaterThanOrEqual(MIN_STEPS);
  });

  /**
   * Position, not just movement. A highlight that slides beautifully to the
   * wrong place is worse than one that does not move, and the three primitives
   * put their padding in three different places, so the box is measured rather
   * than assumed from the track's inset.
   */
  test('and it lands exactly on the row', async ({ page }) => {
    await page.getByRole('combobox').first().click();
    const popup = page.locator('[data-slot="combobox-content"]');
    await expect(popup).toBeVisible();

    const row = popup.locator('[role="option"]').nth(1);
    await row.hover();
    await page.waitForTimeout(400);

    const fill = await boxOf(popup.locator('[data-slot="magic-move"]'));
    const target = await boxOf(row);
    expect(Math.abs(fill.y - target.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.height - target.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.x - target.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.width - target.width)).toBeLessThanOrEqual(1);
  });
});

/**
 * The same highlight in the one place it is a **grid** rather than a column.
 *
 * Worth its own block because every other caller is a list of full-width rows,
 * where `left` and `width` never change and a fill that only tracked `top`
 * would pass every test above. Here a sideways move is the ordinary one: three
 * cards to a row, so the card next door is a horizontal journey and the card
 * below is a vertical one.
 *
 * `/preview/shell` rather than a fixture of its own: `AdminShell` mounts
 * `NewDocumentProvider`, so ⌘D opens the real palette with the real cards.
 */
test.describe('the new-document palette moves one fill across its grid', () => {
  const GRID = '[role="listbox"][aria-label="Document types"]';

  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/shell');
    // Hydration, for the reason the block above gives: ⌘D is a `keydown`
    // listener attached in an effect, so a press that lands before React has
    // hydrated opens nothing and the test dies on `toBeVisible`.
    // The rail's own create button, named exactly: the fixture's page header
    // carries a second button reading "New document", and the rail's is the one
    // that proves the shell itself is live.
    await expect(page.locator('[data-slot="sidebar-menu-button"]').first()).toBeEnabled();
    await page.keyboard.press('Meta+d');
    await expect(page.locator(GRID)).toBeVisible();
  });

  test('sideways, which is the move no column can test', async ({ page }) => {
    const steps = await magicMoveSteps(page, GRID, '[role="option"]', 0, 1);
    expect(steps).toBeGreaterThanOrEqual(10);
  });

  /**
   * And it lands on the card, in both axes. A fill that tracked only `top`
   * would glide beautifully down the first column while the pointer sat on the
   * third card of a row, which is precisely the bug a list of full-width rows
   * cannot surface.
   */
  test('and lands on the card it is pointing at, in both axes', async ({ page }) => {
    const grid = page.locator(GRID);
    // The third card: a different row *and* a different column from the first,
    // so a fill that ignored either axis misses it.
    const card = grid.locator('[role="option"]').nth(3);
    await card.hover();
    await page.waitForTimeout(400);

    const fill = await boxOf(grid.locator('[data-slot="magic-move"]'));
    const target = await boxOf(card);
    expect(Math.abs(fill.x - target.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.y - target.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.width - target.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(fill.height - target.height)).toBeLessThanOrEqual(1);
  });

  /**
   * And the grid it travels over scrolls smoothly when it has to.
   *
   * Five cards do not fit: the content is 607px in a 540px box, so the bottom
   * row is clipped by 51px and hovering a card there has to lift it into view.
   * Selecting a card focuses it, and a bare `.focus()` lets the browser scroll
   * the card into view *instantly*, measured at two distinct scroll positions,
   * 0 then 51, in a single frame. So the fill glided while the floor under it
   * jumped, which is the one thing a magic move cannot hide.
   *
   * Counted the same way the highlight is, and for the same reason: both ends
   * look identical whether it glides or snaps, so only the frames in between
   * say which happened.
   *
   * **`mouse.move`, never `hover()`**, and the first cut of this test got it
   * wrong. `hover()` scrolls its target into view before it moves the pointer,
   * so it performed the very scroll being measured, instantly, before the app
   * saw a pointer event at all: a UA-driven scroll with no JavaScript stack
   * behind it, which is how it was finally identified. The test failed against
   * a fix that worked. Parking the pointer on a visible card and moving it down
   * measures the app instead of the harness.
   */
  test('and the grid lifts a clipped row smoothly rather than snapping', async ({ page }) => {
    const grid = page.locator(GRID);
    // The fixture has to actually overflow, or this test proves nothing: a grid
    // that fits never scrolls and would pass while snapping.
    const overflows = await grid.evaluate((g) => g.scrollHeight > g.clientHeight + 8);
    expect(overflows).toBe(true);

    // Start on a card that is already fully in view, so the move down is the
    // only thing that can scroll.
    const from = (await grid.locator('[role="option"]').nth(1).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.waitForTimeout(300);
    expect(await grid.evaluate((g) => g.scrollTop)).toBe(0);

    await grid.evaluate((g) => {
      const seen: number[] = [];
      const store = window as unknown as { __scroll: number[]; __scrollDone: boolean };
      store.__scroll = seen;
      store.__scrollDone = false;
      let frames = 0;
      let unchanged = 0;
      let last: number | null = null;
      const tick = () => {
        const now = g.scrollTop;
        seen.push(now);
        unchanged = now === last ? unchanged + 1 : 0;
        last = now;
        // Bounded as well as settled: a scroll that never starts must end the
        // recording rather than hang until the timeout.
        if (++frames > 90 || (unchanged >= 12 && seen.length > 15)) store.__scrollDone = true;
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    // Aimed at the visible sliver of the clipped card, which is all a real
    // pointer could reach before the lift happens.
    const to = (await grid.locator('[role="option"]').nth(4).boundingBox())!;
    await page.mouse.move(to.x + to.width / 2, to.y + 20, { steps: 8 });
    await page.waitForFunction(
      () => (window as unknown as { __scrollDone: boolean }).__scrollDone,
      undefined,
      { timeout: 5000 },
    );

    const frames = await page.evaluate(
      () => (window as unknown as { __scroll: number[] }).__scroll,
    );
    // It must genuinely have travelled, and not in one step. A snap gives two
    // positions; a real scroll animation gives twenty or more.
    expect(frames[frames.length - 1]).toBeGreaterThan(frames[0]);
    expect(new Set(frames).size).toBeGreaterThanOrEqual(10);
  });

  /**
   * And somebody who asked not to be shown motion still gets there, instantly.
   *
   * WCAG 2.3.3. This needs its own test rather than riding on the blanket rule
   * in `globals.css`, and the reason is the gap it was written to close:
   * `scroll-behavior: auto !important` cannot reach a scroll whose behavior
   * comes from an **argument**, so `scrollIntoView({ behavior: 'smooth' })`
   * kept animating under `prefers-reduced-motion` while every CSS transition in
   * the app correctly stopped. Measured at 8 distinct positions before the fix.
   */
  test('and honours reduced motion by arriving at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const grid = page.locator(GRID);

    const from = (await grid.locator('[role="option"]').nth(1).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.waitForTimeout(300);

    await grid.evaluate((g) => {
      const seen: number[] = [];
      const store = window as unknown as { __rm: number[]; __rmDone: boolean };
      store.__rm = seen;
      store.__rmDone = false;
      let frames = 0;
      const tick = () => {
        seen.push(g.scrollTop);
        if (++frames > 40) store.__rmDone = true;
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    const to = (await grid.locator('[role="option"]').nth(4).boundingBox())!;
    await page.mouse.move(to.x + to.width / 2, to.y + 20, { steps: 8 });
    await page.waitForFunction(
      () => (window as unknown as { __rmDone: boolean }).__rmDone,
      undefined,
      { timeout: 5000 },
    );

    const frames = await page.evaluate(() => (window as unknown as { __rm: number[] }).__rm);
    // It still arrives, and the two positions are the arrival: where it was and
    // where it went, with nothing in between.
    expect(frames[frames.length - 1]).toBeGreaterThan(frames[0]);
    expect(new Set(frames).size).toBeLessThanOrEqual(2);
  });
});
