/**
 * Two rules every popup anchored to a control obeys, in one place because the
 * four primitives that draw one had each answered them separately and had each
 * answered at least one of them wrong.
 *
 * **1. There is always a gap.** 4px between the anchor and the popup. A submenu
 * sat at `sideOffset={0}` and so overlapped the menu it opened from, which
 * reads as one surface torn rather than two stacked.
 *
 * **2. The popup is never narrower than its anchor.** Same width when the
 * content fits, wider when it does not (a calendar under a short date field, a
 * long option label in a narrow rail), never less. A popup a few pixels short
 * of the field above it looks like a rendering fault, because it is one.
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

/** At least as wide as the anchor, growing to its content. */
export const POPUP_WIDTH = "w-max min-w-(--anchor-width) max-w-(--available-width)";

/** The same, allowing for `ring-2` on both edges of the anchor. */
export const RINGED_POPUP_WIDTH =
  "w-max min-w-[calc(var(--anchor-width)+4px)] max-w-(--available-width)";
