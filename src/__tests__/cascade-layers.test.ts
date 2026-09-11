import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The toast overrides must stay outside every `@layer`.
 *
 * This is the §5e mechanism applied to the cascade, and it exists because the
 * bug it guards was invisible twice. Sonner ships its stylesheet **unlayered**,
 * and an unlayered rule beats every layered rule whatever the specificity,
 * because the browser compares layers before it ever reaches specificity. So
 * the house overrides for the error toast failed silently in two different
 * ways before the cause was found: first as `toastOptions.classNames` (Tailwind
 * utilities, `@layer utilities`), then as the same selectors written inside
 * `@layer base`. Both looked correct in the diff, both passed the whole suite,
 * and neither changed a single pixel.
 *
 * jsdom cannot catch this: it does not implement layer ordering, so a rule that
 * loses the cascade in Chrome still "applies" in a unit test. What *can* be
 * checked is the thing that decides the outcome, which is a property of the
 * file rather than of the renderer: is the rule nested inside a layer block.
 *
 * The failure mode is somebody tidying the file by folding these back into
 * `@layer base` with everything else, which is a reasonable-looking edit that
 * reintroduces the bug in full.
 */

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

/**
 * Walks the stylesheet to the selector and reports how deeply nested it is.
 *
 * Brace counting rather than a CSS parser: the only question is whether the
 * rule sits inside any block at all, and at top level the answer is zero. A
 * parser would be a dependency for a depth counter.
 */
function braceDepthAt(source: string, needle: string): number {
  const index = source.indexOf(needle);
  if (index === -1) throw new Error(`selector not found in globals.css: ${needle}`);

  let depth = 0;
  for (let i = 0; i < index; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') depth -= 1;
  }
  return depth;
}

describe('sonner overrides sit outside the cascade layers', () => {
  /**
   * Each of these loses to sonner's own rule for the same property the moment
   * it is nested: `align-items: center`, `font-weight: 500` and the default
   * background are all set by the library's unlayered stylesheet.
   */
  const overrides = [
    "[data-sonner-toast][data-styled='true'] {",
    "[data-sonner-toast][data-styled='true'] [data-title],",
    "[data-sonner-toast][data-styled='true'][data-type='error'] {",
  ];

  it.each(overrides)('%s is at top level, not inside a layer', (selector) => {
    expect(braceDepthAt(css, selector)).toBe(0);
  });

  /**
   * The counter has to be able to fail, or it asserts nothing. `:root` really
   * is inside `@layer base`, so a depth of zero here would mean the walk is
   * broken rather than that the file is right.
   */
  it('counts a rule that is inside a layer as nested', () => {
    expect(braceDepthAt(css, '@layer base {')).toBe(0);
    expect(braceDepthAt(css, 'align-items: flex-start;')).toBeGreaterThan(0);
  });
});
