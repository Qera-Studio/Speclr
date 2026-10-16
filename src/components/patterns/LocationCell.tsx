'use client';

import { countryName, COUNTRY_SEED } from '@/lib/domain/countries';
import { NIL, cn } from '@/lib/utils';

/**
 * Where a client is: the flag as a raised chip, then the city and the country.
 *
 * **The flag is a container, not a character.** An emoji flag on its own is
 * drawn by the platform's font at whatever size and baseline that font decides,
 * and it sits in a table row beside 11px text looking like a sticker somebody
 * dropped on the page. Boxing it gives the glyph a known size, a known edge and
 * something to cast a shadow against, which is what makes it read as a small
 * physical object in a row of flat text rather than as decoration.
 *
 * Three things the box does that are worth stating:
 *
 * - **The glyph sits *inside* the box, not bleeding out of it.** The first
 *   version scaled the emoji past the container and clipped it, on the theory
 *   that the artwork should be the fill edge to edge. In the browser that hid
 *   the border under the glyph and the chip stopped reading as a container at
 *   all: it was just a flag again, which is the thing this component exists to
 *   avoid. The box is 20px, the glyph 12px, and the ~4px of ground around it is
 *   what makes the border and the shadow visible.
 * - **The shadow is a hairline plus a 1px drop**, not a blur. A blurred shadow
 *   at this size is a grey smudge; what reads as "raised" on a 14px object is a
 *   crisp offset edge, which is the same reason a keycap looks like a keycap.
 * - **`aria-hidden`, and the country is in the text.** A flag is not a name: a
 *   screen reader announcing "flag of India" before "Delhi, India" says it
 *   twice, and some platforms announce the two regional-indicator letters
 *   instead, which is worse than nothing.
 *
 * **A flag is never the only carrier of the country** (WCAG 1.4.1, and plain
 * legibility): the country's name is printed beside it. Two flags at 14px are
 * frequently indistinguishable, and a reader who has not memorised 243 of them
 * is every reader.
 *
 * It sits in `admin/` rather than beside the table that first wanted it because
 * more than one list prints it, which is `PRINCIPLES.md` rule 1: two callers,
 * so it gets its own home instead of being copied into the second one. The same rule the `DateCell` note describes, and
 * the same reason — a value that appears in two lists gets one component that
 * decides how it looks, or the two quietly drift.
 */

/** Built once, not searched per row: this renders on every row of every page. */
const FLAGS: Record<string, string> = Object.fromEntries(
  COUNTRY_SEED.map((country) => [country.iso2, country.flag]),
);

/**
 * The raised chip itself, without a flag in it.
 *
 * Split out under `PRINCIPLES.md` rule 1 the moment a second caller wanted one:
 * the amount column boxes its rupee sign exactly as this boxes a flag, and two
 * copies of a shadow recipe is two things that drift the first time either is
 * touched. The chip decides the size, the edge and the raise; what goes inside
 * it is the caller's.
 *
 * Everything the long note above says about the *box* applies here and is not
 * repeated: 20px with its content at 12px, the ~4px of ground that makes the
 * border visible, and a hairline-plus-1px-drop rather than a blur.
 */
export function RaisedChip({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  /**
   * The chip carries a **value** rather than decorating one beside it, so it
   * stays in the accessibility tree and this is its accessible name.
   *
   * Hiding is the default and the right one for the two original callers: a
   * flag sits beside the country's name and a rupee sign beside its figure, so
   * announcing either repeats what the next node already says, and some
   * platforms read a flag as two regional-indicator letters, which is worse
   * than nothing.
   *
   * It is wrong wherever the chip is the only thing in the cell. A Service
   * item's id is boxed to stop it reading as a row number, and hiding it would
   * leave that column silent: the value would be visible to everyone except
   * the readers who most need the row identified. Passing a label opts back
   * in, and the text inside is then `aria-hidden` so the id is announced once
   * rather than twice.
   */
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      // A chip with a name is a thing on the page rather than a styling span,
      // so it needs a role for that name to attach to.
      role={label ? 'img' : undefined}
      className={cn(
        // `min-w-5 h-5` rather than `size-5`: a square is right for one glyph
        // and wrong for 'I55', which has to be able to widen. A one-glyph chip
        // is unchanged, because `min-width` still floors it at the old 20px and
        // its content never reaches that; only a longer string grows the box,
        // and `px-1` is what keeps that string off the border.
        'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-card px-1',
        'shadow-[0_1px_1px_-0.5px_var(--border),inset_0_1px_0_0_var(--background)]',
        // `` because a glyph's line box carries descender space that
        // would push it off centre in a box this small.
        'text-caption ',
        className,
      )}
    >
      {label ? <span aria-hidden="true">{children}</span> : children}
    </span>
  );
}

/** A country's flag emoji, by ISO code. Blank reads as India, as everywhere. */
export function flagOf(country?: string): string | undefined {
  return FLAGS[(country || 'IN').toUpperCase()];
}

export function LocationCell({
  city,
  country,
}: {
  city?: string;
  /** ISO 3166-1 alpha-2. Blank reads as India, as everywhere else in this app. */
  country?: string;
}) {
  const code = (country || 'IN').toUpperCase();
  const flag = FLAGS[code];
  const name = countryName(code);
  // The city where there is one, because "Delhi, India" is the fact somebody is
  // scanning for and the country alone is the coarser half of it. A record with
  // no city prints the country on its own rather than a stray comma.
  const place = city ? `${city}, ${name}` : name;

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <RaisedChip>{flag ?? '🏳'}</RaisedChip>
      <span className="truncate">{place || NIL}</span>
    </span>
  );
}
