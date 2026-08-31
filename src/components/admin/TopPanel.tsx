"use client";

import { Separator } from "@/components/ui/separator";
import type { Profile } from "@/lib/profile";
import Clock from "./Clock";
import Notifications from "./Notifications";
import ProfileSwitcher from "./ProfileSwitcher";
import SearchCommand from "./SearchCommand";

/**
 * The app's one header: a single band across the full width, above the three
 * columns rather than divided into them.
 *
 * It used to be three sections whose widths tracked the two rails, with
 * vertical hairlines where their seams fell. That made the header a fourth
 * thing that moved every time either rail collapsed, and a document title
 * appeared and disappeared inside it as the editor opened. Nothing below can
 * influence it now: the rails collapse under a bar that does not move.
 *
 * **Neither rail's toggle is here.** A control that opens and closes a panel
 * belongs on the panel, where you are already looking when you want it, not in
 * a bar that has nothing else to do with either column. Each rail carries its
 * own; see `AdminSidebar` and `EditorSidebar`.
 *
 * `bg-background` rather than `bg-sidebar`, which is the point of the band.
 * `--background` is slate 50 and the top of the ramp; `--sidebar` sits a step
 * below it. Lighter than both rails is what makes this read as one surface
 * above them instead of as a continuation of either.
 */
export default function TopPanel({ profile }: { profile: Profile }) {
  return (
    <div
      data-slot="top-panel"
      className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background pl-2 pr-3"
    >
      {/* Flex-1 twins on both sides, so `SearchCommand` centres on the bar's
          full width rather than drifting toward whichever side is lighter. */}
      <div
        data-slot="top-panel-start"
        // The wordmark moved to `AdminSidebar`'s header, where it sits above
        // the navigation it names. It was here while the header was the only
        // full-width band; with the rail carrying it, a second copy directly
        // below the first was two answers to the same question.
        className="flex flex-1 items-center"
      >
        <ProfileSwitcher profile={profile} />
      </div>

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
        <Notifications />
      </div>
    </div>
  );
}
