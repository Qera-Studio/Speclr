import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every colour pair the app actually puts text on, measured, in both themes.
 *
 * This exists because a contrast audit done once is a contrast audit that was
 * true once. Every token here is a number somebody can change in a single line
 * of `globals.css`, and the failure is invisible to the person changing it:
 * nothing looks broken, the text is simply harder to read for people who were
 * never in the room.
 *
 * It caught three real failures the day it was written, and the shape of all
 * three is the same: **a colour was checked against the wrong background.**
 *
 * - `--muted-foreground` was 4.73:1 on white and 4.34:1 on `--muted`, which is
 *   where it most often actually lands (hovered rows, tooltips, muted panels).
 * - `--ring` was 2.59:1 on the light background, under 1.4.11's 3:1 floor for
 *   a focus indicator, which is the one piece of UI a keyboard user has
 *   nothing else to fall back on.
 * - White on `--destructive` was 4.76:1 in light and 2.89:1 in dark, on the
 *   offline bar and the confirm button of every destructive dialog. That is
 *   what `--destructive-foreground` was added for.
 *
 * The maths is sRGB relative luminance (WCAG 2.1 s1.4.3) over tokens parsed
 * from the stylesheet, converted from OKLCH. No browser needed: these are
 * values in a file, and a value in a file can be checked in CI.
 */

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

/** The custom properties declared in one selector block. */
function tokensIn(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const end = css.indexOf('\n}', start);
  const out: Record<string, string> = {};
  for (const [, name, value] of css
    .slice(start, end)
    .matchAll(/^\s*(--[a-z0-9-]+):\s*(oklch\([^)]*\));/gm)) {
    out[name] = value;
  }
  return out;
}

/** OKLCH to linear sRGB, clipped to gamut. Returns the colour and its alpha. */
function toLinearRgb(oklch: string): { rgb: [number, number, number]; alpha: number } {
  const m = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%)?\)/.exec(oklch);
  if (!m) throw new Error(`Not an oklch() value: ${oklch}`);
  const [L, C, h] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clip = (v: number) => Math.max(0, Math.min(1, v));
  return {
    rgb: [
      clip(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s),
      clip(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s),
      clip(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s),
    ],
    alpha: m[4] ? Number(m[4]) / 100 : 1,
  };
}

const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * The WCAG contrast ratio of one token over another.
 *
 * A translucent foreground is composited over its background first, which is
 * how the browser paints it and therefore what the reader actually sees.
 */
function contrast(fg: string, bg: string, tokens: Record<string, string>) {
  const front = toLinearRgb(tokens[`--${fg}`]);
  const back = toLinearRgb(tokens[`--${bg}`]);
  const composited: [number, number, number] =
    front.alpha < 1
      ? (front.rgb.map((v, i) => front.alpha * v + (1 - front.alpha) * back.rgb[i]) as [
          number,
          number,
          number,
        ])
      : front.rgb;
  const [hi, lo] = [luminance(composited), luminance(back.rgb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text pairs, at 4.5:1 (WCAG 1.4.3 AA).
 *
 * A pair is here because the app puts that foreground on that background
 * somewhere, not because the two tokens have matching names.
 * `muted-foreground` on `muted` is the row that matters most and is exactly
 * the one a name-matching list would have missed.
 */
const TEXT_PAIRS: Array<[string, string]> = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'popover'],
  ['muted-foreground', 'muted'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['destructive', 'background'],
  ['destructive', 'card'],
  ['destructive-foreground', 'destructive'],
  ['warning', 'background'],
  ['warning', 'card'],
  ['sidebar-foreground', 'sidebar'],
  ['sidebar-accent-foreground', 'sidebar-accent'],
  ['sidebar-accent-foreground', 'sidebar-active'],
  // The active tab and the active profile. `--raised` is the only token whose
  // light and dark values are a whole step apart in *role*, so it is the one
  // most likely to be nudged in one theme without the other being checked.
  ['foreground', 'raised'],
  ['muted-foreground', 'raised'],
];

/**
 * Non-text pairs, at 3:1 (WCAG 1.4.11).
 *
 * Only the focus ring. `--border` and `--input` are 1.26:1 on the light
 * background and are deliberately not asserted here: 1.4.11 governs boundaries
 * *required* to identify a control, and every input in this app is identified
 * by a visible `<Label>` above it rather than by its outline. Raising them to
 * 3:1 would redraw every form as a grid of hard boxes, which is a design
 * decision and not a compliance one. Recorded rather than silently skipped, so
 * the next reader knows it was weighed.
 */
const UI_PAIRS: Array<[string, string]> = [
  ['ring', 'background'],
  ['ring', 'card'],
];

describe.each([
  ['light', tokensIn(':root')],
  ['dark', tokensIn('.dark')],
])('%s theme', (_theme, tokens) => {
  it.each(TEXT_PAIRS)('%s on %s reaches 4.5:1', (fg, bg) => {
    expect(Number(contrast(fg, bg, tokens).toFixed(2))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s on %s reaches 3:1', (fg, bg) => {
    expect(Number(contrast(fg, bg, tokens).toFixed(2))).toBeGreaterThanOrEqual(3);
  });
});
