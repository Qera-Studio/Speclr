import { expect, test } from '@playwright/test';
import { SHEET_HEIGHT, worstClip } from './paper';

/**
 * The invoice sheet is one fixed A4 frame that clips, exactly like the slips.
 *
 * It grew three things in one pass: a SAC column, three Rule 46 statements
 * under the totals, and a wire-transfer block that prints six rows where the
 * domestic one prints four. Every one of those is a measurement, and jsdom
 * renders every box as zero, so the 1,900 Jest tests cannot see any of it.
 * That is the same blind spot a clipping bug already shipped through once.
 */

const SHEET = '.print-sheet';

test.describe('the invoice fits its page', () => {
  test('a domestic invoice with SAC codes and the declarations', async ({ page }) => {
    await page.goto('/preview/invoice');
    const sheet = page.locator(SHEET);
    await expect(sheet).toBeVisible();

    // The column is there and carrying codes, not merely reserved.
    await expect(page.getByRole('columnheader', { name: 'SAC' })).toBeVisible();
    await expect(sheet).toContainText('998314');

    // The statements Rule 46 wants in words. Absent before this pass.
    await expect(sheet).toContainText('Tax payable on reverse charge: No.');
    await expect(sheet).toContainText('All amounts are in Indian Rupees (INR).');
    await expect(sheet).toContainText('does not require a physical signature');

    expect(await worstClip(sheet)).toBeNull();
    expect((await sheet.boundingBox())?.height).toBeLessThanOrEqual(SHEET_HEIGHT + 1);
  });

  /**
   * The case that grew most. The wire block is two rows taller than the
   * domestic one and one of those rows wraps to two lines, and it sits in the
   * bottom band of a frame that does not stretch.
   */
  test('an export invoice with the wire-transfer block', async ({ page }) => {
    await page.goto('/preview/invoice-export');
    const sheet = page.locator(SHEET);
    await expect(sheet).toBeVisible();

    await expect(sheet).toContainText('KKBKINBBCPC');
    await expect(sheet).toContainText('GB29NWBK60161331926819');
    await expect(sheet).toContainText('Raj Nagar Extension, Ghaziabad 201017, India');

    // A UPI intent is worth nothing to a payer abroad: no foreign banking app
    // reads the QR, and the handle cannot receive an inward remittance. So
    // neither prints.
    await expect(page.getByAltText('UPI payment QR code')).toHaveCount(0);
    await expect(sheet).not.toContainText('UPI ID');

    // The IFSC does print. SWIFT routes to the bank; the IFSC identifies the
    // branch, and every low-cost INR rail a foreign payer uses asks for it.
    await expect(sheet).toContainText('KKBK0000677');

    // The export wording, and the reverse-charge sentence that goes with it.
    await expect(sheet).toContainText('zero rated');
    await expect(sheet).toContainText('account for tax in their own jurisdiction');

    expect(await worstClip(sheet)).toBeNull();
    expect((await sheet.boundingBox())?.height).toBeLessThanOrEqual(SHEET_HEIGHT + 1);
  });

  /** One frame, one sheet. A spill onto a second page is the failure. */
  test('an export invoice prints on one sheet', async ({ page }) => {
    await page.goto('/preview/invoice-export');
    await expect(page.locator(SHEET)).toBeVisible();

    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?![s/\w])/g) ?? []).length;
    expect(pages).toBe(1);
  });
});
