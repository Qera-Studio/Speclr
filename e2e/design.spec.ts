import { test, expect } from '@playwright/test';

/**
 * The component library, measured, in both themes.
 *
 * `DesignPage.test.tsx` owns the behaviour: which component the rail
 * selects, what the URL carries, and that the specimens are live. None of that
 * needs a browser. **This file owns the one claim that only a browser can
 * check: that a specimen shows the component the way the app shows it.**
 *
 * That claim is the whole reason the page exists, and it is falsifiable in a
 * way the Jest suite cannot see. A specimen drawn on the wrong background would
 * render a control whose edges separate here and vanish in a table footer, and
 * the library would then be a place where a component is signed off looking
 * unlike the thing that ships. jsdom resolves no stylesheet, so there a class
 * name is a string rather than a colour and every one of these passes trivially.
 *
 * The measurement is against `/preview/record-table?long=1`, which carries the
 * real table footer. Comparing the library to a number written down here would
 * only pin the library to a number; comparing it to the real surface is what
 * makes it a mirror, and it goes red if *either* side moves.
 *
 * **The first version of this file was vacuous**, and it is worth recording how:
 * it read each element's own `background-color`, and the pager's `<nav>` has
 * none, so both sides returned `rgba(0,0,0,0)` and the comparison held whatever
 * surface the specimen was drawn on. It was confirmed green against a stage
 * moved to `bg-card`, which is exactly the bug it claims to catch. `surfaces`
 * now walks to the first painted ancestor. The other half of that lesson is
 * that when the fix landed, **only dark mode went red**: `--card` and
 * `--sidebar` are both near-white in light, so the wrong surface is invisible
 * there. A one-theme version of this test would still be vacuous.
 */

/**
 * The colours actually painted behind each named element, as sRGB bytes.
 *
 * **It walks up to the first ancestor with a non-transparent fill**, which is
 * what the eye sees and is the half this test got wrong first. Measuring an
 * element's own `background-color` reports `rgba(0,0,0,0)` for anything
 * unfilled, and the pager's `<nav>` is unfilled: a version of this test that
 * read it directly passed against a specimen drawn on the wrong surface
 * entirely, because both sides returned transparent and transparent matches
 * transparent.
 *
 * Painted through a canvas so `lab()` and `oklch()` resolve to bytes.
 */
async function surfaces(page: import('@playwright/test').Page, selectors: Record<string, string>) {
  return page.evaluate((sel) => {
    const srgb = (colour: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b] as [number, number, number];
    };
    /** The fill a reader sees behind `el`: its own, or the first one above it. */
    const painted = (el: Element | null): [number, number, number] | null => {
      for (let node = el; node; node = node.parentElement) {
        const colour = getComputedStyle(node).backgroundColor;
        if (colour && !/^rgba\(0, 0, 0, 0\)$/.test(colour)) return srgb(colour);
      }
      return null;
    };
    const out: Record<string, [number, number, number] | null> = {};
    for (const [name, selector] of Object.entries(sel)) {
      out[name] = painted(document.querySelector(selector));
    }
    return out;
  }, selectors);
}

/** WCAG relative luminance, as a percentage, for comparing two fills. */
const lum = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)) * 100;
};

