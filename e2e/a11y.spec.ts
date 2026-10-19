import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * An automated accessibility scan of the screens people work in, the launch
 * gate's "axe clean" line (18 October 2026). It fails on critical and serious
 * violations against WCAG 2.1 A and AA.
 *
 * What it does not replace: a keyboard pass and one screen-reader pass on a
 * real flow. axe finds what can be read off the DOM; it cannot tell whether
 * a task makes sense spoken aloud.
 */
const SCREENS = [
  '/preview/services',
  '/preview/service?code=WEB',
  '/preview/leads',
  '/preview/lead?edit',
  '/preview/onboarding?kind=company&country=IN',
  '/preview/clients',
];

for (const path of SCREENS) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const serious = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(
      serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`),
    ).toEqual([]);
  });
}
