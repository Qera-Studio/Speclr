import { test, expect } from '@playwright/test';

/**
 * The table rules that only a browser can check (`docs/design.md` §2.3).
 *
 * Every list of records is a `RecordTable`, and the one thing it does that
 * jsdom cannot see is put a click target over a whole row. That target has
 * broken twice in this app, in opposite directions, and **both bugs passed
 * every unit test**, because jsdom does no hit-testing: it dispatches a click
 * at whatever element the query handed it.
 *
 * - Too small: a `relative` on a cell between the row and the overlay pins it
 *   to that column, so only the first cell was clickable. The shell fixture's
 *   own note records this happening to the documents list.
 * - Too big: no `relative` anywhere lets the overlay resolve against the card
 *   and cover every row, so a click on row 4 opened row 6.
 *
 * So these assert *which* record a click reaches, never that a click reached
 * something. The second bug is invisible to any test that only clicks row one.
 */
test.describe('a row that opens its record', () => {
  test('opens the record the pointer is actually over', async ({ page }) => {
    await page.goto('/preview/record-table');

    // The eighth row, not the first: an overlay that has escaped to the card
    // covers row one correctly and every row after it wrongly, so a test that
    // clicks the top row passes against the broken layout.
    const row = page.getByRole('row').nth(8);
    const link = row.getByRole('link').first();
    const href = await link.getAttribute('href');
    const box = (await row.boundingBox())!;

    // The middle of the row is over a cell a long way from the link's own.
    // `elementFromPoint` is the honest question: what would a click hit?
    const hit = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        return el?.closest('a')?.getAttribute('href') ?? null;
      },
      [box.x + box.width / 2, box.y + box.height / 2],
    );

    expect(hit).toBe(href);
  });

  test('covers the row it belongs to, and no more', async ({ page }) => {
    await page.goto('/preview/record-table');

    const row = page.getByRole('row').nth(8);
    const rowBox = (await row.boundingBox())!;

    /*
      Points across the row, inset by two pixels. Each has to hit *this* row's
      link, and a point just below it must not.

      Not the far left or the far right: those are the checkbox column and the
      actions column, both deliberately painted *above* the overlay so they can
      be clicked (`relative z-10` on the checkbox cell, DOM order on the
      actions one). Asserting either would pin the opposite of the rule, and
      the checkbox one is checked on its own below.

      Measuring the anchor's own `boundingBox()` does not work and is the trap
      this comment exists to record: it returns the text's box (49px wide), not
      the `::after` overlay stretched over the row, so it under-reports by an
      order of magnitude while the layout is perfectly correct. Hit-testing is
      the only honest measurement of a pseudo-element.
    */
    const corners = await page.evaluate(
      ([x, y, w, h]) => {
        const at = (px: number, py: number) =>
          document.elementFromPoint(px, py)?.closest('a')?.getAttribute('href') ?? null;
        return {
          // A quarter across: past the checkbox column, short of the actions.
          topLeft: at(x + w * 0.25, y + 2),
          bottomLeft: at(x + w * 0.25, y + h - 2),
          // Three quarters across: past every data cell, and short of the
          // actions column, which is *supposed* to sit above the overlay.
          middleRight: at(x + w * 0.75, y + h / 2),
          // Two pixels below the row: a different record, or the overlay has
          // escaped its row and covers the ones under it too.
          justBelow: at(x + w / 2, y + h + 2),
        };
      },
      [rowBox.x, rowBox.y, rowBox.width, rowBox.height],
    );

    const href = await row.getByRole('link').first().getAttribute('href');
    expect(corners.topLeft).toBe(href);
    expect(corners.bottomLeft).toBe(href);
    expect(corners.middleRight).toBe(href);
    expect(corners.justBelow).not.toBe(href);
  });

  /**
   * A row action has to win against the overlay underneath it. It does so by
   * being positioned *and* later in DOM order, which is a rule about the cell
   * rather than about the button, and therefore easy to lose.
   */
  test('lets a row action be clicked rather than the row', async ({ page }) => {
    await page.goto('/preview/record-table');

    const row = page.getByRole('row').nth(8);
    await row.hover();
    const action = row.getByRole('button').last();
    const box = (await action.boundingBox())!;

    const hit = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        // The row's overlay is an anchor; a row action is not inside one.
        return el?.closest('a') ? 'link' : 'action';
      },
      [box.x + box.width / 2, box.y + box.height / 2],
    );

    expect(hit).toBe('action');
  });
});

