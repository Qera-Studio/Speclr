/**
 * The quiet style's two control classes, shared by the service catalogue and
 * the service page (16 October 2026). The catalogue is the style guide for the
 * rest of the app; these are the pieces of it a second screen needs.
 */

/**
 * A quiet control: label grey at rest, no fill on hover, one step stronger in
 * ink and hairline instead. `tab-label` is as light as a label can go and
 * still clear 4.5:1 (measured in `contrast.test.ts`).
 */
export const QUIET =
  "border-border/50 text-tab-label hover:border-tab-label/50 hover:bg-transparent hover:text-muted-foreground dark:bg-transparent";

/** The page's one filled action: ink, rather than the blue primary. */
export const INK = "bg-foreground text-background hover:bg-foreground/85";

/**
 * A `Button` that reads as plain text: a row's name that opens it, a price
 * that edits in place, a line that leads to the next step. Use with
 * `variant="ghost"`. It keeps `Button`'s focus ring and semantics and drops its
 * box, height and fill, so the house rule (every clickable thing is a
 * `Button`) holds without the row looking like a toolbar.
 */
export const TEXT_BUTTON =
  "h-auto justify-start rounded-md p-0 text-left text-body font-normal hover:bg-transparent aria-expanded:bg-transparent";
