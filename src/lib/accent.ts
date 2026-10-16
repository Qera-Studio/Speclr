/**
 * The eight accent hues, and the one way a category is drawn in one.
 *
 * The tokens live in `globals.css` (see their note there) and are measured by
 * `contrast.test.ts` against a wash of themselves. This file is the only thing
 * that names them, which is the point: a call site picks a *category*, never a
 * colour, so the day a ninth category arrives nobody has to go looking for
 * which hues are already spoken for.
 *
 * **An accent carries no meaning.** It says "this one differs from that one",
 * nothing more. The label beside it is what says what the thing is; the colour
 * only lets the eye group a column it is scanning rather than reading. That is
 * also why this is safe for a category set that will grow: the hue a category
 * gets is arbitrary, so reassigning one costs a reader nothing.
 *
 * Colour is never the only carrier (WCAG 1.4.1). Every badge prints its own
 * text, so the hue is redundant by construction and a reader who cannot
 * distinguish violet from magenta loses nothing but the grouping aid.
 */

import { cn } from './utils';

export const ACCENTS = [
  'violet',
  'cyan',
  'teal',
  'green',
  'amber',
  'orange',
  'rose',
  'magenta',
] as const;

export type Accent = (typeof ACCENTS)[number];

/**
 * The badge: the hue as text, a hairline of it at 30%, and a wash of it at the
 * alpha `contrast.test.ts` measured (10% light, 12% dark).
 *
 * **Not a pill.** `rounded-sm` is 0.6 of the app's radius, which reads as a tag
 * rather than as a status chip, and it is what keeps a category badge visually
 * distinct from `StatusBadge`, whose job really is a state.
 *
 * The three colours are one token at three alphas rather than three tokens,
 * which is what makes them incapable of drifting: change the hue and the fill,
 * the border and the text all move together. `ui/badge.tsx` is deliberately not
 * used — its variants are all `rounded-full` and semantic (`default` is
 * `--primary`), and adding eight hue variants to it would put the palette in a
 * primitive that has no business knowing about industries.
 */
export function accentBadge(accent: Accent, className?: string, quiet = false) {
  return cn(
    'inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-sm border px-1.5',
    // `font-normal`, down from `font-medium`. A coloured word on a wash of its
    // own hue already carries more weight than the text beside it, so the extra
    // stroke was compounding an emphasis the colour had spent: the badges read
    // as louder than the client's name, which is the thing on the row that
    // actually matters.
    'text-caption font-normal whitespace-nowrap',
    ACCENT_CLASSES[accent],
    // The ink: the same hue, desaturated at the same lightness, on a lighter
    // wash, so it reads quieter without giving up contrast. A lighter wash
    // only moves the ground away from the text, so the measured case in
    // `contrast.test.ts` (10%/12%) stays the worst one.
    quiet && ACCENT_INK[accent],
    className,
  );
}

const ACCENT_INK: Record<Accent, string> = {
  violet: 'text-accent-violet-ink bg-accent-violet/8 dark:bg-accent-violet/10',
  cyan: 'text-accent-cyan-ink bg-accent-cyan/8 dark:bg-accent-cyan/10',
  teal: 'text-accent-teal-ink bg-accent-teal/8 dark:bg-accent-teal/10',
  green: 'text-accent-green-ink bg-accent-green/8 dark:bg-accent-green/10',
  amber: 'text-accent-amber-ink bg-accent-amber/8 dark:bg-accent-amber/10',
  orange: 'text-accent-orange-ink bg-accent-orange/8 dark:bg-accent-orange/10',
  rose: 'text-accent-rose-ink bg-accent-rose/8 dark:bg-accent-rose/10',
  magenta: 'text-accent-magenta-ink bg-accent-magenta/8 dark:bg-accent-magenta/10',
};

/**
 * Written out per hue rather than interpolated into a template string, because
 * Tailwind's scanner reads source text: `text-accent-${accent}` compiles to
 * nothing at all, and the failure is a colourless badge with no error anywhere.
 */
