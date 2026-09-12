import { expect, test, type Locator } from '@playwright/test';

/**
 * The document header: back, the breadcrumb trail and the pager, on **one**
 * row — and that row levelled with the top row of each column beside it.
 *
 * It was three bands down the top of the screen, each owned by a different
 * column of the shell — the trail in the inset, the title and pager in a bar
 * inside the page, the back arrow in the editor rail a column to the right.
 * They are one line now, which means separately-owned pieces sharing a baseline
 * and a row height.
 *
 * The last describe is the harder half and the reason the file grew: the shell
 * has three columns, each drawing its own top row from its own file, and
 * nothing in the code makes them agree. `h-12` is written three times. A test
 * is the only thing that notices when one of them moves.
 *
 * Here rather than in Jest for the usual reason: every assertion below is a
 * box, and jsdom reports every box as zero. A Jest test can prove the pieces
 * are in the DOM in the right order (and `AdminHeader.test.tsx` does). Only a
 * browser can say they are on the same line.
 */

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return box;
};

const midOf = async (locator: Locator) => {
  const box = await boxOf(locator);
  return box.y + box.height / 2;
};

test.describe('the document header row', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/shell');
  });

  const header = (page: import('@playwright/test').Page) =>
    page.locator('header[data-print-hidden]');

  test('puts back, the trail and the pager on one line', async ({ page }) => {
    const row = header(page);
    await expect(row).toBeVisible();

    const back = row.getByRole('button', { name: /back/i });
    const trail = row.getByRole('navigation', { name: /breadcrumb/i });
    const pager = row.getByRole('textbox', { name: /go to page/i });

    const [backMid, trailMid, pagerMid] = await Promise.all([
      midOf(back),
      midOf(trail),
      midOf(pager),
    ]);

    // Half a pixel of slack, the same tolerance `header.spec.ts` holds the
    // band's own right-hand end to.
    expect(Math.abs(trailMid - backMid)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(pagerMid - backMid)).toBeLessThanOrEqual(0.5);
  });

  /** Left to right: where you came from, where you are, which page of it. */
  test('orders them back, trail, pager', async ({ page }) => {
    const row = header(page);
    const [back, trail, pager] = await Promise.all([
      boxOf(row.getByRole('button', { name: /back/i })),
      boxOf(row.getByRole('navigation', { name: /breadcrumb/i })),
      boxOf(row.getByRole('textbox', { name: /go to page/i })),
    ]);

    expect(trail.x).toBeGreaterThan(back.x);
    expect(pager.x).toBeGreaterThan(trail.x);
  });

  /**
   * One row, not two. The whole point of the merge: the header used to be a
   * 36px trail with a 48px bar under it, and a regression here would be a
   * second band quietly coming back.
   */
  test('is a single row no taller than the band above it', async ({ page }) => {
    const row = await boxOf(header(page));
    const band = await boxOf(page.locator('[data-slot="top-panel"]'));

    expect(row.height).toBeLessThanOrEqual(band.height);
  });

  /**
   * The pager sits at the right-hand end of the row, against the seam with the
   * editor rail rather than trailing the trail. That is what `ml-auto` buys,
   * and it is invisible to a DOM-order assertion.
   */
  test('pushes the pager to the row’s right-hand end', async ({ page }) => {
    const row = await boxOf(header(page));
    const pager = await boxOf(
      header(page).getByRole('textbox', { name: /go to page/i }),
    );
    const trail = await boxOf(
      header(page).getByRole('navigation', { name: /breadcrumb/i }),
    );

    const gapAfterPager = row.x + row.width - (pager.x + pager.width);
    const gapAfterTrail = pager.x - (trail.x + trail.width);

    // The pager is nearer the right edge than it is to the trail it follows.
    expect(gapAfterPager).toBeLessThan(gapAfterTrail);
  });
});

/**
 * The columns' top rows, levelled against each other.
 *
 * Each column draws its own row in its own file, so nothing in the code makes
 * them agree, and the failure mode is one of them drifting by a few pixels —
 * which looks like nothing in a screenshot and like a broken band on a real
 * screen.
 *
 * **The nav is no longer one of the rows being levelled, and that is the
 * layout, not a gap here.** The nav runs the window's full height now, with the
 * header band starting where it ends, so its own header row sits 48px above the
 * card and levelling the two would be asserting the shape this shell was
 * deliberately changed away from. What still has to agree is the two rows
 * *inside* the card: the breadcrumb row and the editor rail's title row, which
 * are the pair that reads as one band. The nav's row is checked against the
 * card's top edge instead, which is the relationship that replaced it.
 */
