/**
 * Two rules every popup anchored to a control obeys, in one place because the
 * four primitives that draw one had each answered them separately and had each
 * answered at least one of them wrong.
 *
 * **1. There is always a gap.** 4px between the anchor and the popup. A submenu
 * sat at `sideOffset={0}` and so overlapped the menu it opened from, which
 * reads as one surface torn rather than two stacked.
 *
 * **2. A popup holding the anchor's own options is never narrower than it.**
 * Same width when the content fits, wider when it does not (a long option
 * label in a narrow rail), never less. A list a few pixels short of the field
 * above it looks like a rendering fault, because it is one.
 *
 * That rule governs *lists*, and the boundary is worth stating because it was
 * originally written as though it governed every popup. A popup holding a
 * **grid** is sized by its content: a calendar is seven columns of two-digit
 * numbers and a day picker is 31 of them, so stretching either to a full-width
 * date field spreads the same numbers over more page and reads as broken
 * rather than as matching. Those two pass `w-auto` and no width floor; see
 * `ui/date-picker.tsx`, which carries the long version.
 *
 * The ring is why there are two numbers rather than one. A focused input,
 * combobox, select or date trigger draws `ring-2`, which is a box-shadow: it
 * paints 2px outside the border box that `--anchor-width` and `sideOffset` are
 * both measured from. So a ringed anchor needs 2px more offset and 4px more
 * width to *look* like the plain 4px gap and the flush edges. Anchors that
 * never ring (a menu button opened by mouse) use the plain values.
 */
export const POPUP_GAP = 4;

/** `POPUP_GAP` plus the 2px of `ring-2` painted outside the anchor's box. */
export const RINGED_POPUP_GAP = 6;

/**
 * `POPUP_GAP` plus the menu's own `p-1`.
 *
 * A submenu's anchor is the *row* it opens from, and that row is inset by the
 * menu's padding, so an offset measured from it is spent crossing the padding
 * before it reaches the edge a reader sees. At `POPUP_GAP` the two surfaces
 * touched: measured correctly, against the wrong box.
 */
export const SUBMENU_GAP = POPUP_GAP + 4;

/**
 * The account card's menu, whose anchor is inset from the edge it must clear.
 *
 * Same problem as `SUBMENU_GAP`, two boxes out, and the second box is the one
 * that is easy to miss. The trigger is a rail row, so it stops at the
 * sidebar's own `p-2` rather than at the sidebar's border; and the sidebar's
 * border is not the edge a reader sees either, because `AdminShell` floats the
 * inset card off it with `m-2`. So there are two 8px insets between the
 * anchor's right edge and the surface the card has to clear.
 *
 * Measured at a 228px trigger inside a 236px rail, with the inset card
 * starting at 244. At `POPUP_GAP` the card opened at 232, inside the rail. At
 * one inset it opened at 238, which clears the rail's border but lands in the
 * 8px channel between the rail and the card: still over the shell's ground,
 * which is what "it opens over the sidebar" means.
 *
 * Two insets plus a 4px seam puts it at 248, past the card's edge. The seam
 * is double the submenu's 2px, asked for after seeing both: this popover
 * clears a card edge with a ring and a shadow on it, where a submenu clears
 * the flat edge of the menu it belongs to, so the same number reads tighter
 * here.
 */
export const RAIL_POPUP_GAP = 8 + 8 + 4;

