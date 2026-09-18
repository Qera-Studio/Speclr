import { test, expect } from '@playwright/test';

/**
 * The clause library's table and drawer, measured in a real browser.
 *
 * Both things here are geometry, which is the half of the suite jsdom cannot
 * see, and both were **found by this file rather than pinned after the fact**:
 *
 * - The row's open target is one absolutely positioned button, and it must
 *   resolve against **its own row**. Resolving against the cell covered the
 *   number alone, so a click on the heading missed it; resolving against the
 *   table card (what happens with no `relative` anywhere) made it 256px tall
 *   and laid it over *every* row, so a click on row 4 opened clause 6. The
 *   second is the dangerous one, and it is why this asserts which clause
 *   opened rather than that one did: a drawer showing the wrong clause of a
 *   legal agreement looks exactly like a drawer showing the right one.
 *   Every jsdom test passed throughout, because jsdom does no hit-testing: it
 *   dispatches the click at the element it was handed.
 * - The body field is a textarea inside a flex column. Without `min-h-0` its
 *   own content is its floor, so clause 1's definitions ran 460px past the
 *   bottom of the drawer and took the footer, and the delete button with it,
 *   off the screen entirely.
 *
 * Both are pinned against `/preview/clause-library`, which is the dev-only
 * fixture route the sheet specs already use, so this needs no session and no
 * database.
 */
