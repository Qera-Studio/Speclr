"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/profile";
import Clock from "./Clock";
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
 * `--background` is taupe 50 and the top of the ramp; `--sidebar` sits two
 * steps below it. Lighter than both rails is what makes this read as one
 * surface above them instead of as a continuation of either.
 */
export default function TopPanel({ profile }: { profile: Profile }) {
  return (
    <div
      data-slot="top-panel"
      className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-3"
    >
      {/* Flex-1 twins on both sides, so `SearchCommand` centres on the bar's
          full width rather than drifting toward whichever side is lighter. */}
      <div
        data-slot="top-panel-start"
        // `gap-5` rather than the bar's own `gap-3`: the wordmark is the app's
        // name and the switcher is a control, so they are two things rather
        // than a pair, and at 12px they read as one clump.
        className="flex flex-1 items-center gap-5 pl-1"
      >
        {/* A step up from the `text-sm` everything else in this bar uses. It
            is the app's name rather than a label in it, and at the same size
            as the profile links beside it there was nothing saying so. */}
        <span className="truncate text-base font-semibold text-foreground">
          speclr
        </span>
        <ProfileSwitcher profile={profile} />
      </div>

      <SearchCommand />

      <div
        data-slot="top-panel-end"
        // `gap-3`, the bar's own, rather than the `gap-1` that suited two
        // adjacent icon buttons: the clock is a text run and the bell is a
        // control, so they are two things rather than a pair. The clock sits
        // last, at the very end of the bar.
        className="flex flex-1 items-center justify-end gap-3"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="shrink-0 text-muted-foreground"
        >
          <Bell className="size-4" />
        </Button>
        <Clock />
      </div>
    </div>
  );
}