test.describe('the shell’s top band', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/shell');
  });

  const rows = (page: import('@playwright/test').Page) => ({
    nav: page.locator('[data-slot="sidebar-header"]'),
    inset: page.locator('header[data-print-hidden]'),
    // The rail's title row. Located by the text it carries rather than by a
    // data-slot, because the row exists only when a panel names itself and its
    // presence is half of what is being asserted.
    rail: page
      .locator('[data-editor-rail]')
      .getByText('Edit service quotation draft'),
  });

  test('gives all three columns a row of the same height', async ({ page }) => {
    const { nav, inset } = rows(page);
    const [navBox, insetBox] = await Promise.all([boxOf(nav), boxOf(inset)]);

    expect(insetBox.height).toBeCloseTo(navBox.height, 1);
  });

  test('starts the card’s rows at its own top edge, and on one line', async ({
    page,
  }) => {
    const { nav, inset, rail } = rows(page);
    const [navBox, insetBox] = await Promise.all([boxOf(nav), boxOf(inset)]);

    // The breadcrumb row starts at the card's own top edge, not the window's.
    const card = (await page.locator('[data-slot="sidebar-inset"]').boundingBox())!;
    expect(Math.abs(insetBox.y - card.y)).toBeLessThanOrEqual(0.5);

    // The nav's header row starts at the window's top, above the card, because
    // the nav is full height and the band begins where it ends.
    expect(navBox.y).toBeLessThan(card.y);

    // The two rows inside the card sit on one line. The back button and the
    // rail's title are different type sizes in different boxes, so the midpoint
    // is what has to agree.
    const [back, title] = await Promise.all([
      midOf(inset.getByRole('button', { name: /back/i })),
      midOf(rail),
    ]);

    expect(Math.abs(title - back)).toBeLessThanOrEqual(0.5);
  });

  /**
   * The document's title names what the rail is editing, so it prints in the
   * rail rather than on the inset's row. Asserted as a pair — present there,
   * absent here — because the failure this replaced was the title being in
   * neither place at all.
   */
  test('prints the document’s title in the rail, not on the breadcrumb row', async ({
    page,
  }) => {
    const { inset, rail } = rows(page);
    await expect(rail).toBeVisible();
    await expect(inset.getByText('Edit service quotation draft')).toHaveCount(0);
  });

  /**
   * The rail ends where the card ends, and a form longer than it scrolls
   * *inside* it.
   *
   * The block above pins the rail's top edge against the card, and only its
   * top: the bottom was 56px past it, with a long editor form running down over
   * the shell below the card and off the window. `EditorSidebar` restates
   * `top`, `right` and `bottom` against the card, but `ui/sidebar.tsx` also
   * states a `height` (`100svh` less the top band, which is right for the nav,
   * a rail that really is the window's height), and a stated height beats the
   * second anchor. So `bottom-2!` was computing nothing until `h-auto!` handed
   * the height back to the two edges.
   *
   * Both halves are asserted because the first alone is not the bug: a rail
   * clipped to the card that does not scroll hides the end of the form instead
   * of spilling it, which is worse. The form is stubbed rather than driven,
   * since the fixture's panel is one field and what is under test is the box,
   * not any particular editor.
   */
  test('ends at the card’s foot, and scrolls a long form inside it', async ({
    page,
  }) => {
    const card = (await page.locator('[data-slot="sidebar-inset"]').boundingBox())!;
    const railBox = (await page.locator('[data-editor-rail]').boundingBox())!;
    expect(railBox.y + railBox.height).toBeCloseTo(card.y + card.height, 0);

    // A form taller than the rail, stubbed into the panel's own portal host.
    await page.evaluate(() => {
      const host = document.querySelector('[data-slot="editor-panel-host"]')!;
      for (let i = 0; i < 40; i++) {
        const row = document.createElement('div');
        row.textContent = `Field ${i}`;
        row.style.height = '48px';
        host.append(row);
      }
    });

    // Scoped to the rail: the nav has a `sidebar-content` of its own, and an
    // unscoped selector finds that one and reports a box that never overflows.
    const scroller = page.locator('[data-editor-rail] [data-slot="sidebar-content"]');
    const overflow = await scroller.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      return { scroll: el.scrollHeight, client: el.clientHeight, top: el.scrollTop };
    });

    // It really does overflow, or the rest of this passes on a short form.
    expect(overflow.scroll).toBeGreaterThan(overflow.client + 200);
    expect(overflow.top).toBeGreaterThan(0);

    // And scrolled to the end, the last field is still inside the card rather
    // than painted past its bottom edge.
    const last = (await page
      .locator('[data-slot="editor-panel-host"] > div')
      .last()
      .boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(card.y + card.height);
  });
});
