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
