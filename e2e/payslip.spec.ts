import { expect, test, type Page } from '@playwright/test';
import { SHEET_HEIGHT, worstClip } from './paper';

/**
 * The pay slip is a single fixed A4 frame that *clips* (`CONTEXT.md` §6a).
 * It does not flow through the Paginator, so a row past the bottom is not a
 * second page: it is silently gone, and a wage slip missing a deduction is the
 * exact failure the itemisation requirement exists to prevent.
 *
 * This already happened once, through a fully green Jest suite, because jsdom
 * measures every box as zero. These are the tests that would have caught it.
 */

const sheet = (page: Page) => page.locator('.print-sheet');

test.describe('pay slip', () => {
  test('fits the density it is drawn for: 6 earnings against 5 deductions', async ({
    page,
  }) => {
    await page.goto('/preview/pay-slip');
    await expect(sheet(page)).toBeVisible();

    // The frame itself is exactly one sheet of paper.
    expect((await sheet(page).boundingBox())?.height).toBe(SHEET_HEIGHT);

    const clip = await worstClip(sheet(page));
    expect(clip, clip ? `${clip.px}px of "${clip.text}" is hidden` : '').toBeNull();
  });

  /**
   * Nothing is quietly dropped: the last line of each table, and the net figure
   * pinned below both, are all still on the paper.
   *
   * Asserted by name rather than by a count, because the way this fails is that
   * the row renders, lays out, and sits below the clip.
   */
  test('prints the last earning, the last deduction and the net beneath them', async ({
    page,
  }) => {
    await page.goto('/preview/pay-slip');

    const bottom = (await sheet(page).boundingBox())!.y + SHEET_HEIGHT;
    for (const text of ['Performance incentive', 'Group medical premium', 'NET PAY']) {
      const row = page.getByText(text, { exact: false }).first();
      await expect(row).toBeVisible();
      const box = (await row.boundingBox())!;
      expect(
        box.y + box.height,
        `"${text}" runs past the bottom of the page`,
      ).toBeLessThanOrEqual(bottom);
    }
  });

  /**
   * The ceiling, written down.
   *
   * Twelve earnings against seven deductions does not fit, and the sheet clips
   * rather than paginating. That is a known and deliberate limit, not a bug
   * anybody is about to fix: the note in `SlipSheet.tsx` says the real answer
   * is to flow the slip through the Paginator when a slip ever needs a second
   * page.
   *
   * **If this test fails, that day has come.** Delete it and give the crowded
   * fixture the same assertions as the two above.
   */
  test('clips past that density, which is the known ceiling', async ({ page }) => {
    await page.goto('/preview/pay-slip-crowded');
    await expect(sheet(page)).toBeVisible();

    expect(await worstClip(sheet(page))).not.toBeNull();
  });
});
