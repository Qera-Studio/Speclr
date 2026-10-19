import { expect, test } from '@playwright/test';
import { SHEET_HEIGHT, worstClip } from './paper';

/**
 * The six document types that had no measurement at real A4 (18 October 2026,
 * `ROADMAP.md` Phase 3). The first finalize claims a number for ever, so a
 * row cut off by the frame has to be found here, before one is issued.
 *
 * Two shapes, two checks. The receipt, the credit note and the stipend slip
 * are fixed one-page frames that clip, so nothing may be hidden and the frame
 * may not grow. The letters flow, so nothing can clip; what can go wrong is
 * the page count, which is measured on a real print-to-PDF.
 */

const SHEET = '.print-sheet';

for (const [fixture, mustShow] of [
  ['receipt', ['QS-INV-2627-001', 'UTR HDFCN52026062012345678', 'AMOUNT RECEIVED', 'It is not a tax invoice']],
  ['credit-note', ['TOTAL CREDITED', 'Deficiency in service']],
  ['stipend-slip', ['Monthly stipend', 'Travel reimbursement']],
] as const) {
  test(`${fixture} fits its one page with nothing hidden`, async ({ page }) => {
    await page.goto(`/preview/${fixture}`);
    const sheet = page.locator(SHEET);
    await expect(sheet).toBeVisible();
    for (const text of mustShow) await expect(sheet).toContainText(text);

    const clip = await worstClip(sheet);
    expect(clip, clip ? `${clip.px}px of "${clip.text}" is hidden` : '').toBeNull();
    expect((await sheet.boundingBox())?.height).toBeLessThanOrEqual(SHEET_HEIGHT + 1);
  });
}

/** Count the pages of the document as the browser would print it. */
async function printedPages(page: import('@playwright/test').Page): Promise<number> {
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  await page.emulateMedia({ media: 'screen' });
  return (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

for (const [fixture, pages, mustShow] of [
  ['offer-employee', 2, 'gross annual salary'],
  ['offer-intern', 2, 'stipend'],
  ['experience-letter', 1, 'TO WHOMSOEVER IT MAY CONCERN'],
  ['exit-employee', 1, 'RELIEVING LETTER'],
  ['exit-intern', 1, 'INTERNSHIP COMPLETION LETTER'],
] as const) {
  test(`${fixture} prints on ${pages} page${pages === 1 ? '' : 's'}`, async ({ page }) => {
    await page.goto(`/preview/${fixture}`);
    await expect(page.locator(SHEET)).toContainText(mustShow);
    expect(await printedPages(page)).toBe(pages);
  });
}
