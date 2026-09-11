import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Clicking a row in the documents list opens that document, from anywhere in
 * the row rather than from the number alone.
 *
 * It is one stretched link — an `::after` with `inset-0` over a `relative` row
 * — and that is a *hit area*, which is the one thing jsdom cannot report. Every
 * box there is zero, so a Jest test can only say the anchor exists and carries
 * the right href, which it did all through the bug: the overlay was resolving
 * against the `relative` on `CopyCell` instead of the row, so it covered the
 * Number column and nothing else. The href was perfect and four fifths of the
 * row was dead.
 *
 * So the assertion is what the browser hit-tests at a point, not what the DOM
 * contains. The two controls that must survive the overlay are checked the same
 * way, because "the whole row is clickable" and "the copy button still copies"
 * are the two halves of one arrangement and fixing either one alone breaks the
 * other.
 */

const boxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return box;
};

/** What the browser would deliver a click at the centre of `locator` to. */
async function hitAt(page: Page, locator: Locator) {
  const box = await boxOf(locator);
  return page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x as number, y as number);
      // The anchor's overlay is a pseudo-element, so a hit inside it reports
      // the anchor itself. `closest` covers a hit landing on a child instead.
      const link = el?.closest('a');
      return { tag: el?.tagName ?? null, href: link?.getAttribute('href') ?? null };
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  );
}

test.describe('a documents list row', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/shell');
  });

  const row = (page: Page, number: string) =>
    page.locator('tbody tr').filter({ hasText: number });

  /**
   * The bug, stated as the thing it broke. Type and Date are the two cells with
   * nothing else in them, so a hit there is a hit on the row and nothing else.
   */
  test('opens the document from a cell that is not the number', async ({ page }) => {
    const finalized = row(page, 'QS-INV-2627-001');
    const cells = finalized.locator('td');

    // Type, then Date. Both must reach the anchor, not the cell they sit in.
    for (const index of [2, 4]) {
      const hit = await hitAt(page, cells.nth(index));
      expect(hit.href).toBe('/client/docs/inv-1/print');
    }
  });

  /** A draft's row is the same arrangement, pointed at its editor. */
  test('opens a draft in its editor, from the same places', async ({ page }) => {
    const draft = row(page, 'Service Quotation');
    const hit = await hitAt(page, draft.locator('td').nth(2));
    expect(hit.href).toBe('/client/docs/sq-1');
  });

  /**
   * The other half. The copy button and the row actions sit *over* the overlay,
   * and they have to keep their own hit area or the fix for the row would cost
   * the two controls in it. Both are revealed on hover, so the row is hovered
   * first, exactly as a person would.
   */
  test('leaves the copy button and the row actions clickable', async ({ page }) => {
    const finalized = row(page, 'QS-INV-2627-001');
    await finalized.hover();

    const copy = finalized.getByRole('button', { name: /copy document number/i });
    expect((await hitAt(page, copy)).tag).not.toBe('TD');

    const download = finalized.getByRole('button', { name: /download pdf/i });
    expect((await hitAt(page, download)).href).toBeNull();
  });
});
