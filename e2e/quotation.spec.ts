import { expect, test } from '@playwright/test';
import { pagesOf, settled, SHEET_HEIGHT, SHEET_WIDTH, worstClip } from './paper';

/**
 * The Service Quotation is the one sheet that is dark on every page, not just
 * a cover, and (like the contract) genuinely paginates: a fixed cover page, a
 * fixed closing page, and between them two "Pricing" sections, recurring
 * lines, and a milestone schedule, packed by `usePagination` from a flat
 * block list exactly the way the contract is.
 *
 * Every number the packer works from is a measured height, so this is
 * invisible to jsdom by construction — `QuotationSheet.test.tsx` tests the
 * block list's content, not its layout.
 */
test.describe('the quotation fits its page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/quotation');
    await settled(page);
  });

  test('every page is cut to A4 and painted black', async ({ page }) => {
    const pages = pagesOf(page);
    expect(await pages.count()).toBeGreaterThanOrEqual(3);

    for (const box of await pages.evaluateAll((els) =>
      els.map((el) => ({
        w: (el as HTMLElement).offsetWidth,
        h: (el as HTMLElement).offsetHeight,
        bg: getComputedStyle(el as HTMLElement).backgroundColor,
      })),
    )) {
      expect(box.w).toBe(SHEET_WIDTH);
      expect(box.h).toBe(SHEET_HEIGHT);
      // rgb(0, 0, 0) — every page is dark, not just a cover, unlike every
      // other sheet in the app.
      expect(box.bg).toBe('rgb(0, 0, 0)');
    }
  });

  test('opens on a fixed cover page and closes on a fixed "let\'s collaborate" page', async ({
    page,
  }) => {
    const pages = pagesOf(page);
    const first = pages.first();
    const last = pages.last();
    await expect(first.getByText('Service')).toBeVisible();
    await expect(first.getByText('Quotation')).toBeVisible();
    await expect(last.getByText(/collaborate on what matters to you/i)).toBeVisible();
    await expect(last.getByText('© Qera Studio. All rights reserved')).toBeVisible();
  });

  test('keeps every block inside the page it was packed onto', async ({ page }) => {
    const pages = pagesOf(page);
    const count = await pages.count();

    for (let i = 0; i < count; i++) {
      const frame = pages.nth(i);
      if (await frame.evaluate((el) => el.classList.contains('overflow-visible'))) continue;
      const clip = await worstClip(frame);
      expect(clip, clip ? `page ${i + 1} hides ${clip.px}px of "${clip.text}"` : '').toBeNull();
    }
  });

  test('prints both sections with their own subtotal, the recurring note, and the milestone schedule', async ({
    page,
  }) => {
    await expect(page.getByText('Website(s)').first()).toBeVisible();
    await expect(page.getByText('Social Media').first()).toBeVisible();
    await expect(page.getByText('Recurring').first()).toBeVisible();
    await expect(page.getByText('Payment schedule').first()).toBeVisible();
    await expect(page.getByText('Advance on signing')).toBeVisible();
  });

  test('shows the estimated GST line with its disclaimer', async ({ page }) => {
    await expect(page.getByText(/Est\. GST \(18%\)/)).toBeVisible();
    await expect(page.getByText(/not a tax invoice/i)).toBeVisible();
  });

  test('prints a running footer with the document number and a page number on every page', async ({
    page,
  }) => {
    const pages = pagesOf(page);
    const count = await pages.count();
    for (let i = 0; i < count; i++) {
      const frame = pages.nth(i);
      await expect(frame.getByText('Confidential & Proprietary')).toBeVisible();
      await expect(frame.getByText('QS-QTN-2627-001')).toBeVisible();
      await expect(frame.getByText(`Page ${i + 1}`)).toBeVisible();
    }
  });
});
