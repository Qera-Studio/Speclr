import { test, expect } from '@playwright/test';

/**
 * A restored onboarding draft has to leave the form **alive**.
 *
 * Both cases are browser measurements, which is why they are not in Jest, and
 * the reason is specific: this app compiles with `reactCompiler: true`, and
 * Jest runs the source uncompiled, so no Jest test can see a compiler bug.
 *
 * The bug this guards. react-hook-form's `reset()` discards every registered
 * field unless told `keepFieldsRef`, and relies on the next render calling
 * `register('name')` again to rebuild them. The compiler memoises that call,
 * so nothing re-registers, and from the restore on every typed-into field is
 * deaf: typing and pasting change the screen and not the form, blur never
 * validates, and a submit checks the restored store instead of what is
 * visible. It only happens on the *second* visit to a step, because only then
 * is there a draft to restore, which is what made it look intermittent.
 *
 * **The first version of the first test passed against that dead form.** It
 * checked that the draft was painted and that no error showed after a blur,
 * and a form that hears nothing shows no error. So the test now does the one
 * thing a dead form cannot: it changes the field after the restore and
 * requires the form to have noticed, twice, in both directions.
 */
test.describe('an onboarding draft', () => {
  test('is restored and the fields still hear what is typed', async ({ page }) => {
    await page.goto('/preview/client-draft');

    await page.getByLabel('Full name').click();
    await page.keyboard.type('Ravisha Bhutani');
    await page.getByLabel('Email').click();
    await page.keyboard.type('ekal@example.test');
    // Past the debounce, so the draft is written.
    await page.waitForTimeout(600);

    // A reload is the cheapest remount; moving between steps does the same.
    await page.reload();
    const name = page.getByLabel('Full name');
    await expect(name).toHaveValue('Ravisha Bhutani');
    await expect(page.getByLabel('Email')).toHaveValue('ekal@example.test');

    // Clearing the restored value and leaving must be refused: `onTouched`
    // validates on blur, and a form that has stopped listening never would.
    await name.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Tab');
    await expect(page.getByText('A name is required.')).toBeVisible();

    // And a new value must clear the error live and reach the draft.
    await name.click();
    await page.keyboard.type('Someone Else');
    await expect(page.getByText('A name is required.')).toHaveCount(0);
    await expect
      .poll(async () =>
        page.evaluate(
          () => JSON.parse(sessionStorage.getItem('speclr:draft:new:identity') ?? '{}').name,
        ),
      )
      .toBe('Someone Else');
  });

  test('keeps an edit made inside the debounce window', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/preview/client-draft');

    const name = page.getByLabel('Full name');
    await name.click();
    await page.keyboard.type('X');
    await page.waitForTimeout(600);

    // Replace it by paste and leave at once. A paste is one event where typing
    // is many, so this window is far easier to leave inside than it looks.
    await name.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.evaluate(() => navigator.clipboard.writeText('Ravisha Bhutani'));
    await page.keyboard.press('ControlOrMeta+v');
    await page.reload();

    const restored = page.getByLabel('Full name');
    await expect(restored).toBeVisible();
    await expect(restored).toHaveValue('Ravisha Bhutani');
  });
});
