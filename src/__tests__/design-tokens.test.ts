import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * The design system's enforcement layer.
 *
 * speclr's palette is deliberately tiny: neutral greys, one primary blue, one
 * destructive red, one warning amber — all defined as tokens in
 * `src/app/globals.css` and consumed as `bg-primary` / `text-destructive` /
 * `border-warning`. Reaching past the tokens for a raw Tailwind palette class
 * (`text-blue-500`) or a hex literal is how a design system quietly dies: the
 * colour stops responding to the theme, drifts in dark mode, and skips the
 * contrast tuning the token already did.
 *
 * A gallery page documents the rule. This test is what actually holds it.
 */

/**
 * Where hard-coded colour is correct, and why:
 *
 * - `components/docs/sheets/` — pixel-faithful invoice/contract/letter
 *   artifacts. They print to paper in fixed ink, must not shift with the app
 *   theme, and are explicitly out of scope for redesign (see AGENTS.md).
 * - `components/spec/PreviewMockups/` — imitations of *other people's* UI
 *   (Chrome's tab strip, iOS home screen, a Google SERP). Their colours belong
 *   to Google and Apple, not to us; theming them would defeat the preview.
 * - `__tests__/` — assertions frequently name a class in order to prove it is
 *   absent.
 */
const EXEMPT = [
  'src/components/docs/sheets/',
  'src/components/spec/PreviewMockups/',
  '__tests__/',
];

const PALETTE = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal',
  'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink',
  'rose', 'slate', 'gray', 'zinc', 'neutral', 'stone',
].join('|');

const RAW_PALETTE_CLASS = new RegExp(
  `\\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|outline|shadow|accent|caret|decoration|placeholder)-(?:${PALETTE})-\\d{2,3}\\b`,
  'g',
);

const HEX_LITERAL = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

const ROOT = join(__dirname, '..', '..');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      sourceFiles(full, acc);
    } else if (/\.tsx$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Files to police: every `.tsx` under src/, minus the documented exemptions. */
function policedFiles(): string[] {
  return sourceFiles(join(ROOT, 'src'))
    .map((f) => relative(ROOT, f))
    .filter((f) => !EXEMPT.some((ex) => f.includes(ex)))
    .sort();
}

/** `[file, offendingToken]` pairs for every match of `pattern`. */
function violations(pattern: RegExp): string[] {
  const found: string[] = [];
  for (const file of policedFiles()) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    for (const match of source.matchAll(pattern)) {
      found.push(`${file}: ${match[0]}`);
    }
  }
  return found;
}

describe('design tokens', () => {
  it('finds source files to police (guards against the walker silently matching nothing)', () => {
    expect(policedFiles().length).toBeGreaterThan(50);
  });

  it('uses theme tokens, never raw Tailwind palette colours', () => {
    expect(violations(RAW_PALETTE_CLASS)).toEqual([]);
  });

  it('uses theme tokens, never hex colour literals', () => {
    expect(violations(HEX_LITERAL)).toEqual([]);
  });
});