for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} theme`, () => {
    test.use({ colorScheme: theme });

    /**
     * The specimen's stage is the same band the real pager sits on.
     *
     * This is the mirror claim, and it is why the numbers are compared rather
     * than asserted. A pager judged on `--card` would show a trough that
     * separates cleanly and then disappear into the `--sidebar` footer it
     * actually lives in, which is the exact failure `docs/design.md` §2.10
     * records from the other direction: `--raised` and `--muted` are the same
     * ramp step in dark, so a pill on the wrong trough had a delta of 0.0.
     *
     * ---
     *
     * **Was left red on 18 September 2026 and resolved on 4 October.** The
     * library's stage had moved to `--background`, so the pager was signed off
     * on white in light and on gray-900 in dark, where the real footer is
     * `--sidebar`. Of the three ways out (stage the specimen on `--sidebar`,
     * assert pill-vs-container only, or restyle the pager), the first was
     * chosen: `Specimen` takes `stage="sidebar"` and the pager specimens pass
     * it, so this test passes on its real claim rather than a weakened one.
     * The trough has had no fill since the same day, so its row compares two
     * transparent values; the band is the comparison that does the work.
     */
    test('draws the pager on the same band the real table footer does', async ({ page }) => {
      await page.goto('/preview/record-table?long=1');
      await expect(page.locator('[data-slot="pagination"]')).toBeVisible();
      const real = await surfaces(page, {
        band: '[data-slot="pagination"]',
        trough: '[data-slot="page-runs"]',
        pill: '[aria-current="page"]',
      });

      await page.goto('/preview/design?section=atoms&item=pagination');
      const specimen = page.locator('[role="group"][aria-label="Windowed"]');
      await expect(specimen.locator('[data-slot="pagination"]')).toBeVisible();
      const shown = await surfaces(page, {
        band: '[aria-label="Windowed"] [data-slot="pagination"]',
        trough: '[aria-label="Windowed"] [data-slot="page-runs"]',
        pill: '[aria-label="Windowed"] [aria-current="page"]',
      });

      // The band the pager is drawn on: identical, not merely close. The
      // library picks a surface rather than inheriting one, so this is the
      // assertion that catches it picking the wrong one.
      expect(shown.band).toEqual(real.band);
      expect(shown.trough).toEqual(real.trough);
      expect(shown.pill).toEqual(real.pill);
    });

    /**
     * The active page is distinguishable from its container.
     *
     * Duplicated in spirit from `shell-sheets.spec.ts`, deliberately: that one
     * guards the table footer and this one guards the surface a component is
     * *signed off* on. A library that showed an invisible pill would sign off
     * an invisible pill.
     *
     * Fill **or** stroke: what is ruled out is having neither.
     */
    test('distinguishes the active page from its container', async ({ page }) => {
      await page.goto('/preview/design?section=atoms&item=pagination');
      const shown = await surfaces(page, {
        trough: '[aria-label="Windowed"] [data-slot="page-runs"]',
        pill: '[aria-label="Windowed"] [aria-current="page"]',
      });
      const stroke = await page
        .locator('[aria-label="Windowed"] [aria-current="page"]')
        .evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            width: parseFloat(style.borderTopWidth),
            colour: style.borderTopColor,
          };
        });

      const fillDelta = Math.abs(lum(shown.pill!) - lum(shown.trough!));
      const stroked = stroke.width > 0 && !/^rgba\(.*,\s*0\)$/.test(stroke.colour);
      expect(fillDelta > 0.5 || stroked).toBe(true);
    });
  });
}

/**
 * The four specimens show four different shapes.
 *
 * A library whose variants render alike is a library that documents one thing
 * four times, and this is the failure mode a screenshot review passes: every
 * box has a pager in it, so the page looks complete. The lengths chosen are the
 * boundaries where the component changes shape, and the merged specimen opens
 * at the *end* because the leading merge is what every long list shows on open.
 */
test('shows each shape of the pager exactly once', async ({ page }) => {
  await page.goto('/preview/design?section=atoms&item=pagination');

  const runsOf = async (name: string) =>
    page.locator(`[role="group"][aria-label="${name}"] [data-slot="page-run"]`).allTextContents();

  await expect(page.locator('[role="group"]')).toHaveCount(4);
  expect(await runsOf('Single page')).toEqual([]);
  expect(await runsOf('Short list')).toEqual(['123456']);
  expect(await runsOf('Windowed')).toEqual(['1', '9101112', '23']);
  // The trailing merge: the last four in one run, the leading anchor alone.
  expect(await runsOf('Merged at the ends')).toEqual(['1', '20212223']);
});

/**
 * A painted hairline stands where numbers are missing (§2.10).
 *
 * Measured rather than asserted as a class, and the measurement is the point:
 * the separator replaced a bare gap precisely because a gap stopped being
 * legible once one container held everything, so a test that only counted
 * elements would pass against the version this fixed. It has to have width and
 * it has to be painted. Without it `1 7 8 9 10 23` is a lie about which numbers
 * are adjacent.
 */
test('separates the runs with a visible rule', async ({ page }) => {
  await page.goto('/preview/design?section=atoms&item=pagination');
  const runs = page.locator('[aria-label="Windowed"] [data-slot="page-run"]');
  const gaps = page.locator('[aria-label="Windowed"] [data-slot="page-gap"]');

  // Three runs away from the ends, so two separators: one per elision, and
  // never a trailing one, which would claim pages past the last page.
  await expect(runs).toHaveCount(3);
  await expect(gaps).toHaveCount(2);

  const drawn = await gaps.first().evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      fill: style.backgroundColor,
    };
  });
  expect(drawn.width).toBeGreaterThan(0);
  expect(drawn.height).toBeGreaterThan(0);
  expect(drawn.fill).not.toMatch(/rgba\(.*,\s*0\)/);
});

/**
 * A merged run gets no separator.
 *
 * The other half of the rule, and the one that fails silently: a rule drawn
 * between two adjacent numbers claims something is elided when nothing is,
 * which is the same lie in reverse.
 */
test('draws no rule where two runs are merged', async ({ page }) => {
  await page.goto('/preview/design?section=atoms&item=pagination');
  const merged = page.locator('[aria-label="Merged at the ends"]');

  await expect(merged.locator('[data-slot="page-run"]')).toHaveCount(2);
  await expect(merged.locator('[data-slot="page-gap"]')).toHaveCount(1);
  // A short list elides nothing at all.
  await expect(
    page.locator('[aria-label="Short list"] [data-slot="page-gap"]'),
  ).toHaveCount(0);
});