/**
 * The ten-row rule, measured rather than asserted from the source: a table
 * that imports `usePagedRows` and never renders a second page has the import
 * and not the behaviour.
 */
test('pages at ten rows', async ({ page }) => {
  await page.goto('/preview/record-table');

  // Ten rows plus the header.
  await expect(page.getByRole('row')).toHaveCount(11);
  await expect(page.getByText('1–10 of 14 records')).toBeVisible();

  // A 14-row list is two pages, so the pager lists both and shows no arrows:
  // every page is already one click away (`docs/design.md` §2.10).
  await page.getByRole('button', { name: 'Page 2 of records' }).click();

  await expect(page.getByRole('row')).toHaveCount(5);
  await expect(page.getByText('11–14 of 14 records')).toBeVisible();
});

/**
 * The checkbox column, which every table carries.
 *
 * Its cell has to paint *above* the row's overlay, or ticking a row opens it
 * instead: the overlay covers every cell, and the checkbox is the first one,
 * so DOM order alone loses (`relative z-10` in `BulkSelect`). That is the same
 * class of bug as the row target itself, and equally invisible to jsdom.
 */
test('ticks a row rather than opening it', async ({ page }) => {
  await page.goto('/preview/record-table');

  const row = page.getByRole('row').nth(8);
  const box = (await row.getByRole('checkbox').boundingBox())!;

  const hit = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest('a') ? 'link' : 'checkbox';
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  );

  expect(hit).toBe('checkbox');

  // And it really ticks: the bar is absent here (this fixture has no bulk
  // action), so the checkbox's own state is the observable.
  await row.getByRole('checkbox').click();
  await expect(row.getByRole('checkbox')).toBeChecked();
});

/**
 * The wide table: frozen columns, dividers and resizing.
 *
 * All three are *measurements*, so jsdom cannot see any of them — it renders
 * every box as zero, which makes "this column did not move" trivially true and
 * "these two columns overlap" undetectable. That is the same reason the row
 * target above lives here.
 */