/**
 * The same popover's *other* axis, and the interesting part is that it is
 * **not** `RAIL_POPUP_GAP`'s two insets again. They cancel here.
 *
 * `align="end"` puts the popover's bottom edge on the anchor's bottom edge,
 * and the anchor's bottom edge is already the card's: the footer's `p-2` lifts
 * the row 8px off the bottom of the rail, and the shell's `m-2` lifts the card
 * 8px off the same bottom, so both land on 712 in a 720px viewport. Measured,
 * not reasoned — the horizontal pair does not cancel because the rail and the
 * card are side by side there, while on this axis they are stacked against the
 * same floor.
 *
 * So all that is left is the seam, and it points the other way from the
 * horizontal one. Horizontally the popover has an edge to *clear*, so the 4px
 * is spent getting past the card. Vertically it clears nothing: it sits
 * alongside the card and its bottom radius reads against the card's, so the
 * 4px holds it *inside* the corner.
 *
 * Positive because a right-side popup's `alignOffset` runs *upward* from an
 * `align="end"` anchor, which is measured rather than assumed: `+12` put the
 * popover 11.5px inside the corner and `-4` put it 3.5px below the card, so
 * the axis points the way the seam wants and the number is the seam itself.
 */
export const RAIL_POPUP_ALIGN_OFFSET = POPUP_GAP;

/**
 * The width of a calendar popup, and therefore of the field that opens one.
 *
 * `w-60` is 15rem, which is exactly what the grid comes to: seven columns of
 * `size-8` day cells (7 × 2rem) plus the popover's own `p-2` on each side
 * (2 × 0.5rem). Confirmed by measuring the calendar at 240px before the field
 * was given this, so the number is the grid's real width rather than one
 * chosen to look close.
 *
 * It is a scale step rather than `w-[calc(7*2rem+1rem)]` because Tailwind will
 * not generate a rule for an arbitrary value containing an unescaped `*`: the
 * class is emitted, nothing is behind it, and the element silently keeps
 * whatever width it had. That failure is invisible in the markup, which is
 * half the reason the e2e below exists.
 *
 * The token exists because rule 2 above runs *backwards* for a grid. A list
 * popup takes its width from the anchor (`--anchor-width`), which a calendar
 * must not do: stretching seven columns to a full-width field spreads the same
 * 28 numbers over more page. But two edges that do not line up read as a fault
 * too, so the **field** takes the calendar's width instead. CSS has no
 * `--content-width` to hand back to an anchor, which is why this is a shared
 * constant and not a variable.
 *
 * Change `size-8` in `ui/calendar.tsx` or the popover's padding and this stops
 * being true, so `e2e/popup.spec.ts` measures the pair rather than trusting it.
 */
export const CALENDAR_WIDTH = "w-60";

/**
 * The same width, for the **field** that opens a calendar.
 *
 * A width with a ceiling, and both halves are load-bearing:
 *
 * `w-60!` makes the field 240px. A plain `w-60` is emitted, valid and silently
 * beaten, because `Field`'s vertical orientation sets `*:w-full` on its
 * children (`ui/field.tsx`) and a child selector outranks a width utility on
 * the child itself; the `!` wins that fight. A definite width is also what a
 * `max-content` grid track reads, which is what lets `FieldRow fit` size a
 * column to the calendar rather than to the placeholder inside it.
 *
 * `max-w-full` lets a column narrower than a calendar shrink the field. This
 * was a `min-w-60` floor once, and `min-width` beats `max-width` in CSS, so
 * nothing could shrink it: two date fields side by side in the editor rail
 * (144px columns) pushed the row 190px past the rail, which scrolled sideways
 * and dragged every field with it. A percentage floor fixed that and broke
 * the `fit` rows instead, because a percentage contributes nothing to a
 * content-sized track. `e2e/popup.spec.ts` measures the narrow row and
 * `e2e/contract-flow.spec.ts` the fitted ones; each fails on one of the two
 * earlier versions.
 */
export const CALENDAR_FIELD_WIDTH = "w-60! max-w-full";

/** At least as wide as the anchor, growing to its content. */
export const POPUP_WIDTH = "w-max min-w-(--anchor-width) max-w-(--available-width)";

/** The same, allowing for `ring-2` on both edges of the anchor. */
export const RINGED_POPUP_WIDTH =
  "w-max min-w-[calc(var(--anchor-width)+4px)] max-w-(--available-width)";
