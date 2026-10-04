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

  /**
   * A last page that overflows must not become a blank sheet.
   *
   * The bug, seen on a real contract: 40 pages on screen, 41 in the downloaded
   * PDF, the last blank. A packed page whose single block measures taller than
   * the page keeps `overflow: visible` so the excess is seen rather than
   * silently cut (`pagination.ts`), and on the *last* page that spill is
   * content after the final page break, so the browser gives it a sheet of its
   * own. A contract's Execution page is exactly the shape that trips it: sparse,
   * and a pixel or two over.
   *
   * Built here rather than found in a fixture because no fixture has one — the
   * test above passes on the real contract and always did, which is precisely
   * why this shipped. The frames are the ones `PrintPages` emits, and the
   * middle-page case is included because it is what says the fix is *targeted*:
   * clipping every page in print would throw away the visible-overflow
   * behaviour the contract depends on, and this would still pass.
   *
   * Confirmed to fail before the fix: 6 pages with the last overflowing gave 7.
   */
  test('does not add a sheet when the last page overflows', async ({ page }) => {
    await page.goto('/preview/contract');
    await settled(page);

    const build = (overflowIndex: number | null, count = 6) =>
      page.evaluate(
        ({ count, overflowIndex }) => {
          const column = document.querySelector('.doc-print-column')!;
          const frames: HTMLDivElement[] = [];
          for (let i = 0; i < count; i++) {
            const frame = document.createElement('div');
            frame.className = `paginatorPage w-[794px] box-border flex flex-col [&>*]:shrink-0 p-[12px] h-[1123px] ${
              i === overflowIndex ? 'overflow-visible' : 'overflow-hidden'
            } bg-white text-black`;
            const block = document.createElement('div');
            // Taller than the page, so it spills wherever the frame allows it.
            block.style.height = i === overflowIndex ? '1400px' : '200px';
            block.textContent = `Page ${i + 1}`;
            frame.appendChild(block);
            frames.push(frame);
          }
          column.replaceChildren(...frames);
        },
        { count, overflowIndex },
      );

    const sheets = async () =>
      pdfPageCount(await page.pdf({ format: 'A4', printBackground: true }));

    await build(null);
    expect(await sheets()).toBe(6);

    // The case that produced the blank page.
    await build(5);
    expect(await sheets()).toBe(6);

    // And a middle page still spills onto the sheet that already follows it.
    await build(2);
    expect(await sheets()).toBe(6);
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
    // Anchored: the row's menu names the document too, so a substring match
    // finds its cell as well as the number's.
    await expect(page.getByRole('cell', { name: /^QS-INV-2627-001/ })).toBeVisible();
  });
});