test.describe('a wide table', () => {
  /**
   * The claim freezing actually makes: after scrolling sideways, the frozen
   * column is still at the same place on screen and the scrolled ones are not.
   *
   * Both halves are asserted. A table that does not scroll at all would satisfy
   * the first on its own, which is exactly the false pass to avoid.
   */
  test('holds the frozen columns still while the rest scroll', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/preview/record-table?wide=1');

    const container = page.locator('[data-slot="table-container"]');
    const frozen = page.getByRole('cell', { name: 'Record 1', exact: true });
    const scrolled = page.getByRole('cell', { name: 'r1c12', exact: true });

    const frozenBefore = (await frozen.boundingBox())!;
    const scrolledBefore = (await scrolled.boundingBox())!;

    await container.evaluate((el) => el.scrollBy({ left: 400 }));
    // The scroll is synchronous but layout is not; wait for the thing itself to
    // have moved rather than for a duration.
    await expect
      .poll(async () => Math.round((await scrolled.boundingBox())!.x))
      .not.toBe(Math.round(scrolledBefore.x));

    const frozenAfter = (await frozen.boundingBox())!;
    // Within a pixel: sub-pixel layout is not the thing under test.
    expect(Math.abs(frozenAfter.x - frozenBefore.x)).toBeLessThan(1);
  });

  /**
   * A frozen table's row still opens from an unfrozen cell.
   *
   * The named link lives in the frozen cell, and a frozen cell is positioned,
   * so the overlay that link stretches resolves against that one cell and
   * covers nothing else. Seen red: with the first column frozen, every cell
   * after it was dead, and the documents list's own spec caught it first. The
   * fix is a pointer-only twin of the link in the first unfrozen cell, which
   * is what this hit-tests.
   */
  test('opens the record from a cell that is not the frozen one', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/preview/record-table?wide=1');

    const row = page.getByRole('row').nth(3);
    const href = await row.getByRole('link').first().getAttribute('href');
    // Checkbox, the frozen name, then the first unfrozen cell.
    const box = (await row.locator('td').nth(2).boundingBox())!;
    const hit = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('a')?.getAttribute('href') ?? null,
      [box.x + box.width / 2, box.y + box.height / 2],
    );
    expect(hit).toBe(href);
  });

  /**
   * And the frozen cell is opaque, which is the half that looks like a nicety
   * and is not: a sticky cell has no fill of its own, so without one the
   * scrolled columns pass straight through the frozen text and both become
   * unreadable.
   *
   * **The obvious test for this does not work**, and it is worth recording which
   * one. `elementFromPoint` over the frozen cell returns the frozen cell whether
   * or not it has a background, because hit-testing does not care about paint, so
   * that assertion passes against the broken layout. Confirmed by removing the
   * fill and watching it stay green.
   *
   * The computed background is the honest question, since that is the thing that
   * is missing. `transparent` / `rgba(..., 0)` is the failure.
   *
   * **It is read off `::before`, not off the cell.** The opaque ground moved to
   * a pseudo-element when the frozen columns had to carry the row's hover tint
   * as well: one layer cannot be both opaque and translucent, so the cell holds
   * the tint and the pseudo-element holds the ground. Reading the cell here
   * would now pass on a transparent cell whose ground is missing, which is the
   * exact false pass this test exists to avoid.
   */
  test('gives the frozen column a fill to hide the scrolled ones behind', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/preview/record-table?wide=1');

    const frozen = page.getByRole('cell', { name: 'Record 1', exact: true });
    const background = await frozen.evaluate(
      (el) => getComputedStyle(el, '::before').backgroundColor,
    );

    // Not transparent, and not a zero alpha: this is the opaque page ground the
    // scrolled columns disappear against.
    expect(background).not.toBe('transparent');
    expect(background).not.toMatch(/rgba\([^)]*,\s*0\)$/);
  });

  /**
   * And it is opaque **while the row is hovered**, which is the half the test
   * above cannot see and the one that actually shipped broken.
   *
   * The row's state tints are translucent by design (`hover:bg-muted/40`), so a
   * frozen cell inheriting one inherits its alpha: opaque at rest, 40% opaque
   * under the pointer, and every scrolled column reads straight through it
   * exactly when somebody is looking at that row. The fix is an opaque
   * pseudo-element behind the cell's content, and the tint above it.
   *
   * **Neither of the obvious assertions works here.** `elementFromPoint` returns
   * the frozen cell either way, because hit-testing ignores paint. The computed
   * `backgroundColor` *is* the translucent tint in both the broken and the fixed
   * layout, because the fix adds a layer rather than changing that value.
   *
   * So this measures how much is drawn in the cell. It is screenshotted before
   * and after a column of text is scrolled under it, and the capture must not
   * grow: bleed-through is, definitionally, ink arriving that the cell did not
   * draw. Confirmed to fail by removing the pseudo-element, where the scrolled
   * row's text lands across the frozen label.
   *
   * A strict pixel equality was tried first and is too tight: ~19 bytes of a
   * 22KB capture differ from antialiasing along the cell's right edge, where
   * the seam shadow composites against a different neighbour once the table has
   * scrolled. That is not the thing under test.
   */
  test('keeps the frozen column opaque while its row is hovered', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/preview/record-table?wide=1');

    const container = page.locator('[data-slot="table-container"]');
    const frozen = page.getByRole('cell', { name: 'Record 2', exact: true });

    await frozen.hover();
    const before = await frozen.screenshot();

    await container.evaluate((el) => el.scrollBy({ left: 500 }));
    await expect
      .poll(async () => container.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
    await frozen.hover();
    const after = await frozen.screenshot();

    // Both captures are the same box, so a byte count is a fair proxy for how
    // much detail is in them: PNG compresses flat ground hard and text badly.
    // Bleed-through adds a whole column of glyphs, which is tens of percent,
    // while antialiasing on one edge is tenths of one.
    const growth = (after.length - before.length) / before.length;
    expect(Math.abs(growth)).toBeLessThan(0.05);
  });

  /**
   * And the frozen columns take the row's hover tint with the rest of the row.
   *
   * The other half of the same trade, and a regression the first fix caused: an
   * opaque ground painted over the cell's tint as well as over the scrolled
   * columns, so a hovered row lit up everywhere except its frozen columns. One
   * row rendering as two is worse than the bleed-through it was fixing, because
   * it looks deliberate.
   *
   * Measured as pixels rather than computed style, because the computed value
   * was *already correct* while this was broken: the tint was on the cell and
   * something else was painting over it. That is the whole lesson here, and it
   * is the same one as the `elementFromPoint` note above — the cascade said yes
   * while the screen said no.
   */
  test('tints the frozen columns with the rest of the hovered row', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto('/preview/record-table?wide=1');

    const frozen = page.getByRole('cell', { name: 'Record 2', exact: true });

    /**
     * The frozen cell's tint layer.
     *
     * **Only a frozen cell has one**, and that asymmetry is the design rather
     * than an inconsistency: an ordinary cell is transparent and the `<tr>`'s
     * fill shows through it, while a frozen cell has an opaque ground of its
     * own in the way and therefore needs the tint painted on top. Two earlier
     * versions of this test compared the frozen cell to a scrolled one and to
     * the row's computed fill; both compare against a value that is a different
     * *kind* of answer, and neither can pass.
     *
     * So the assertion is the behaviour itself: at rest there is no tint, and
     * under the pointer there is one. That is exactly what regressed.
     */
    const tintLayer = () =>
      frozen.evaluate((el) => getComputedStyle(el, '::after').backgroundColor);

    const rest = await tintLayer();
    await frozen.hover();
    const hovered = await tintLayer();

    // Nothing at rest: the cell is its own opaque ground and no more.
    expect(rest).toMatch(/rgba\([^)]*,\s*0\)$/);
    // And a real tint under the pointer, which is the half that broke — the
    // frozen columns used to stay flat white while the rest of the row lit up.
    expect(hovered).not.toBe(rest);
    expect(hovered).not.toMatch(/rgba\([^)]*,\s*0\)$/);
  });

  /** Dragging a handle widens that column, and leaves its neighbours alone. */
  test('resizes one column by its handle', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/preview/record-table?wide=1');

    // Anchored: /Column 1/ also matches Column 10, 11 and 12, and the accessible
    // name carries the resize button's label too.
    const target = page.getByRole('columnheader', { name: 'Column 1 Resize Column 1' });
    const neighbour = page.getByRole('columnheader', { name: 'Column 2 Resize Column 2' });
    const before = (await target.boundingBox())!;
    const neighbourBefore = (await neighbour.boundingBox())!;

    const handle = target.getByRole('button', { name: /Resize Column 1 column/ });
    const grip = (await handle.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2 + 80, grip.y + grip.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    const after = (await target.boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width + 40);
    // The next column keeps its own width: a resize moves one edge, and a
    // `table-fixed` layout that re-solved every column would fail here.
    expect(Math.abs((await neighbour.boundingBox())!.width - neighbourBefore.width)).toBeLessThan(2);
  });

  /**
   * A drag towards zero stops at the column's widest value, not at a constant.
   *
   * The `long` column starts at 120px and holds one row of roughly 280px, so a
   * 200px drag to the left would put it well under any fixed floor. What it
   * must land on instead is the width of that row, which is what makes the
   * assertion a measurement rather than a threshold: the floor is compared
   * against the cell's own `scrollWidth`, read from the page.
   */
  test('will not drag a column narrower than its widest value', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/preview/record-table?wide=1');

    const target = page.getByRole('columnheader', { name: 'Long Resize Long' });
    const handle = target.getByRole('button', { name: /Resize Long column/ });
    const grip = (await handle.boundingBox())!;

    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(grip.x + grip.width / 2 - 200, grip.y + grip.height / 2, {
      steps: 8,
    });
    await page.mouse.up();

    // What the content actually needs, asked of the browser rather than
    // written down: a number in this test would go stale the day the fixture's
    // string or the app's font changes, and would then pass for the wrong
    // reason.
    //
    // Measured over the *text nodes*, for the two reasons `widestIn` records:
    // `scrollWidth` floors at the cell's current width, so it would compare the
    // clamp against itself and pass however wrong it was, and a range over a
    // cell's contents measures the cell's own box.
    //
    // Only the body rows, because the header's ink is its label and arrow and
    // this column's long value is the thing under test.
    const widest = await page.evaluate(() => {
      const range = document.createRange();
      const cells = [...document.querySelectorAll<HTMLElement>('td[data-col="long"]')];
      return Math.max(
        ...cells.map((cell) => {
          range.selectNodeContents(cell.firstChild ?? cell);
          const box = getComputedStyle(cell);
          return (
            range.getBoundingClientRect().width +
            parseFloat(box.paddingLeft) +
            parseFloat(box.paddingRight)
          );
        }),
      );
    });

    const after = (await target.boundingBox())!.width;
    expect(after).toBeGreaterThanOrEqual(widest);
    // And it stopped *at* the floor rather than ignoring the drag: a column
    // that simply refused to move would also pass the line above.
    expect(after).toBeLessThan(widest + 8);
  });

  /**
   * A column whose declared `size` is narrower than its data widens on its own.
   *
   * The drag floor does not cover this, and this is the case actually seen: a
   * `size` is a guess written at the call site against data the caller has not
   * got, so a 190px Location column met 'Bridge of Earn, United Kingdom' and
   * clipped it before anybody touched a handle.
   *
   * `/preview/clients` rather than the record-table fixture, because the
   * value that showed it is there and the cell it is in (`LocationCell`) puts
   * its text inside a chip-and-span layout rather than straight into the `<td>`.
   */
  test('widens a column that starts narrower than its data', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/preview/clients');

    const cells = page.locator('td[data-col="country"]');
    /*
      Waiting for the *widened* column, not merely for the cell to exist.

      `waitFor()` alone resolves the moment the cell is in the DOM, which is
      before the layout effect that measures and widens it has run, so the
      assertions below raced it: green on a quiet machine and red about one run
      in three under parallel load. Asserting the width first is what makes the
      wait meaningful, since Playwright retries this one until it holds.
    */
    await expect
      .poll(async () => (await cells.first().boundingBox())?.width ?? 0)
      .toBeGreaterThanOrEqual(264);

    /*
      Content wider than the cell holding it, which is what a cut value is here.

      Deliberately *not* `scrollWidth > clientWidth` on the truncating span:
      `LocationCell` puts `truncate` on an inner span inside a shrink-wrapping
      `inline-flex`, so that span is always exactly its own content and reports
      no overflow no matter how narrow the column gets. The overflow lands on
      the cell instead. Measured, not assumed: with the widening disabled the
      span read 171/171 inside a 190px cell whose content needed 199.
    */
    const clipped = await cells.evaluateAll((tds) =>
      tds.filter((td) => {
        const content = td.firstElementChild;
        if (!content) return false;
        // 0.5px of slack for the subpixel width a `table-fixed` column lands on.
        return content.getBoundingClientRect().width > td.clientWidth + 0.5;
      }).length,
    );
    expect(clipped).toBe(0);
    // The width itself is asserted by the poll above, which doubles as the
    // wait. Location states `minSize: 264`, so a table that ignored the floor
    // would sit under it and never settle.

    /*
      `fit` being opt-in is deliberately *not* asserted here, rather than
      asserted weakly. Every other column on this fixture already fits its
      declared size (Email needs 193 of its 210, Phone 133 of its 150), so
      making `fit` table-wide would change none of them and the assertion would
      pass either way. It was written, seen to pass against the behaviour it
      was meant to forbid, and removed: a test that cannot fail is worse than
      no test, because it reads afterwards like a guarantee somebody checked.

      What would actually pin it is a fixture column that overflows and does
      not ask to fit. Worth adding the day `fit` has a second caller and the
      default is something anybody could change by accident.
    */
  });

  /**
   * A stated `minSize` holds against a drag, and still lets the column widen.
   *
   * Separate from the `fit` test above because the two floors come from
   * different places and only one of them survives a page of short values:
   * `fit` is derived from the rows on the screen, `minSize` is stated. A drag
   * of 300px to the left is far more than the distance to either floor, so the
   * column can only stop at one it is actually holding.
   */
  test('holds a column at its stated minimum width', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/preview/clients');

    const heading = page.locator('th[data-col="country"]');

    // Polled, for the reason the test above records: the floor is applied in a
    // layout effect, so asserting on first paint races it.
    await expect
      .poll(async () => (await heading.boundingBox())?.width ?? 0)
      .toBe(264);

    const handle = heading.getByRole('button', { name: /Resize/ });
    const drag = async (by: number) => {
      const grip = (await handle.boundingBox())!;
      await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
      await page.mouse.down();
      await page.mouse.move(grip.x + grip.width / 2 + by, grip.y + grip.height / 2, {
        steps: 10,
      });
      await page.mouse.up();
    };

    await drag(-300);
    expect((await heading.boundingBox())!.width).toBe(264);

    // And it is a floor rather than a fixed width: the reader can still make
    // the column as wide as they like. A column that refused both directions
    // would pass the assertion above for the wrong reason.
    await drag(120);
    expect((await heading.boundingBox())!.width).toBeGreaterThan(264);
  });
});