test.describe('the clause library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/clause-library');
  });

  test('opens the clause whose row was clicked, from anywhere on that row', async ({ page }) => {
    // Row 4, not row 1: a target that has escaped to the table would cover the
    // first row correctly and every row after it wrongly, so a test that only
    // ever clicks the top row passes against the broken layout.
    const row = page.getByRole('row').nth(4);
    const box = (await row.boundingBox())!;

    // The middle of the row is over the heading cell, a long way from the
    // button's own cell. That is the click this test exists for.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText(/^Clause /)).toHaveText('Clause 4');
  });

  /**
   * The scrim is invisible and still present, which is two assertions because
   * it is two separate decisions that a single "remove the backdrop" would
   * collapse into one.
   *
   * What it *shows* is gone: the list behind stays fully lit, because a clause
   * is read against its neighbours and they cite each other by number. It
   * dimmed at 80%, then at 25% to give the drawer an edge, and now at nothing,
   * because the floating panel below carries its own edge instead.
   *
   * What it *does* remains: it catches the click outside and keeps the page
   * inert. Deleting the element is the obvious next step from "no dimming" and
   * is the wrong one, so the element's presence is asserted here rather than
   * left implied by the close behaviour two tests down.
   */
  test('dims more when expanded than when it is a drawer', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();

    const backdrop = page.locator('[data-slot="sheet-overlay"]');
    await expect(backdrop).toHaveCount(1);
    await expect(backdrop).toHaveCSS('backdrop-filter', 'none');

    const alpha = () =>
      backdrop.evaluate((el) => {
        const parts = getComputedStyle(el)
          .backgroundColor.split(/[\s,()/]+/)
          .filter(Boolean);
        // `rgb(0, 0, 0)` with no alpha component reads as fully opaque, which
        // is not something this drawer should ever produce; treating a
        // three-part colour as 1 makes that fail loudly rather than pass.
        return parts.length > 4 ? Number(parts[parts.length - 1]) : 1;
      });

    // Slight while the list beside it is still being read.
    const drawer = await alpha();
    expect(drawer).toBeGreaterThan(0);
    expect(drawer).toBeLessThan(0.2);

    await page.getByRole('button', { name: 'Expand this clause' }).click();
    await page.waitForTimeout(400);

    // Heavier once the panel covers the card, but still well under the app's
    // default 0.8, which would put the table out of reach entirely.
    const full = await alpha();
    expect(full).toBeGreaterThan(drawer);
    expect(full).toBeLessThan(0.6);
  });

  /**
   * The drawer floats clear of the card rather than filling its edge.
   *
   * This is the geometry half of "no scrim": a panel flush to the edge reads
   * as a region of the page, and a region of the page with nothing dimmed
   * behind it has no edge at all. Measured as a gap on all four sides, since
   * that is the whole of what floating means here and each side is one class
   * away from being wrong on its own.
   *
   * The fixture renders the library without `AdminShell`, so the sheet falls
   * back to the viewport, which is what the gaps are measured against.
   */
  test('floats clear of every edge instead of filling one', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');
    // The panel enters on a translate, so a box read on the opening frame is
    // 40px off wherever it ends up. `shell-sheets.spec.ts` has the same wait
    // for the same reason.
    await expect
      .poll(() => drawer.evaluate((el) => getComputedStyle(el).translate))
      .toBe('none');

    const box = (await drawer.boundingBox())!;
    const view = page.viewportSize()!;

    // A real gap on all four sides, not a hairline. 8px is the class
    // (`top-2`), and anything under 4 would mean one of them went missing.
    expect(box.y).toBeGreaterThan(4);
    expect(view.height - (box.y + box.height)).toBeGreaterThan(4);
    expect(view.width - (box.x + box.width)).toBeGreaterThan(4);
    expect(box.x).toBeGreaterThan(4);

    // And it is rounded, which is the other half of reading as an object.
    // `rounded-sm`, one step under the inset's own `rounded-md` (§1.3).
    const radius = await drawer.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(parseFloat(radius)).toBeGreaterThan(0);
  });

  /**
   * The longest clause in the Master Agreement, which is what makes this the
   * measurement rather than a formality: clause 1 is a page of definitions,
   * and it is now a page of *rows*, each its own textarea.
   *
   * The body is measured through the fieldset that holds the rows, because
   * there is no longer one control to point at. Same question as before: does
   * the body stay inside the drawer, and is the footer still reachable.
   *
   * By element rather than by `getByRole('group', { name: /Body/ })`, and the
   * reason is a real finding rather than a selector preference: `LegendInfo`
   * wraps its `<legend>` in a flex `<div>` so the info icon can sit beside it,
   * and a `<legend>` only names its fieldset when it is a *direct* child. So
   * every fieldset built with it is unnamed, here and on all seven onboarding
   * steps. Out of scope to fix from this change, and noted so the next person
   * does not read this locator as sloppiness.
   */
  test('keeps the longest clause inside the drawer, footer and all', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();

    const drawer = page.getByRole('dialog');
    const drawerBox = (await drawer.boundingBox())!;
    const bodyBox = (await drawer.locator('fieldset').boundingBox())!;
    /*
      The bottom furniture, which is the save status rather than the delete
      button since 17 September 2026: delete moved up into the control row and
      the Save button became this region. The measurement is unchanged in
      substance, because what it is really asking is whether a long clause
      pushes whatever sits at the foot of the drawer off the screen.

      It has to be given something to say first. The region is `empty:hidden`,
      so an untouched drawer has no foot to measure at all, which is the point
      of that class: an empty status used to reserve a line and read as a stray
      rule. Typing is what makes the foot exist, and the worst case for this
      measurement is the foot present rather than absent.
    */
    await drawer.getByLabel('Heading').press('End');
    await drawer.getByLabel('Heading').type(' ');
    const status = drawer.getByRole('status');
    await expect(status).toHaveText(/Unsaved|Saving|Saved/);
    const footBox = (await status.boundingBox())!;

    // The body scrolls inside the drawer rather than spilling past it.
    expect(bodyBox.y + bodyBox.height).toBeLessThanOrEqual(drawerBox.y + drawerBox.height);
    // And the foot is still on screen, below the body.
    expect(footBox.y).toBeGreaterThan(bodyBox.y);
    expect(footBox.y + footBox.height).toBeLessThanOrEqual(drawerBox.y + drawerBox.height + 1);

    // The control row is at the top and fully inside the drawer too, since the
    // irreversible actions now live there.
    const controls = (await drawer.getByTestId('clause-controls').boundingBox())!;
    expect(controls.y).toBeGreaterThanOrEqual(drawerBox.y - 1);
    expect(controls.y).toBeLessThan(bodyBox.y);
  });

  /**
   * The drawer's three heights, measured together because they are one
   * decision: the two fields at 36px and the three add-a-paragraph buttons at
   * 28px.
   *
   * The buttons took `size="form"` (38px), which exists for a button sitting
   * *inline with* an Input so the two match (§2.1). These sit in a row of their
   * own below the body with no field beside them, so that height was only
   * making them the largest thing in the drawer.
   *
   * 36px is a rung added to every typed-into primitive rather than to `Input`
   * alone, because §2.2's rule is that a field row cannot come out three
   * heights. `control-size.test.tsx` holds the five to the same number; this
   * asserts what the drawer actually renders.
   *
   * Measured rather than asserted as a class: jsdom resolves no stylesheet, so
   * a class name there is a string and any size would pass whatever it renders
   * as. Height is geometry, so it lives here.
   */
  test('sizes the drawer fields to 36px and the add buttons to 28px', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');

    for (const id of ['#clause-heading', '#clause-summary']) {
      const box = (await drawer.locator(id).boundingBox())!;
      expect.soft(Math.round(box.height), `${id} is 36px tall`).toBe(36);
    }

    for (const name of ['Point', 'Sub-item', 'Unnumbered']) {
      const box = (await drawer.getByRole('button', { name, exact: true }).boundingBox())!;
      expect.soft(Math.round(box.height), `${name} is 28px tall`).toBe(28);
    }
  });

  /**
   * The citations and the three add buttons share one band: "Refers to" at the
   * left, the buttons pushed to the right end.
   *
   * Geometry, so it is here: the assertion is that the two sit on the same
   * horizontal line and in that order, which no class check can make. A stacked
   * pair passes any "both are present" test in jsdom and is exactly the layout
   * this replaces.
   */
  test('puts the citations and the add buttons on one row, buttons at the right', async ({
    page,
  }) => {
    // Clause 1 is the fixture's citing clause, so both halves of the row exist.
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');

    const cites = (await drawer.getByText('Refers to').boundingBox())!;
    const point = (await drawer.getByRole('button', { name: 'Point', exact: true }).boundingBox())!;
    const last = (await drawer
      .getByRole('button', { name: 'Unnumbered', exact: true })
      .boundingBox())!;

    // One band: their centres are on the same line, within a pixel or two.
    const centre = (b: { y: number; height: number }) => b.y + b.height / 2;
    expect(Math.abs(centre(cites) - centre(point))).toBeLessThanOrEqual(2);

    // And the order: citations left, buttons after them.
    expect(point.x).toBeGreaterThan(cites.x + cites.width);

    // Pushed to the right end rather than sitting next to the citations, which
    // is the difference between `justify-between` and a plain row.
    const row = (await drawer.getByTestId('clause-body-actions').boundingBox())!;
    expect(last.x + last.width).toBeGreaterThanOrEqual(row.x + row.width - 2);
  });

  /**
   * And the buttons stay put when there is nothing to refer to.
   *
   * Most clauses cite nothing, and `ClauseCitations` renders `null` for them.
   * Nesting the buttons inside it would have been the smaller diff and would
   * have made them disappear on every one of those clauses, so the row lives a
   * level up with the citations as its left slot.
   */
  /**
   * Expanding takes the panel to the `lg` sheet size, 90% of the inset.
   *
   * Geometry, so it is here, and the assertion is the *ratio* rather than a
   * pixel width: the inset's own width depends on the viewport and on whether
   * the nav rail is collapsed, so a hardcoded number would pin the fixture
   * rather than the rule.
   */
  test('expands the drawer to 90% of the inset and collapses back', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');
    await page.waitForTimeout(400);
    const narrow = (await drawer.boundingBox())!;

    await page.getByRole('button', { name: 'Expand this clause' }).click();
    await page.waitForTimeout(400);
    const wide = (await drawer.boundingBox())!;
    expect(wide.width).toBeGreaterThan(narrow.width);

    /*
      90% of what the sheet resolves against, measured as a ratio rather than a
      width. The sheet sizes itself to the inset card where there is one; this
      fixture renders the library without `AdminShell`, so it falls back to the
      viewport, and either way the rule under test is the proportion. A pixel
      number would pin the fixture instead.
    */
    const view = page.viewportSize()!;
    expect(wide.width / view.width).toBeCloseTo(0.9, 2);
    expect(narrow.width / view.width).toBeCloseTo(0.48, 2);

    /*
      Centred, which is what makes this a floating panel rather than a wider
      drawer. Collapsed it is tucked to the right, so its two side gaps are
      lopsided; expanded they match. That difference is the request ("like
      Arc's little window, or Notion's full peek") stated as a measurement, and
      it is the one thing a size change alone would not produce.
    */
    const leftGap = wide.x;
    const rightGap = view.width - (wide.x + wide.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThan(4);
    // The collapsed one is not centred, or the two states would be the same
    // shape and the assertion above would prove nothing.
    expect(narrow.x).toBeGreaterThan(view.width - (narrow.x + narrow.width) + 4);

    // And it comes off the top and bottom too, rather than growing sideways
    // only: a panel inset on two sides and flush on the other two is a shape
    // nobody chose.
    expect(wide.y).toBeGreaterThan(4);
    expect(view.height - (wide.y + wide.height)).toBeGreaterThan(4);

    // One toggle, not two buttons: the control now offers the way back.
    await expect(page.getByRole('button', { name: 'Expand this clause' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Collapse to the side panel' }).click();
    await page.waitForTimeout(400);
    expect(Math.round((await drawer.boundingBox())!.width)).toBe(Math.round(narrow.width));
  });

  /**
   * The control row, and the one bug it introduced on the way in.
   *
   * `SheetContent` draws its own close X in the top-right corner by default,
   * and the back arrow in this row does that job. Left on, the X sat *over* the
   * delete icon: two controls in one place, one of them irreversible. Caught by
   * eye in a screenshot, so it is pinned by overlap here rather than by
   * counting buttons, which would pass with the two stacked.
   */
  test('has one control per corner, with nothing overlapping delete', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');
    const row = drawer.getByTestId('clause-controls');

    // The order, left to right, which is the whole arrangement.
    /*
      The *accessible* name rather than the `aria-label` attribute: the four
      `IconAction`s carry one, while `ConfirmActionButton` names its button with
      an `sr-only` span instead. Reading the attribute returned an empty string
      for delete, which is a difference in how the name is provided rather than
      a missing name.
    */
    const labels = await row
      .getByRole('button')
      .evaluateAll((els) =>
        els.map((e) => (e.getAttribute('aria-label') ?? e.textContent ?? '').trim()),
      );
    // DOM order, which is why the pager sits in the middle of this list even
    // though it is absolutely positioned: it is centred visually and still
    // read between the two groups by a screen reader, which is the order a
    // reader of the row would describe.
    expect(labels).toEqual([
      'Back to the clause list',
      'Expand this clause',
      'Previous clause',
      'Next clause',
      'Download the library as Markdown',
      'Archive this clause',
      'Delete this clause',
    ]);

    // Nothing else is drawn on top of the destructive one. Compared by element
    // identity rather than by name, since this button's name comes from a span.
    const del = drawer.getByRole('button', { name: 'Delete this clause' });
    const box = (await del.boundingBox())!;
    const onTop = await del.evaluate(
      (self, c) => document.elementFromPoint(c.x, c.y)?.closest('button') === self,
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    expect(onTop).toBe(true);
  });

  /**
   * Every control in the row says what it does on hover, in one word.
   *
   * Here rather than in jsdom because a tooltip is a hover, and a hover is a
   * pointer over a box. The one that mattered is **delete**: it is a
   * `ConfirmActionButton` rather than an `IconAction`, so it was the only
   * control in the row with nothing to read, and it is the only irreversible
   * one. That asymmetry is exactly the kind a test written per component would
   * miss, so this walks the row and asserts on all five.
   *
   * The words are short on purpose and the shortness is the rule being
   * checked: a tooltip beside four others is read by somebody who can already
   * see which icon they are pointing at. The buttons keep their longer
   * `aria-label`, which the test two above pins, because a screen reader
   * reaches them out of that context.
   */
  test('names every control in one word on hover', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const row = page.getByRole('dialog').getByTestId('clause-controls');

    for (const [name, word] of [
      ['Back to the clause list', 'Back'],
      ['Expand this clause', 'Expand'],
      ['Download the library as Markdown', 'Download as MD'],
      ['Archive this clause', 'Archive'],
      ['Delete this clause', 'Delete'],
    ] as const) {
      await row.getByRole('button', { name }).hover();
      // By slot, not by role: Base UI's tooltip popup carries no
      // `role="tooltip"`, since the control it labels is already named.
      const tip = page.locator('[data-slot="tooltip-content"]', { hasText: word });
      await expect(tip).toHaveText(word);
      // Away again, or the next hover races the one still open.
      await page.mouse.move(0, 0);
      await expect(page.locator('[data-slot="tooltip-content"]')).toHaveCount(0);
    }
  });

  /**
   * The title is the section-heading rung, and nothing is ruled off from it.
   *
   * Measured rather than asserted as a class, because what was asked for was a
   * size ("about 4px bigger") and the class is only how it is reached. 16px is
   * §1.4's card/section heading step, which is the nearest real rung to 14 + 4;
   * the scale is four sizes and an 18px title would be a fifth.
   */
  test('sets the drawer title at the heading rung, with no rule beneath', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');

    const title = drawer.getByRole('heading');
    await expect(title).toHaveCSS('font-size', '16px');

    // The header band draws no bottom border. The control row above it lost
    // one too: a heading that names the field below should not be fenced from
    // it.
    const header = drawer.locator('[data-slot="sheet-header"]');
    await expect(header).toHaveCSS('border-bottom-width', '0px');
  });

  /**
   * No rule under the control row.
   *
   * The row is chrome sitting above the title, not a section of the panel, and
   * a border under it cut the drawer into two stacked boxes. Measured as a
   * computed width rather than by looking for a class, because a border is one
   * of several ways to draw that line and what was asked for was the line gone.
   */
  test('draws no line under the control row', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const row = page.getByRole('dialog').getByTestId('clause-controls');

    await expect(row).toHaveCSS('border-bottom-width', '0px');
  });

  /**
   * A body row is one line tall until it has more than one line in it.
   *
   * Geometry, and jsdom-proof: `field-sizing-content` is a layout behaviour
   * with no class to assert past its presence, and the old `rows={2}` floor
   * was invisible to every unit test while being 28px of empty box on every
   * row of a 28-clause library.
   */
  test('starts a body row at one line and grows it as lines are added', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).nth(1).click();
    const drawer = page.getByRole('dialog');

    /*
      A row added here, so it is genuinely empty.

      Measuring an existing row was tried and is the wrong measurement: every
      clause in the fixture holds real legal prose, which wraps to three lines
      at this width, so the 72px it reports is the field doing exactly what it
      should. What this test is about is the *floor*, which only an empty row
      can show.
    */
    await drawer.getByRole('button', { name: 'Unnumbered', exact: true }).click();
    const row = drawer.getByRole('textbox').last();

    const empty = (await row.boundingBox())!.height;
    // The 36px rung (§2.1), matching the heading and description fields above.
    // It was 64px with `rows={2}`, which is the floor this replaces.
    expect(empty).toBeGreaterThanOrEqual(34);
    expect(empty).toBeLessThan(44);

    await row.click();
    await page.keyboard.type('One.\nTwo.\nThree.');

    const grown = (await row.boundingBox())!.height;
    expect(grown).toBeGreaterThan(empty + 20);
  });

  /**
   * And it is never resized by hand.
   *
   * `resize-y` drew a drag corner in the bottom right of every row. Two
   * answers to how tall a row is, one the content decides and one somebody
   * dragged to, and the second wins permanently once used.
   */
  test('offers no resize corner on a body row', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const row = page.getByRole('dialog').getByRole('textbox').nth(2);

    await expect(row).toHaveCSS('resize', 'none');
  });

  /**
   * Dragging a row to a new position, which is the half of the grip that only
   * a browser can test: the handler reads the rows' boxes to decide what the
   * pointer is over, and jsdom reports every box as zero, so a unit test can
   * only ever exercise the keyboard path.
   */
  test('reorders a body row by dragging its grip', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).nth(1).click();
    const drawer = page.getByRole('dialog');

    /*
      Two rows added here rather than two of the clause's own, and the reason
      is `moveBlock` rather than convenience: a numbered point carries its
      sub-items, so dragging the first grip of a clause that has any moves the
      whole block, and the row that lands next to the pointer is not the row
      that was picked up. That is correct behaviour and the wrong fixture for
      testing the *drag*, which is what this measures.

      Unnumbered paragraphs carry nothing, so one row moves one place.
    */
    const add = drawer.getByRole('button', { name: 'Unnumbered', exact: true });
    await add.click();
    await drawer.getByRole('textbox').last().fill('First added.');
    await add.click();
    await drawer.getByRole('textbox').last().fill('Second added.');

    const rows = drawer.getByRole('textbox');
    const last = rows.last();
    const above = rows.nth((await rows.count()) - 2);
    await expect(above).toHaveValue('First added.');

    // The grip of the last row, dragged up onto the row above it.
    const grip = drawer.getByRole('button', { name: /^Reorder / }).last();
    const from = (await grip.boundingBox())!;
    const target = (await above.boundingBox())!;

    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    // Stepped, because the handler reorders as the pointer passes a row
    // rather than on release: the list is its own drop preview.
    await page.mouse.move(from.x + from.width / 2, target.y + target.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(above).toHaveValue('Second added.');
    await expect(last).toHaveValue('First added.');
  });

  /**
   * A paragraph added from the top of a long clause is on screen.
   *
   * Placement alone is not enough and this is the measurement that says so:
   * clause 1's eleven definitions belong to 1.1, so a point added from it lands
   * correctly at 1.2 and, before the caret followed it, at y=1043 against a
   * list ending at 636. Four hundred pixels below the fold, with the caret
   * still in the paragraph being read, is indistinguishable from nothing
   * happening. jsdom cannot see any of that: it reports every box as zero.
   */
  test('scrolls a newly added paragraph into view', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');

    await drawer.getByRole('textbox', { name: 'Numbered point 1.1' }).click();
    await drawer.getByRole('button', { name: 'Point', exact: true }).click();

    const added = drawer.getByRole('textbox', { name: 'Numbered point 1.2' });
    await expect(added).toBeFocused();

    const row = (await added.boundingBox())!;
    const list = await page
      .locator('[data-row]')
      .first()
      .evaluate((r) => {
        const box = r.parentElement!.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom };
      });

    expect(row.y).toBeGreaterThanOrEqual(list.top - 1);
    expect(row.y + row.height).toBeLessThanOrEqual(list.bottom + 1);
  });

  /**
   * Paging while expanded keeps the panel expanded.
   *
   * `ClauseLibrary.test.tsx` pins this by which control the row offers, which
   * is the mechanism. This measures the thing that was actually reported: the
   * panel collapsing to a side drawer under the reader, mid-read, because the
   * drawer is keyed by clause number and the state sat inside it.
   */
  test('keeps the panel expanded when it pages to another clause', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');

    await page.getByRole('button', { name: 'Expand this clause' }).click();
    await page.waitForTimeout(400);
    const wide = (await drawer.boundingBox())!.width;

    await page.getByRole('button', { name: 'Next clause' }).click();
    await page.waitForTimeout(400);

    await expect(drawer.getByRole('heading')).not.toHaveText('Definitions and Interpretation');
    // Same width, not the drawer's. Before the fix this measured 48% again.
    expect(Math.round((await drawer.boundingBox())!.width)).toBe(Math.round(wide));
  });

  /**
   * Walking the library from inside the drawer, measured here only for where
   * the pager sits: `ClauseLibrary.test.tsx` owns what the arrows do.
   *
   * Centred on the row rather than in the space the icons leave. The two
   * groups are different widths (two icons against three), so a flex centre
   * would put the number off-centre and move it when Archive becomes Restore.
   */
  test('centres the clause pager on the control row', async ({ page }) => {
    await page.getByRole('button', { name: /^Open / }).first().click();
    const drawer = page.getByRole('dialog');
    const row = (await drawer.getByTestId('clause-controls').boundingBox())!;
    const label = (await drawer.getByText(/^Clause \d+$/).boundingBox())!;

    const rowCentre = row.x + row.width / 2;
    const labelCentre = label.x + label.width / 2;
    expect(Math.abs(rowCentre - labelCentre)).toBeLessThan(4);
  });

  test('keeps the add buttons at the right when a clause cites nothing', async ({ page }) => {
    // Clause 2 is the fixture's non-citing clause.
    await page.getByRole('button', { name: /^Open / }).nth(1).click();
    const drawer = page.getByRole('dialog');

    await expect(drawer.getByText('Refers to')).toHaveCount(0);
    const last = (await drawer
      .getByRole('button', { name: 'Unnumbered', exact: true })
      .boundingBox())!;
    const row = (await drawer.getByTestId('clause-body-actions').boundingBox())!;
    expect(last.x + last.width).toBeGreaterThanOrEqual(row.x + row.width - 2);
  });
});
