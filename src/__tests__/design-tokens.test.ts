import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { policedFiles, violations } from './policedSource';

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
 * `design-system.test.ts` is its sibling, policing which primitive was used;
 * both walk the tree through `policedSource.ts` so the exemptions cannot drift
 * apart.
 */

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

  /**
   * The neutrals are taupe, and all of one taupe.
   *
   * A near-neutral is any token under 0.05 chroma: it reads as a surface or as
   * text on one, not as a signal. Every one of those must sit at hue 40, since
   * two surfaces a few degrees apart is the drift this palette replaced,
   * arrived at one token at a time by somebody eyeballing a single line.
   * Pure achromatic is allowed and is what the alpha-white hairlines use.
   *
   * The two exemptions are the pale blues that sit *on* `--primary`. They are
   * low-chroma by lightness rather than by role: a foreground on a chromatic
   * fill belongs to that fill's hue, and warming it would put a taupe label on
   * a blue button.
   */
  it('keeps every near-neutral token on one hue', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const strays: string[] = [];
    for (const [, name, C, h] of css.matchAll(
      /(--[a-z0-9-]+):\s*oklch\([\d.]+\s+([\d.]+)\s+([\d.]+)/g,
    )) {
      if (name.endsWith('primary-foreground')) continue;
      if (Number(C) >= 0.05 || Number(C) === 0) continue;
      if (Number(h) !== 40) strays.push(`${name}: chroma ${C} at hue ${h}, not 40`);
    }
    expect(strays).toEqual([]);
  });
});
