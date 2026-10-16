import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { policedFiles, violations } from './policedSource';
import { PALETTE_ESCAPE_MIGRATED_LATER } from './migratedLater';

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

/**
 * The three ways past the two rules above that were actually taken:
 * `text-[var(--gray-400)]` reaches the ramp the tokens exist to hide,
 * `text-[oklch(…)]` is a colour nobody measured, and `rgba(` is a shadow
 * colour the hex rule cannot see.
 */
const PALETTE_ESCAPE = /\[(?:var\(--gray-|oklch\(|rgba?\()/g;

/**
 * The tokens the rest of the system is built on. Each is named here so that
 * deleting one from `globals.css` fails the build rather than silently
 * reverting every `text-body` in the app to Tailwind's default.
 */
const REQUIRED_TOKENS = [
  ...['caption', 'meta', 'control', 'body', 'lead', 'section', 'title', 'display'].map(
    (t) => `--text-${t}:`,
  ),
  ...['caption', 'meta', 'control', 'body', 'lead', 'section', 'title', 'display'].map(
    (t) => `--text-${t}--line-height:`,
  ),
  '--shadow-raised:', '--shadow-overlay:', '--shadow-modal:',
  '--radius-sm:', '--radius-md:', '--radius-lg:', '--radius-xl:',
  '--z-sticky:', '--z-rail:', '--z-overlay:', '--z-modal:', '--z-toast:',
  '--success:', '--success-foreground:',
  '@utility focus-ring',
];

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

  it('never reaches the ramp, a raw oklch() or an rgba() through an arbitrary value', () => {
    expect(violations(PALETTE_ESCAPE, PALETTE_ESCAPE_MIGRATED_LATER, /\.tsx?$/)).toEqual([]);
  });

  it('defines every token the system is built on', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(REQUIRED_TOKENS.filter((t) => !css.includes(t))).toEqual([]);
  });

  it('never defines a radius past xl or a multiplier base', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).not.toMatch(/--radius-[234]xl|--radius:\s/);
  });

  /**
   * The neutrals are achromatic: white, black and grey.
   *
   * A near-neutral is any token under 0.05 chroma: it reads as a surface or as
   * text on one, not as a signal. Every one of those must be chroma 0, because
   * a hint of hue on a surface is a tint (slate's blue was, before 4 October
   * 2026), and a tint arrives one token at a time from somebody eyeballing a
   * single line.
   *
   * The two exemptions are the pale blues that sit *on* `--primary`. They are
   * low-chroma by lightness rather than by role: a foreground on a chromatic
   * fill belongs to that fill's hue.
   */
  it('keeps every near-neutral token achromatic', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const strays: string[] = [];
    for (const [, name, C, h] of css.matchAll(
      /(--[a-z0-9-]+):\s*oklch\([\d.]+\s+([\d.]+)\s+([\d.]+)/g,
    )) {
      if (name.endsWith('primary-foreground')) continue;
      if (Number(C) > 0 && Number(C) < 0.05) {
        strays.push(`${name}: chroma ${C} at hue ${h}; a neutral is chroma 0`);
      }
    }
    expect(strays).toEqual([]);
  });

  /**
   * A neutral is named by its step, never by a value.
   *
   * The ramp is the single place a neutral colour is written; every role is an
   * alias onto it. A raw `oklch()` on a semantic token is how the ramp quietly
   * stops being the source of truth — one surface solved for by hand, then
   * another, and the drift is back.
   *
   * Three kinds of literal are legitimate and are the whole exemption list:
   * the ramp steps themselves, the chromatic signals (which keep their own
   * hues), and the alpha-white hairlines (an overlay composites to a
   * proportion of its ground, which is the point of it).
   *
   * `--accent-<hue>` joins the chromatic set for the obvious reason: a hue is
   * the whole of what it carries, so aliasing it onto a neutral step would
   * leave it with nothing to say. They are held to the contrast floor instead,
   * in `contrast.test.ts`, which is the check that actually applies to them.
   */
  it('defines neutral roles as ramp aliases, not as raw values', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const CHROMATIC =
      /^--(sidebar-)?(primary|destructive|warning|success|chart-\d|accent-[a-z]+(?:-ink)?)(-foreground)?$/;
    const strays: string[] = [];
    for (const [, name, C] of css.matchAll(
      /^\s*(--[a-z0-9-]+):\s*oklch\((?:[\d.]+)\s+([\d.]+)\s+[\d.]+\)/gm,
    )) {
      if (name.startsWith('--gray-') || CHROMATIC.test(name)) continue;
      if (Number(C) === 0) continue;
      strays.push(`${name} is a raw oklch(); use var(--gray-N)`);
    }
    expect(strays).toEqual([]);
  });
});
