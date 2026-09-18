"use client";

import { Separator } from "@/components/ui/separator";
import Breadcrumbs from "./Breadcrumbs";
import Clock from "./Clock";
import Notifications from "./Notifications";
import { useFullscreen } from "./useFullscreen";

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
export default function TopPanel() {
  const { toggle } = useFullscreen();

  return (
    <div
      data-slot="top-panel"
      /*
        Double-click the band to go fullscreen, and again to come back.

        **On the band, not on the app.** A browser tab has no chrome of its
        own, so Dia can take the whole surface; this app is chrome nearly
        everywhere. A document-level handler would fire on a table row, inside
        a drawer, and on the double-click that selects a word in a clause body,
        which is a gesture people use in this app to read rather than to zoom.
        The header is the one strip with nothing to double-click on, which is
        also where every desktop window has put this for thirty years.

        `event.target === event.currentTarget` narrows it further, to the
        band's own empty space: the trail, the clock and the bell are real
        controls and a double-click on one of them is two clicks on it, not a
        request to resize the window.
      */
      onDoubleClick={(event) => {
        if (event.target !== event.currentTarget) return;
        toggle();
      }}
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
      {/*
        The trail, left-aligned on the inset card's own left edge.

        It moved here from the card's header row on 18 September 2026. The back
        arrow did **not** come with it and still sits inside the card, so the
        two rows each start with one navigational thing rather than stacking
        both in the same column.

        **No extra left padding, and that is measured rather than assumed.**
        The reasoning that says otherwise is tempting and wrong: this band is
        `pl-2` and the card is inset `m-2`, so it looks as though the trail
        needs another 8px to reach the card's edge. It does not. The band is a
        sibling of the card inside the same column, so its `pl-2` and the
        card's `ml-2` start from the same origin and already agree. Adding
        `pl-2` here put the trail 8px past the card, measured in a browser.
        Pinned in `e2e/header.spec.ts`.

        The wordmark moved to `AdminSidebar`'s header, above the navigation it
        names. The profile switcher followed it into that rail, at the foot
        above the account card: it chooses which *navigation* you are looking
        at, so it belongs on the column that navigation is in rather than in a
        bar that has nothing else to do with it.
      */}
      <div
        data-slot="top-panel-start"
        className="flex min-w-0 flex-1 items-center"
      >
        <Breadcrumbs />
      </div>

      {/*
        Search is not here any more. It moved into the nav rail on 18 September
        2026, under the wordmark and above the links: a reader looks at that
        column to get somewhere, which is what searching is for.

        Two rounds of positioning arithmetic went with it, and both are gone
        rather than solved: the field was centred on the viewport so the nav's
        width could not slide it, then centred on the inset card so it would
        not sit off-centre above the surface it searches. In the rail it is an
        ordinary flex child of the column it belongs to, and neither question
        arises. `AdminShell`'s content column keeps its `relative`, which the
        skip link still uses.
      */}

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
        <Notifications />
      </div>
    </div>
  );
}
