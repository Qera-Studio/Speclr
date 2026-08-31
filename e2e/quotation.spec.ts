import { expect, test } from '@playwright/test';
import { pagesOf, settled, SHEET_HEIGHT, SHEET_WIDTH, worstClip } from './paper';

/**
 * The Service Quotation is a **fixed-page** document, dark on every page.
 *
 * Every block carries `data-page="own"`, so the page count is arithmetic on
 * the document rather than an outcome of measuring: one cover, one page per
 * service, one more wherever a service has add-ons, then recurring+summary,
 * details and contact. The fixture is the quote actually sent — two services,
 * add-ons on the first — so this expects 7.
 *
 * What is *not* arithmetic, and is the reason this file exists, is whether
 * each of those pages holds its content. jsdom reports every box as zero and
 * so can never see a clipped table row; `QuotationSheet.test.tsx` tests the
 * block list's content, and this tests its geometry.
 */
test.describe('the quotation fits its page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/quotation');
    await settled(page);
  });

  test('gives every block a page of its own, cut to A4 and painted black', async ({
    page,
  }) => {
    const pages = pagesOf(page);
    // cover + 2 services + 1 add-on page + recurring + details + contact
    expect(await pages.count()).toBe(7);

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

  /**
   * The measurement this suite is for, and it checks **two** failures, not one.
   *
   * `packBlocks` marks a block taller than its page `overflows` and renders it
   * `overflow-visible`, which is the right escape for the contract: an
   * unbreakable clause spilling visibly beats one silently cut. Here it is a
   * bug outright. Every block on this document is `own`, so a page that
   * overflows is content running off the edge of the paper with nothing left
   * to catch it — and skipping those pages, the way the other specs do, would
   * skip exactly the case this exists to find.
   *
   * Confirmed to fail before it was trusted: five extra deliverables on the
   * first service and the overflow assertion goes red naming the page.
   */
  test('keeps every block inside the page it was packed onto', async ({ page }) => {
    const pages = pagesOf(page);
    const count = await pages.count();

    for (let i = 0; i < count; i++) {
      const frame = pages.nth(i);
      const spills = await frame.evaluate((el) =>
        el.classList.contains('overflow-visible'),
      );
      expect(spills, `page ${i + 1} is taller than A4 and spills off the paper`)
        .toBe(false);
      const clip = await worstClip(frame);
      expect(clip, clip ? `page ${i + 1} hides ${clip.px}px of "${clip.text}"` : '').toBeNull();
    }
  });

  test('opens on the cover and closes on the "let\'s collaborate" page', async ({
    page,
  }) => {
    const pages = pagesOf(page);
    const first = pages.first();
    const last = pages.last();
    await expect(first.getByText('SERVICE QUOTATION')).toBeVisible();
    await expect(first.getByText('Miss Mehak,')).toBeVisible();
    await expect(
      first.getByText(
        'Quote for Custom Website, Social Media at The Colorist, Coimbatore',
      ),
    ).toBeVisible();
    await expect(last.getByText(/collaborate on what matters to you/i)).toBeVisible();
    await expect(last.getByText('© Qera Studio. All rights reserved')).toBeVisible();
  });

  test('puts each service on its own page, and its add-ons on the next', async ({
    page,
  }) => {
    const pages = pagesOf(page);
    await expect(
      pages.nth(1).getByText('Deliverables [Custom Website]'),
    ).toBeVisible();
    await expect(
      pages.nth(2).getByText('Deliverables [Custom Add-ons]'),
    ).toBeVisible();
    await expect(
      pages.nth(3).getByText('Deliverables [Social Media]'),
    ).toBeVisible();
    // Social Media has no add-ons, so no fourth deliverables table follows it.
    await expect(
      pages.nth(4).getByText('Deliverables [Recurring Infrastructure]'),
    ).toBeVisible();
  });

  test('pins the summary to the foot of the recurring page, built from the pages before it', async ({
    page,
  }) => {
    const frame = pagesOf(page).nth(4);
    await expect(frame.getByText('Recurring Total (Fixed Portion)')).toBeVisible();
    // Custom Website 60,000 base + 1,65,000 add-ons, Social Media 36,750, and
    // 4,570 for the low end of the recurring estimate.
    const row = (name: string) =>
      frame.getByRole('row').filter({ hasText: name }).last();
    await expect(row('Custom Website')).toContainText('₹ 60,000');
    await expect(row('Custom Website')).toContainText('₹ 1,65,000');
    await expect(row('Custom Website')).toContainText('₹ 2,25,000');
    // No add-ons, so that column reads as nothing rather than as zero.
    await expect(row('Social Media')).toContainText('₹ 36,750');
    await expect(row('Social Media')).toContainText('—');
    await expect(row('Recurring Infrastructure')).toContainText('[variable]');
    await expect(frame.getByText('₹ 2,66,320')).toBeVisible();

    // The summary really is at the bottom: below the midpoint of the page.
    const box = await frame.getByText('Recurring Infrastructure').last().boundingBox();
    const sheet = await frame.boundingBox();
    expect(box!.y).toBeGreaterThan(sheet!.y + SHEET_HEIGHT / 2);
  });

  test('cuts three phases from a total between ₹1 and ₹3 lakh, with the terms pinned below', async ({
    page,
  }) => {
    const frame = pagesOf(page).nth(5);
    await expect(frame.getByText('#QS-SQ-2627-001')).toBeVisible();
    await expect(frame.getByText('Phase 3')).toBeVisible();
    await expect(frame.getByText('Phase 4')).toHaveCount(0);
    await expect(frame.getByText('This quote is valid for 14 days.')).toBeVisible();

    // A 2x2 grid: terms 1 and 2 share a row, term 3 starts the next one.
    const box = (re: RegExp) => frame.getByText(re).boundingBox();
    const [one, two, three] = await Promise.all([
      box(/This quote covers exactly/),
      box(/Feedback within 3 working days/),
      box(/Ongoing tools/),
    ]);
    expect(two!.y).toBeCloseTo(one!.y, 0);
    expect(two!.x).toBeGreaterThan(one!.x);
    expect(three!.y).toBeGreaterThan(one!.y);
    expect(three!.x).toBeLessThan(two!.x);
  });

  test('prints the same four corners on every page', async ({ page }) => {
    const pages = pagesOf(page);
    const count = await pages.count();
    for (let i = 0; i < count; i++) {
      const frame = pages.nth(i);
      // Exact, or the cover's "prepared by Qera Studio." matches too.
      await expect(frame.getByText('qera studio', { exact: true })).toBeVisible();
      await expect(frame.getByText('30 Aug 2026')).toBeVisible();
      await expect(frame.getByText('Confidential & Proprietary')).toBeVisible();
      await expect(
        frame.getByText(`Page ${String(i + 1).padStart(2, '0')}`),
      ).toBeVisible();
    }
  });
});
