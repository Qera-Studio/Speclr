import { expect, test } from '@playwright/test';

/**
 * The account card opens on hover as well as on click.
 *
 * Here rather than in Jest for the reason `AdminSidebar.test.tsx` already
 * records about this control: Base UI's menu does not open under jsdom's
 * pointer events when the trigger holds an Avatar, so the assertion there stops
 * at `aria-haspopup`. A real browser is what can tell "hover opens it" from
 * "the prop is spelled right".
 */
test.describe('the account card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/shell');
  });

  test('opens on hover, without a click', async ({ page }) => {
    const trigger = page.locator('[data-slot="sidebar-footer"] button').first();
    await expect(trigger).toBeVisible();

    await trigger.hover();
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('still opens on click', async ({ page }) => {
    const trigger = page.locator('[data-slot="sidebar-footer"] button').first();
    await trigger.click();
    await expect(page.getByRole('menu')).toBeVisible();
  });
});