/**
 * The two columns this component draws itself: the checkbox and the actions.
 *
 * They are furniture rather than data, so their width is a constant this
 * component sets and not something a table or a reader chooses. That sounds
 * like a preference and is a correctness rule under `table-layout: fixed`,
 * which is what `resizable` switches on: there the browser sizes every column
 * from the header row's declared widths and never looks at the content, so a
 * column carrying `w-0` resolves to **zero** rather than to "as narrow as the
 * content allows".
 *
 * That is the bug this guards, and it shipped. Both columns were `w-0`, and the
 * width reached them only through the frozen branches, which state it in pixels
 * because a frozen column's `left` is a running sum of known widths. So the
 * frozen fixture looked right, every unresizable fixture looked right, and the
 * one live combination that collapses the checkbox under the first data cell
 * had nothing rendering it. `?plainwide=1` is that combination.
 *
 * Here rather than in jsdom because every assertion below is a measurement, and
 * jsdom reports every box as zero, which is indistinguishable from the failure.
 */
test.describe('the furniture columns', () => {
  /**
   * Both have a real width on a resizable table, and the checkbox is not
   * underneath the first value.
   *
   * The overlap is the visible symptom and the width is the cause, so both are
   * asserted: a width alone could be satisfied by a column pushed off-screen,
   * and a non-overlap alone would pass on a table that happened not to resize.
   */
  test('keep their width when the table is resizable and nothing is frozen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/preview/record-table?plainwide=1');

    // By the cell, exactly: `hasText: 'Record 1'` also matches Record 10.
    const row = page
      .getByRole('row')
      .filter({ has: page.getByRole('cell', { name: 'Record 1', exact: true }) });
    const checkbox = row.getByRole('checkbox');
    const name = row.getByRole('cell', { name: 'Record 1', exact: true });

    const checkboxBox = (await checkbox.boundingBox())!;
    const nameBox = (await name.boundingBox())!;

    // A checkbox that is present but in a zero-width column still reports its
    // own box, so the cell is what has to be measured rather than the control.
    const cell = row.locator('td').first();
    const cellBox = (await cell.boundingBox())!;
    expect(cellBox.width).toBeGreaterThan(20);

    // And the name column starts after it rather than on top of it, which is
    // what the collapse actually looked like on screen.
    expect(nameBox.x).toBeGreaterThanOrEqual(cellBox.x + cellBox.width - 1);

    // The checkbox itself sits inside its own cell, not under the next one.
    expect(checkboxBox.x + checkboxBox.width).toBeLessThanOrEqual(nameBox.x + 1);

    // The actions column at the far end, same rule.
    const actions = row.locator('td').last();
    const actionsBox = (await actions.boundingBox())!;
    expect(actionsBox.width).toBeGreaterThan(20);
  });

  /**
   * And neither offers a resize handle, on either kind of table.
   *
   * A handle on a column whose contents cannot overflow is a control with no
   * outcome, and dragging it narrower only hides the checkbox or the button.
   * True by construction today, because handles are rendered from `columns` and
   * neither of these is in it; asserted so that stays true.
   */
  test('offer no resize handle', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });

    for (const variant of ['plainwide=1', 'wide=1']) {
      await page.goto(`/preview/record-table?${variant}`);
      const handles = page.getByRole('button', { name: /^Resize / });
      // Every handle names a real data column; none names the furniture.
      const names = await handles.evaluateAll((els) =>
        els.map((el) => el.getAttribute('aria-label')),
      );
      expect(names.length).toBeGreaterThan(0);
      expect(names).not.toContain('Resize Actions column');
      expect(names.some((n) => /checkbox|select/i.test(n ?? ''))).toBe(false);
    }
  });
});

