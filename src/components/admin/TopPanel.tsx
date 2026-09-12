"use client";

import { Separator } from "@/components/ui/separator";
import Clock from "./Clock";
import Notifications from "./Notifications";
import SearchCommand from "./SearchCommand";

/**
 * The app's one header: a single band above the content, starting where the nav
 * rail ends rather than crossing over it.
 *
 * It spanned the whole window once, nav included. The nav is the app's one
 * permanent column and now runs the full height, so a bar drawn across the top
 * of it split that column in two and left the wordmark and the account card
 * looking like they belonged to different surfaces.
 *
 * It used to be three sections whose widths tracked the two rails, with
 * vertical hairlines where their seams fell. That made the header a fourth
 * thing that moved every time either rail collapsed, and a document title
 * appeared and disappeared inside it as the editor opened. Nothing below can
 * influence it now: the rails collapse under a bar that does not move.
 *
 * **Neither rail's toggle is here, and neither is the profile switcher.** A
 * control that opens and closes a panel belongs on the panel, where you are
 * already looking when you want it, not in a bar that has nothing else to do
 * with either column. Each rail carries its own toggle; see `AdminSidebar` and
 * `EditorSidebar`. The switcher went the same way and for the same reason: it
 * chooses which *navigation* is on screen, so it lives at the foot of the nav
 * rail, above the account card.
 *
 * What is left is the three things that belong to no column: search, the clock
 * and notifications.
 *
 * `bg-sidebar`, not `bg-background`, and that swapped when the inset arrived.
 * The band used to be the lightest thing on screen so it read as one surface
 * *above* the rails. It now sits on the shell beside the nav, with the content
 * card floated off it, so it is ground rather than surface: `--background` is
 * the card's, and the band matching it would have made the card's top edge
 * disappear into the header it is inset from.
 */
/**
 * `inset` is the shell's content card, passed straight through to
 * `Notifications`: its drawer opens inside the card rather than over the window,
 * so the scrim darkens the page being covered and leaves the nav lit. Optional,
 * because this band renders on its own in a test and the sheet must still open.
 */
export default function TopPanel({
  inset,
}: {
  inset?: React.RefObject<HTMLElement | null>;
}) {
  return (
    <div
      data-slot="top-panel"
      // Chrome, so it does not print. The two rails are hidden by their slot
      // and the breadcrumb trail carries this attribute already; this band was
      // the one piece of navigation neither selector reached, so it came out
      // across the top of every printed document and every ⌘P of a list.
      data-print-hidden
      // No `border-b`. The band sits directly above the inset card now, and the
      // card draws its own ring: a rule here would be a second line 8px above
      // the first, with a strip of shell showing between them.
      className="flex h-12 shrink-0 items-center gap-3 bg-sidebar pl-2 pr-3"
    >
      {/* Flex-1 twins on both sides, so `SearchCommand` centres on the bar's
          full width rather than drifting toward whichever side is lighter. */}
      {/*
        Empty, and deliberately still here: it is the twin that balances
        `top-panel-end`, so `SearchCommand` centres on the band's full width
        instead of drifting toward whichever side is lighter.

        The wordmark moved to `AdminSidebar`'s header, above the navigation it
        names. The profile switcher followed it into that rail, at the foot
        above the account card — it chooses which *navigation* you are looking
        at, so it belongs on the column that navigation is in rather than in a
        bar that has nothing else to do with it.
      */}
      <div data-slot="top-panel-start" className="flex flex-1 items-center" />

      <SearchCommand />

      <div
        data-slot="top-panel-end"
        // `gap-3`, the bar's own, rather than the `gap-1` that suited two
        // adjacent icon buttons: the clock is a text run and the bell is a
        // control, so they are two things rather than a pair.
        className="flex flex-1 items-center justify-end gap-3"
      >
        <Clock />
        {/* A hairline between them, because they are unrelated: one is a
            reading, the other opens a panel. `h-4` rather than the full band,
            so it reads as a join between two items in a row and not as a
            column seam like the ones this header was built to remove. */}
        <Separator
          orientation="vertical"
          // `self-center!` is load-bearing, and the `!` is the whole of it.
          // The primitive carries `data-vertical:self-stretch`, an `align-self`
          // that beats the row's `items-center`: the rule anchors to the band's
          // top edge and `h-4` then caps it 16px *down from there*, landing its
          // centre 6px above the clock's and the bell's. Plain `self-center`
          // does not fix it — an attribute-selector utility outranks a bare one
          // whatever the class order, so the override has to raise its own
          // specificity. Measured, not guessed: `[data-slot=separator]` sat at
          // mid 17.5 against 23.5 for both its neighbours.
          className="h-4 self-center! bg-border"
          // Decoration, not structure: the gap and the two names already
          // separate these for a reader who cannot see it.
          aria-hidden
        />
        <Notifications inset={inset} />
      </div>
    </div>
  );
}
