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