/**
 * Reordering columns by dragging their headings (`?reorder=1`).
 *
 * Here rather than in jsdom because every claim is a *gesture*: pointer capture,
 * hit-testing what is under the cursor, and the browser's own rules about when a
 * drag does and does not produce a click. jsdom has none of those, and the two
 * genuine bugs found while building this were both invisible to it (capture
 * taken too early stole the click that sorts; a `<th>` takes no focus, so the
 * keyboard path did not exist).
 *
 * Every test here was confirmed red by breaking the thing it guards.
 */
test.describe('reordering columns', () => {
  /** The column keys in the order they are drawn. */
  const order = (page: import('@playwright/test').Page) =>
    page
      .locator('thead th[data-col]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-col') ?? ''));

  /** Press the centre of one heading, move to another, release. */
  async function dragHeading(
    page: import('@playwright/test').Page,
    from: string,
    to: string,
  ) {
    const a = await page.locator(`thead th[data-col="${from}"]`).boundingBox();
    const b = await page.locator(`thead th[data-col="${to}"]`).boundingBox();
    if (!a || !b) throw new Error(`heading not found: ${from} or ${to}`);
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    // Two moves: one that crosses the threshold, one that lands. A single move
    // can be coalesced, and the threshold needs a move that is over it.
    await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    // The order persists, so without this each test inherits whatever the last
    // one dragged. Cleared through the page's own origin, then reloaded so the
    // table reads the empty store.
    await page.goto('/preview/record-table?reorder=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('thead th[data-col="name"]')).toBeVisible();
  });

  test('moves a column to where it was dropped', async ({ page }) => {
    expect(await order(page)).toEqual(['name', 'city', 'long']);
    await dragHeading(page, 'city', 'long');
    expect(await order(page)).toEqual(['name', 'long', 'city']);
  });

  /**
   * The left bound. A frozen column is the one that says which row you are on,
   * and its sticky `left` is a running sum of the frozen widths before it, so
   * nothing may be dropped in front of it.
   *
   * Two independent guards hold this (`move` refuses a target inside the frozen
   * run, and `ordered` re-sorts frozen columns to the front whatever is
   * stored), which is why breaking only one leaves this green.
   */
  test('will not drop a column before the frozen one', async ({ page }) => {
    await dragHeading(page, 'city', 'name');
    expect((await order(page))[0]).toBe('name');
  });

  /** The right bound is the actions column, which is not a column at all. */
  test('will not drop a column after the actions column', async ({ page }) => {
    const actions = await page.locator('thead th:last-child').boundingBox();
    const city = await page.locator('thead th[data-col="city"]').boundingBox();
    if (!actions || !city) throw new Error('heading not found');
    await page.mouse.move(city.x + city.width / 2, city.y + city.height / 2);
    await page.mouse.down();
    await page.mouse.move(city.x + city.width / 2 + 20, city.y + city.height / 2, {
      steps: 4,
    });
    await page.mouse.move(actions.x + actions.width / 2, actions.y + actions.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
    await page.waitForTimeout(150);
    // The last data column is still the last one; nothing went past it.
    expect((await order(page)).at(-1)).toBe('long');
  });

  test('keeps the order across a reload', async ({ page }) => {
    await dragHeading(page, 'city', 'long');
    const after = await order(page);
    await page.reload();
    await expect(page.locator('thead th[data-col="name"]')).toBeVisible();
    expect(await order(page)).toEqual(after);
  });

  /**
   * The press that reorders is the same press that sorts, so the two have to be
   * told apart. A click that does not travel is still a sort.
   */
  test('a click that does not travel still sorts', async ({ page }) => {
    const head = page.locator('thead th[data-col="city"]');
    await head.getByRole('button', { name: 'City', exact: true }).click();
    await expect(head).toHaveAttribute('aria-sort', 'ascending');
    expect((await order(page))[1]).toBe('city');
  });

  /**
   * And a drag is not a sort, in both shapes it comes in: one that lands
   * elsewhere (where the browser fires no click at all) and one that returns to
   * its origin (where it does, but pointer capture retargets it to the `<th>`
   * rather than the sort button inside).
   */
  test('a drag does not also sort', async ({ page }) => {
    await dragHeading(page, 'city', 'long');
    await expect(page.locator('thead th[aria-sort="ascending"]')).toHaveCount(0);
    await expect(page.locator('thead th[aria-sort="descending"]')).toHaveCount(0);
  });

  test('a drag returned to its origin neither moves nor sorts', async ({ page }) => {
    const before = await order(page);
    const box = await page.locator('thead th[data-col="city"]').boundingBox();
    if (!box) throw new Error('heading not found');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 20, cy, { steps: 4 });
    await page.mouse.move(cx, cy, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(150);

    expect(await order(page)).toEqual(before);
    await expect(page.locator('thead th[aria-sort="ascending"]')).toHaveCount(0);
  });

  /**
   * The keyboard path, which is not a nicety: a reorder that only answers a
   * pointer is one half the people using this app cannot reach (WCAG 2.1.1).
   * It was also genuinely broken until this test was written, because a `<th>`
   * takes no focus by default and the handler could never fire.
   */
  test('moves a column from the keyboard', async ({ page }) => {
    await page.locator('thead th[data-col="city"]').focus();
    await page.keyboard.press('Alt+ArrowRight');
    await page.waitForTimeout(150);
    expect(await order(page)).toEqual(['name', 'long', 'city']);
  });

  test('will not move a column past the frozen one from the keyboard', async ({
    page,
  }) => {
    await page.locator('thead th[data-col="city"]').focus();
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(150);
    expect(await order(page)).toEqual(['name', 'city', 'long']);
  });
});
