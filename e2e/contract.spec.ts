import { expect, test } from '@playwright/test';
import { pagesOf, settled, SHEET_HEIGHT, SHEET_WIDTH, worstClip } from './paper';

/**
 * The contract is the one document that really paginates: twenty-odd pages of
 * prose, set in two columns, packed by `usePagination` from a flat list of
 * atomic blocks.
 *
 * Every number the packer works from is a measured height, so every bug it can
 * have is invisible to jsdom by construction. `ContractSheet.test.tsx` says so
 * in its own docstring and tests the block list instead.
 */
test.describe('contract pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/contract');
    await settled(page);
  });

  test('packs into more than one page, each cut to A4', async ({ page }) => {
    const pages = pagesOf(page);
    expect(await pages.count()).toBeGreaterThan(1);

    for (const box of await pages.evaluateAll((els) =>
      els.map((el) => ({ w: (el as HTMLElement).offsetWidth, h: (el as HTMLElement).offsetHeight })),
    )) {
      expect(box.w).toBe(SHEET_WIDTH);
      expect(box.h).toBe(SHEET_HEIGHT);
    }
  });

  /**
   * Nothing runs off the bottom of the page it was packed onto.
   *
   * The packer marks a page `overflows` when a single block is taller than a
   * page and has nowhere else to go, and renders that one `overflow-visible`
   * rather than hiding half a clause. Those are exempt here: they are the
   * packer reporting an unbreakable block, not losing one. Any other page that
   * overflows means the measurement disagreed with the layout.
   */
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

  /**
   * The cover is a page of its own, and the agreement starts after it.
   *
   * A cheap canary for the packer having got its first measurement wrong: when
   * it does, the cover and clause 1 land together and everything after shifts.
   */
  test('gives the cover its own page', async ({ page }) => {
    const cover = pagesOf(page).first();
    await expect(cover.getByText('Master Service Agreement')).toBeVisible();
    await expect(cover.getByText('1. Definitions and Interpretation')).toHaveCount(0);
  });
});
