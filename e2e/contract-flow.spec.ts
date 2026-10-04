import { test, expect } from '@playwright/test';

/**
 * The contract builder, measured.
 *
 * `ContractFlow.test.tsx` owns the behaviour; this owns the two things jsdom
 * cannot see. The drawer's width is a percentage of the inset card, which only
 * resolves once something has actually laid out; and the terms grid's whole
 * justification is how many *rows* thirteen figures land in, which is a
 * measurement rather than a class name.
 *
 * It runs against `/preview/contract-flow` because every real contract URL is
 * behind the Clerk wall. A browser check there measures the sign-in page and
 * reports a healthy 200 while proving nothing, which is a trap worth naming:
 * the fixture is the only way to see this flow at all.
 */

const INSET = '.group\\/inset';

/**
 * The open drawer, once it has stopped moving. The panel enters on a 40px
 * `translate-x`, so measured on the frame it opens it reports 40px past where
 * it belongs whatever it is positioned against.
 */
async function settledPanel(page: import('@playwright/test').Page) {
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect
    .poll(() => drawer.evaluate((el) => getComputedStyle(el).translate))
    .toBe('none');
  return (await drawer.boundingBox())!;
}

test.describe('the contract builder', () => {
  test('walks all five phases without error', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Five: Scope was merged into Services and split back out (`phases.ts`).
    //
    // The preview is the exception and carries no row at all: that phase is a
    // document rather than a step of a form, so it runs the shell with its
    // chrome off (`FlowShell`'s `chrome`). It is still walked here, because
    // what this test is actually looking for is a page that throws.
    for (const phase of ['client', 'services', 'scope', 'terms']) {
      await page.goto(`/preview/contract-flow?phase=${phase}`);
      await expect(page.locator('nav[aria-label="Steps"] li')).toHaveCount(5);
      await expect(page.locator('[aria-current="step"]')).toContainText(phase, {
        ignoreCase: true,
      });
    }

    await page.goto('/preview/contract-flow?phase=preview');
    await expect(page.locator('nav[aria-label="Steps"]')).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  /**
   * The ledger's two signals, which is the guarantee that replaced the service
   * form's commit gate. The fixture carries one Service whose blanks are all
   * defaulted and one that genuinely has a figure missing, because those are
   * the two cases and a fixture with only the second would hide the reason the
   * acknowledgement exists at all.
   */
  test('holds the phase until every service is both filled and confirmed', async ({
    page,
  }) => {
    await page.goto('/preview/contract-flow?phase=scope');

    const advance = page.getByRole('button', { name: 'Terms', exact: true });
    await expect(advance).toBeDisabled();

    await expect(page.getByText('Nothing missing, not yet confirmed')).toBeVisible();
    await expect(page.getByText(/\d+ to fill/)).toBeVisible();

    // Confirming the one that is merely unlooked-at is not enough: the other is
    // genuinely short, and the count is what says so.
    await page.getByRole('button', { name: 'Nothing to change' }).click();
    await expect(advance).toBeDisabled();
  });

  /**
   * The acknowledgement on its own, which needs a contract with nothing
   * missing anywhere.
   *
   * **This test exists because the one above did not enforce what it claimed.**
   * Deleting the acknowledgement gate left it green: its fixture carries a
   * Service that is genuinely short, so the count held the button disabled
   * whatever the acknowledgement did. Here the count is zero from the start, so
   * the only thing between the operator and the next phase is having looked —
   * and removing that gate turns this red, which was confirmed before it was
   * trusted.
   */
  test('holds the phase on the acknowledgement alone when nothing is missing', async ({
    page,
  }) => {
    await page.goto('/preview/contract-flow?phase=scope&only=filled');

    const advance = page.getByRole('button', { name: 'Terms', exact: true });
    await expect(page.getByText(/\d+ to fill/)).toHaveCount(0);
    await expect(page.getByText('Nothing missing, not yet confirmed')).toBeVisible();
    await expect(advance).toBeDisabled();

    await page.getByRole('button', { name: 'Nothing to change' }).click();

    // The row drops its status line entirely once it is done: the tick states
    // it, and "Ready" under the name was that fact printed twice.
    await expect(page.getByText('Nothing missing, not yet confirmed')).toHaveCount(0);
    await expect(page.getByText('Ready')).toHaveCount(0);
    await expect(advance).toBeEnabled();
  });

  /**
   * The `md` share of the inset card, not of the window (`docs/design.md`
   * §2.11). The distinction only exists once something has laid out, which is
   * why it is here rather than in the unit test that pins the class.
   *
   * The share came down from 60% to 48% on 17 September 2026, for the clause
   * drawer and therefore for this one too: at 60 a drawer covered most of the
   * card and the list it opened from stopped being readable beside it.
   */
  test('opens a service in a drawer 48% the width of the card', async ({ page }) => {
    await page.goto('/preview/contract-flow?phase=scope');
    await page.getByRole('button', { name: /^Open / }).first().click();

    const panel = await settledPanel(page);
    const card = (await page.locator(INSET).boundingBox())!;

    const share = (panel.width / card.width) * 100;
    expect(share).toBeGreaterThan(46);
    expect(share).toBeLessThan(50);

    // And the relaxed gate: an incomplete Part saves. The dialog this replaced
    // refused, which is what seeded Parts could never satisfy.
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  /**
   * The divider removal, measured as rows rather than asserted as a class.
   *
   * The Master Agreement's thirteen figures sat in seven sections, two of which
   * spent a heading, a separator and a whole row on a single input. What the
   * change is worth is the row count, and nothing but a browser can count rows.
   */
  /**
   * The client phase ends where its widest row ends, with no dead space.
   *
   * Two things this pins, both of which were wrong. The date fields are capped
   * at the calendar they open, so an equal-track `FieldRow` left 24px unused
   * inside each cell and pushed the third field right; and the field group
   * filled the whole 896px panel, so the client combobox ran 116px past the
   * row underneath it and the gap read as space stuck on the end of a field.
   *
   * Asserted as **alignment**, not as widths: the numbers move with the
   * calendar and with the term label, but the combobox and the row below it
   * ending together is the thing that either looks right or does not.
   */
  test('ends the client form where its own fields end', async ({ page }) => {
    await page.goto('/preview/contract-flow?phase=client');

    const boxOf = async (l: ReturnType<typeof page.locator>) => (await l.boundingBox())!;
    // The combobox *control*, not the `<input>` inside it: the input sits
    // within the bordered box and is 28px narrower, so measuring it compares
    // the wrong edge and reports a 27px misalignment that is not there.
    const combobox = await boxOf(page.locator('[data-slot="combobox"]').first());
    const dates = page.locator('[data-slot="date-picker-trigger"]');
    const first = await boxOf(dates.first());
    const second = await boxOf(dates.nth(1));
    const term = await boxOf(page.locator('#con-term-months'));

    // No slack inside a date cell: each is exactly its calendar's width.
    expect(first.width).toBe(240);
    expect(second.width).toBe(240);

    // And the cell is exactly the control, neither padded nor overflowed.
    //
    // The overflow half is the one that matters: with equal tracks inside a
    // capped group the cells come out 225px while the controls stay 240, so
    // each date field hangs 15px past the column it is in. That reads almost
    // like the layout being asked for and is worse than the gap it replaced,
    // which is why this measures the cell rather than the control alone.
    const cells = page.locator('[data-slot="field-row"] > [data-slot="field"]');
    for (const i of [0, 1]) {
      const cell = await boxOf(cells.nth(i));
      const control = i === 0 ? first : second;
      expect(Math.abs(cell.width - control.width)).toBeLessThan(1);
    }

    // The form ends where its last control does, rather than running past it.
    const rowEnd = term.x + term.width;
    expect(Math.abs(combobox.x + combobox.width - rowEnd)).toBeLessThan(1);

    // And it starts on one edge.
    expect(Math.abs(combobox.x - first.x)).toBeLessThan(1);

    // The panel narrows with the form rather than the form floating in it:
    // the card's fill ends a padding's width past the last field, not 116px
    // past it. `p-10` is 40px a side, so 80px is the whole of the difference.
    const panel = await boxOf(page.locator('section > div').first());
    expect(panel.width - (rowEnd - combobox.x)).toBeLessThan(81);
  });

  /**
   * And the narrowing is this phase's alone. The panel is shared with the
   * other phases and with onboarding, which fill their width honestly, so a
   * card that resized on every step would be the cure worse than the disease.
   */
  /**
   * The Schedule tiles hold still while the list under them changes.
   *
   * The panel was vertically centred, so opening a Schedule re-centred it and
   * everything above the change moved: measured across the four, the tiles
   * travelled 92px, which put the tile you had just clicked out from under the
   * pointer. Only the half below the tiles may move.
   */
  test('pins the Schedule tiles while their lists change height', async ({ page }) => {
    await page.goto('/preview/contract-flow?phase=services&only=none');

    const tile = (name: string) => page.getByRole('button', { name: new RegExp(name) });
    const tops = new Set<number>();
    const heights = new Set<number>();

    // **The closed state counts as one of the positions.** Measuring only
    // across the four open ones once missed an 18px jump on the very first
    // click, from a control above the tiles that hid itself while a list was
    // open. That control has since been removed altogether, but the hole in
    // the measurement is the durable lesson: four identical positions, all of
    // them wrong together, read as pinned.
    tops.add(Math.round((await tile('Setup').boundingBox())!.y));

    for (const name of ['Setup', 'Build', 'Retainer', 'Audit']) {
      await tile(name).click();
      // The first tile, whichever Schedule is open: it must not move.
      tops.add(Math.round((await tile('Setup').boundingBox())!.y));
      heights.add(Math.round((await page.locator('section > div').first().boundingBox())!.height));
    }

    // One position across all four, and four different panel heights — so the
    // test would still fail if the tiles were held still by the lists all
    // happening to be the same length.
    expect(tops.size).toBe(1);
    expect(heights.size).toBe(4);
  });

  /**
   * The client phase narrows; the others take the shell's default.
   *
   * **Asserted as a relationship rather than a pixel count**, which is the fix
   * for how this test broke. It hard-coded 896, that being the default panel
   * width when it was written, so it went red the day `FlowShell`'s ceiling
   * changed — reporting a phase-width bug when nothing about phase width was
   * wrong. The property actually worth holding is that Services and Terms agree
   * with each other and Client is narrower than both, and that survives the
   * default moving.
   *
   * `CLIENT_PHASE_WIDTH` is the one number this phase really owns, and it is
   * checked where it can be checked meaningfully: the test below measures the
   * combobox against the row under it, which is what that cap exists to keep
   * aligned.
   */
  test('keeps the full-width panel on the phases that use it', async ({ page }) => {
    const widthOf = async (phase: string) => {
      await page.goto(`/preview/contract-flow?phase=${phase}`);
      return (await page.locator('section > div').first().boundingBox())!.width;
    };

    const services = await widthOf('services');
    const terms = await widthOf('terms');

    expect(services).toBe(terms);
    expect(await widthOf('client')).toBeLessThan(services);
  });

  /**
   * The client phase's three controls end where the combobox above them ends.
   *
   * `FieldRow` defaults to `gap-8` and this row is `fit`, so its `max-content`
   * tracks cannot shrink to absorb a gap that does not fit: 240 + 240 + 196
   * with two 32px gaps came to 740 inside a 700px panel, and the term field
   * hung 40px past the combobox. Measured rather than reasoned about, because
   * `CLIENT_PHASE_WIDTH`'s own docblock had the arithmetic and the arithmetic
   * was what was wrong.
   */
  test('ends the client phase row where the combobox ends', async ({ page }) => {
    await page.goto('/preview/contract-flow?phase=client');
    await page.locator('#con-client').waitFor();

    const right = async (selector: string) => {
      const box = (await page.locator(selector).first().boundingBox())!;
      return Math.round(box.x + box.width);
    };

    const combobox = await right('.group\\/combobox');

    // The term field is the last control in the row, so it is the one that
    // overhangs when the gaps do not fit.
    expect(await right('[data-slot="field-row"]')).toBe(combobox);
    expect(await right('#con-term-months')).toBe(combobox);
  });

  test('lays the standing figures out in a grid, not a section each', async ({ page }) => {
    await page.goto('/preview/contract-flow?phase=terms');

    await expect(page.locator('[data-slot="field-separator"]')).toHaveCount(0);

    const inputs = page.locator('input[id^="msa."], input[id^="sch."]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(10);

    // Distinct vertical positions, which is how many rows they occupy. One
    // section each would be one row per figure.
    const tops = new Set<number>();
    for (let i = 0; i < count; i++) {
      const box = await inputs.nth(i).boundingBox();
      if (box) tops.add(Math.round(box.y / 10));
    }
    expect(tops.size).toBeLessThan(count / 2);
  });

  /**
   * Three to a row, never four.
   *
   * The grid above is the right shape and was one column too dense: four
   * standing figures across an 896px panel gives each track about 200px to
   * hold a label, an input and its ⓘ, and the row reads as a wall rather than
   * as fields. Three breathes, on request (18 September 2026).
   *
   * Counted per row rather than asserted as a class, because the class is not
   * the behaviour: `FieldRow`'s 4 is two breakpoints (pairs, then four at
   * `@lg`), so a className check would pass at a width where the row is
   * actually showing two. What matters is how many inputs share a top edge on
   * the panel this phase actually renders at.
   */
  test('puts no more than three standing figures in a row', async ({ page }) => {
    await page.goto('/preview/contract-flow?phase=terms');

    const inputs = page.locator('input[id^="msa."], input[id^="sch."]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(10);

    // Group by top edge: the inputs sharing one are one row.
    const perRow = new Map<number, number>();
    for (let i = 0; i < count; i++) {
      const box = await inputs.nth(i).boundingBox();
      if (!box) continue;
      const row = Math.round(box.y / 10);
      perRow.set(row, (perRow.get(row) ?? 0) + 1);
    }

    expect(Math.max(...perRow.values())).toBe(3);
  });

  /**
   * The preview's page rail, which is the print view's rail on the phase before
   * it (18 September 2026, on request: "exactly what we have in the finalised
   * page").
   *
   * Entirely geometry, which is why it is here rather than in
   * `ContractFlow.test.tsx`. jsdom measures every box as zero, so it can say
   * the thumbnails are in the DOM and nothing else — not that they stand beside
   * the document rather than 200px away from it, not that the rail scrolls
   * inside its own box instead of hanging out of the pane, and not that a
   * thumbnail is laid out like the page it stands for. Each of those was wrong
   * at some point while this was built, and each looked fine in the markup.
   *
   * `e2e/page-rail.spec.ts` owns the same rail on the print route. What is
   * asserted here is only what differs: the rail is inside a scroll box that
   * belongs to the preview, and the page column is centred, which is the pair
   * that produced every bug on the way.
   */
  test.describe('the preview page rail', () => {
    const RAIL = '[data-slot="page-thumbnails"]';
    /**
     * The document's own pages.
     *
     * The child combinator is load-bearing: the rail is a child of the page
     * column (so that it positions against the page's edge rather than the
     * pane's), and it renders the same packed pages as thumbnails. A descendant
     * selector matches both, and then every measurement below is silently taken
     * against a 140px thumbnail instead of a 794px page.
     */
    const PAGES = '[data-slot="document-pages"] > div > .paginatorPage';

    const settledRail = async (page: import('@playwright/test').Page) => {
      await page.goto('/preview/contract-flow?phase=preview');
      const rail = page.locator(RAIL);
      await expect(rail).toBeVisible();
      // Pagination measures after hydration; before it lands there is one
      // un-paginated flow and no rail worth measuring.
      await expect
        .poll(() => rail.getByRole('button').count())
        .toBeGreaterThan(1);
      return rail;
    };

    /**
     * One thumbnail per page, counted from the document rather than written
     * down: a rail showing four pages of a thirty-four-page contract is the
     * failure this exists to catch, and the contract is long enough that an
     * off-by-one on the cover would be invisible in a screenshot.
     */
    test('shows one thumbnail per page of the document', async ({ page }) => {
      const rail = await settledRail(page);
      await expect(rail.getByRole('button')).toHaveCount(
        await page.locator(PAGES).count(),
      );
    });

    /**
     * The rail stands against the document, and the document stays in the
     * middle of the pane.
     *
     * **Both halves are here because fixing either one alone broke the other,
     * and both failures looked fine in the markup.** The rail outside the
     * scroll box strands it: the page caps at 794px and re-centres in whatever
     * space is left, so narrowing that space from the left pushes the page
     * right and leaves the rail ~195px from the document it indexes. Rail and
     * page as one centred flex group closes that gap and moves the page
     * instead: the *group's* midpoint lands in the middle, so the page sits
     * right of centre by half the rail's width. Asserting only the gap passes
     * the second arrangement; asserting only the centre passes the first.
     *
     * Three widths, because both faults need slack to appear in and 1280 is
     * where the page stops being able to have any.
     */
    for (const width of [1280, 1600, 1920]) {
      test(`centres the page and keeps the rail beside it at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        const rail = await settledRail(page);

        const railBox = (await rail.boundingBox())!;
        const firstPage = (await page.locator(PAGES).first().boundingBox())!;
        const pane = (await page
          .locator('[data-slot="document-preview"]')
          .boundingBox())!;

        // The page is centred on the pane, not on the pane-less-the-rail.
        expect(firstPage.x + firstPage.width / 2).toBeCloseTo(
          pane.x + pane.width / 2,
          0,
        );

        // And the rail sits one gutter off it, the print route's 24px.
        expect(firstPage.x - (railBox.x + railBox.width)).toBeCloseTo(24, 0);

        // Reserving the rail's width on one side only would centre the page
        // across a width the rail is standing in, and it would run under it.
        expect(railBox.x).toBeGreaterThanOrEqual(pane.x - 1);
      });
    }

    /**
     * The rail is bounded by the pane and scrolls inside it.
     *
     * The height is the load-bearing half and it has now been got wrong twice,
     * in both directions. `100svh` (the component's own fallback) measures the
     * window, which is taller than this pane by the header band and the card's
     * margins, so the rail hangs out of the bottom. `100cqh` was tried as the
     * fix and is wrong the same way: a scroll container's query height is its
     * *content*, so a 34-page contract made the rail 852px inside a 796px pane.
     * Both put the last thumbnails somewhere no pointer can reach them.
     */
    test('scrolls inside the preview pane rather than out of it', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 700 });
      const rail = await settledRail(page);

      const metrics = await rail.evaluate((el) => {
        const pane = el.closest<HTMLElement>('[data-slot="document-preview"]')!;
        return {
          clientHeight: el.clientHeight,
          scrollHeight: el.scrollHeight,
          bottom: el.getBoundingClientRect().bottom,
          paneBottom: pane.getBoundingClientRect().bottom,
        };
      });

      // Taller than the box, so it must be the rail that scrolls.
      expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
      // And it does not hang below the pane while doing it.
      expect(metrics.bottom).toBeLessThanOrEqual(metrics.paneBottom + 1);
    });

    /**
     * Scrolling the rail to its end shows the last page whole, with the
     * document left where it was.
     *
     * The reported symptom was that the last thumbnail was cut off until the
     * *main* preview was scrolled to the end, which is the opposite of what a
     * page rail is for. It was a real bug and it belonged to the arrangement
     * this file's centring test describes: while the rail was a stretched flex
     * item sharing a centred row with the page, its sticky box resolved
     * against the row rather than the pane.
     *
     * So this is a guard rather than a fix of its own, and it is written to
     * survive the next rearrangement: it asserts the end state **and** that
     * the document did not move to reach it, because those two together are
     * the behaviour, and either alone passes while the other is broken.
     *
     * Asserted against the **inset card**, not the pane: the pane extends past
     * the visible card, so measuring it calls a clipped thumbnail visible.
     * That is how the first attempt at this test fooled itself.
     *
     * Wheeled rather than scrolled by script, because `scrollTo(scrollHeight)`
     * always lands correctly and so proves nothing about where the box ends.
     */
    test('shows the last page whole when the rail is scrolled to its end', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1580, height: 1030 });
      const rail = await settledRail(page);

      const box = (await rail.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 80; i++) await page.mouse.wheel(0, 400);

      const metrics = await rail.evaluate((el) => {
        const inset = el.closest<HTMLElement>('.group\\/inset')!;
        const buttons = [...el.querySelectorAll('button')];
        const last = buttons[buttons.length - 1];
        return {
          atEnd: Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) < 2,
          // The button wraps the thumbnail *and* its number, so its bottom is
          // the whole of what has to be on screen.
          lastBottom: last.getBoundingClientRect().bottom,
          railBottom: el.getBoundingClientRect().bottom,
          insetBottom: inset.getBoundingClientRect().bottom,
          paneScrollTop: el.closest<HTMLElement>('[data-slot="document-preview"]')!
            .scrollTop,
        };
      });

      expect(metrics.atEnd).toBe(true);
      // The document has not moved: the rail scrolled on its own.
      expect(metrics.paneScrollTop).toBe(0);
      expect(metrics.lastBottom).toBeLessThanOrEqual(metrics.insetBottom);
      // And the scroll box itself ends inside the card rather than overhanging
      // it, which is the shape of the failure: a rail whose box runs past the
      // card puts its final thumbnails where nothing can reach them.
      expect(metrics.railBottom).toBeLessThanOrEqual(metrics.insetBottom);
    });

    /**
     * A thumbnail is the page it stands for, laid out the same way.
     *
     * The same assertion `page-rail.spec.ts` makes, repeated here because the
     * bug it guards has shipped twice already and this is a third caller: a
     * sheet sets no `text-align` of its own, so it takes the wrapper's, and the
     * wrapper is a `<button>`, which the UA stylesheet centres. The user named
     * this one in advance — "everything was in the center of the page, center
     * aligned, and weird stuff like that".
     */
    test('lays a thumbnail out the way its page is laid out', async ({ page }) => {
      await settledRail(page);

      const alignOf = async (selector: string) =>
        page
          .locator(selector)
          .first()
          .evaluate((el) => {
            const value = getComputedStyle(el).textAlign;
            return value === 'start' ? 'left' : value;
          });

      expect(await alignOf(`${RAIL} button > span > span > div`)).toBe(
        await alignOf(PAGES),
      );
    });

    /** The whole point of the control: clicking one moves the document. */
    test('scrolls the document to the page that was clicked', async ({ page }) => {
      const rail = await settledRail(page);
      const pane = page.locator('[data-slot="document-preview"]');

      expect(await pane.evaluate((el) => el.scrollTop)).toBe(0);
      await rail.getByRole('button', { name: 'Page 4', exact: true }).click();

      // Poll the thing being asserted: the scroll is smooth, so it is still in
      // flight for several frames after the click.
      await expect
        .poll(async () => {
          const box = await page.locator(PAGES).nth(3).boundingBox();
          return Math.abs(box?.y ?? Infinity);
        })
        .toBeLessThan(140);
    });
  });
});