const ACCENT_CLASSES: Record<Accent, string> = {
  violet:
    'text-accent-violet border-accent-violet/30 bg-accent-violet/10 dark:bg-accent-violet/12',
  cyan: 'text-accent-cyan border-accent-cyan/30 bg-accent-cyan/10 dark:bg-accent-cyan/12',
  teal: 'text-accent-teal border-accent-teal/30 bg-accent-teal/10 dark:bg-accent-teal/12',
  green:
    'text-accent-green border-accent-green/30 bg-accent-green/10 dark:bg-accent-green/12',
  amber:
    'text-accent-amber border-accent-amber/30 bg-accent-amber/10 dark:bg-accent-amber/12',
  orange:
    'text-accent-orange border-accent-orange/30 bg-accent-orange/10 dark:bg-accent-orange/12',
  rose: 'text-accent-rose border-accent-rose/30 bg-accent-rose/10 dark:bg-accent-rose/12',
  magenta:
    'text-accent-magenta border-accent-magenta/30 bg-accent-magenta/10 dark:bg-accent-magenta/12',
};

/**
 * The same hues as a fill for a small disc: an avatar's initials.
 *
 * A heavier wash than `accentBadge` (20%/25% against 10%/12%) because a 20px
 * circle holding two letters has far less area to carry the colour than a badge
 * with a border around it, and at the badge's alpha a disc reads as grey.
 *
 * The text is the full-strength hue, exactly as the badge's is, so the pair
 * `contrast.test.ts` measures still bounds it: a heavier ground under the same
 * foreground is *more* contrast, not less, because the ground moves toward the
 * text. The measured case remains the worst one.
 */
export const ACCENT_TINTS: Record<Accent, string> = {
  violet: 'text-accent-violet bg-accent-violet/20 dark:bg-accent-violet/25',
  cyan: 'text-accent-cyan bg-accent-cyan/20 dark:bg-accent-cyan/25',
  teal: 'text-accent-teal bg-accent-teal/20 dark:bg-accent-teal/25',
  green: 'text-accent-green bg-accent-green/20 dark:bg-accent-green/25',
  amber: 'text-accent-amber bg-accent-amber/20 dark:bg-accent-amber/25',
  orange: 'text-accent-orange bg-accent-orange/20 dark:bg-accent-orange/25',
  rose: 'text-accent-rose bg-accent-rose/20 dark:bg-accent-rose/25',
  magenta: 'text-accent-magenta bg-accent-magenta/20 dark:bg-accent-magenta/25',
};

/**
 * The swatch: one solid block of the hue, for a category that already has its
 * name printed beside it (a document's type).
 *
 * Nothing sits inside it, so it is the full-strength token as a fill rather
 * than a wash, and `contrast.test.ts` has nothing to measure: there is no text
 * on it. The edge is the house hairline, `ring-foreground` at a low alpha and
 * inset, which composites darker than the fill in light and lighter in dark
 * without a second token per hue. The one-pixel drop is `RaisedChip`'s, so the
 * two small boxes on a row are raised the same way.
 */
export function accentSwatch(accent: Accent, className?: string) {
  return cn(
    'inline-block size-3 shrink-0 rounded-xs ring-1 ring-foreground/15 ring-inset',
    'shadow-[0_1px_1px_-0.5px_var(--border)]',
    ACCENT_FILLS[accent],
    className,
  );
}

const ACCENT_FILLS: Record<Accent, string> = {
  violet: 'bg-accent-violet',
  cyan: 'bg-accent-cyan',
  teal: 'bg-accent-teal',
  green: 'bg-accent-green',
  amber: 'bg-accent-amber',
  orange: 'bg-accent-orange',
  rose: 'bg-accent-rose',
  magenta: 'bg-accent-magenta',
};

/**
 * A stable hue for any string, for a set nobody has enumerated.
 *
 * `PersonCell` needs a colour per person, and people are not a fixed list, so
 * the name hashes to a hue: the same person is the same colour in every row
 * and a new hire needs no edit here.
 *
 * It is deliberately **not** how a real category set works. Industries are an
 * enum on the record and each names its hue explicitly (`domain/industry.ts`),
 * because a hash puts two adjacent rows on neighbouring hues often enough to
 * matter and nobody can correct it without renaming the thing.
 */
export function accentFor(key: string): Accent {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return ACCENTS[Math.abs(hash) % ACCENTS.length];
}
