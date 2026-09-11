import { expect, test } from '@playwright/test';
import { pagesOf, settled } from './paper';

/**
 * What actually comes out of the printer.
 *
 * Everything else in this suite measures the screen. This one asks Chromium to
 * paginate for paper, which is where `@page { size: A4; margin: 0 }` and the
 * `break-after: page` rules in `src/styles/print.css` finally get exercised.
 * A stylesheet nothing renders is a stylesheet nobody has checked.
 */

/**
 * Pages in a PDF, counted off the page tree.
 *
 * `/Type /Page` also matches `/Type /Pages` (the tree's root node), so the
 * lookahead excludes it. Chromium writes this object uncompressed.
 */
function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s/\w])/g) ?? []).length;
}

test.describe('print output', () => {
  /**
   * The paginated contract prints exactly the pages the preview showed.
   *
   * Same blocks, same packer, so a disagreement here means the browser found a
   * break of its own — which is what `break-inside: avoid` on `.paginatorPage`
   * exists to stop, and what would silently split a clause across two sheets.
   */
  test('the contract prints the pages the packer made, and no more', async ({ page }) => {
    await page.goto('/preview/contract');
    await settled(page);

    const onScreen = await pagesOf(page).count();
    const pdf = await page.pdf({ format: 'A4', printBackground: true });

    expect(pdfPageCount(pdf)).toBe(onScreen);
  });

  /** A slip is one fixed frame and must never spill onto a second sheet. */
  test('a pay slip prints on one sheet', async ({ page }) => {
    await page.goto('/preview/pay-slip');
    await expect(page.locator('.print-sheet')).toBeVisible();

    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    expect(pdfPageCount(pdf)).toBe(1);
  });

  /**
   * Print media hides the app's own furniture.
   *
   * `print.css` unclips the shell and drops anything marked `data-print-hidden`
   * (the toolbar). Emulating print media is the only way to see any of it.
   */
  test('drops the screen-only chrome under print media', async ({ page }) => {
    await page.goto('/preview/invoice');
    await page.emulateMedia({ media: 'print' });

    await expect(page.locator('.print-sheet')).toBeVisible();
    for (const el of await page.locator('[data-print-hidden]').all()) {
      await expect(el).toBeHidden();
    }
  });
});

/**
 * The chrome around a document, named one piece at a time.
 *
 * The test above cannot find a missing `data-print-hidden`, because it only
 * looks at elements that already carry one: chrome nobody marked is chrome it
 * never asks about, and it passed for as long as the top band printed across
 * the head of every document and every ⌘P of a list. So this names each piece
 * of furniture by what it *is*, and `/preview/shell` is where they exist — the
 * document fixtures render outside `(app)` and so have no shell at all, which
 * is the other half of why nothing caught this.
 */
test.describe('the app chrome under print media', () => {
  test('leaves the content and takes the navigation', async ({ page }) => {
    await page.goto('/preview/shell');
    await page.emulateMedia({ media: 'print' });

    // The band across the top: profile switcher, search, clock, bell. This is
    // the one that reached the paper.
    await expect(page.locator('[data-slot="top-panel"]')).toBeHidden();
    for (const rail of await page.locator('[data-slot="sidebar"]').all()) {
      await expect(rail).toBeHidden();
    }

    // And the page itself is still there, or the rule above is hiding the
    // document rather than the furniture around it.
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'QS-INV-2627-001' })).toBeVisible();
  });
});
