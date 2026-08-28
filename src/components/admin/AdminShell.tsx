"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import TopPanel from "./TopPanel";
// Parked: the left nav is fixed-width for now. Kept wired up (and tested) so
// drag-resize can be revived by restoring the width state and the handle below.
// import SidebarResizeHandle from './SidebarResizeHandle';
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
} from "./SidebarResizeHandle";
import { EditorPanelProvider } from "./EditorPanel";
import EditorSidebar from "./EditorSidebar";
import { NewDocumentProvider } from "./NewDocumentCommand";
import KeyboardShortcuts from "./KeyboardShortcuts";
import type { UserCardUser } from "./UserCard";
import { DEFAULT_PROFILE, profileFromPath, type Profile } from "@/lib/profile";
import RememberLocation from "./RememberLocation";
import { OfflineBar } from "./OfflineBar";

/**
 * The admin layout: nav on the left, one floating content card in the middle,
 * and the shared editor rail on the right.
 *
 * All three live under a single `SidebarProvider`. That provider owns one open
 * state, which the nav uses; the editor rail drives its own via `Sidebar`'s
 * `state` override so the two collapse independently (see `EditorSidebar`).
 *
 * The nav is fixed at the narrow width for now — `SidebarResizeHandle` is
 * parked, not deleted.
 */
/**
 * The nav has two widths and toggles between them: this one, and
 * `--sidebar-width-icon` when collapsed.
 *
 * It is a constant on purpose. Sizing the rail from its own content needs a
 * measure-and-write pass, and the panel is `position: fixed` while the space it
 * occupies comes from an empty spacer div — so the two are only ever in step
 * one frame late. Every version of that fought the 200ms collapse transition,
 * which flips `data-collapsible` at once but animates width. A number wide
 * enough for the longest row ("Experience letter", plus the `variant="inset"`
 * gutter) has none of those failure modes. Widen it if a longer label lands.
 *
 * It is deliberately narrower than `EDITOR_RAIL_WIDTH`. Matching the two was
 * tried and reverted: the editor rail holds two-column form fields and needs
 * its width, while this one holds a list of short labels and only looked
 * oversized at the same number. They are not peers — one is navigation, the
 * other is the document being worked on.
 *
 * The rail is `variant="sidebar"`, which takes no `p-2` gutter, so this number
 * is the visible width: 236px, as asked for.
 */
const NAV_WIDTH = 236;

export default function AdminShell({
  user,
  children,
  defaultOpen = true,
}: {
  user: UserCardUser;
  children: React.ReactNode;
  /** From the `sidebar_state` cookie, read in the layout. */
  defaultOpen?: boolean;
}) {
  /**
   * Which half of the app this page belongs to — it scopes the nav, ⌘D and ⌘K.
   *
   * Read from the path rather than passed down from the layout. The layout is a
   * Server Component and has no pathname, so threading it would have meant a
   * `layout.tsx` per profile — and two sibling layouts remount the whole shell
   * on every switch. This is one deterministic call on both server and client,
   * so it survives hydration and the shell stays mounted across a switch.
   *
   * `/` and the legacy redirect routes are outside both profiles; they render
   * nothing but a redirect, so the default they fall back to is never seen.
   */
  const pathname = usePathname();
  const onProfile = profileFromPath(pathname);
  const profile: Profile = onProfile ?? DEFAULT_PROFILE;

  return (
    <EditorPanelProvider>
      {/* Records the profile *and* the page, so each side reopens where it was
          left. Suspense because it reads the search params: see the component. */}
      <Suspense fallback={null}>
        <RememberLocation />
      </Suspense>
      {/* Outside the sidebar so ⌘D and the ⌥ shortcuts work on every admin
          page, including from inside the editor rail. */}
      <NewDocumentProvider profile={profile}>
        <SidebarProvider
          defaultOpen={defaultOpen}
          // Lock the whole shell to the viewport height so the page body never
          // scrolls — the rails and the inset frame stay fixed; only the content
          // area inside the inset scrolls.
          //
          // `overflow-clip`, not `overflow-hidden`. A hidden box is still a
          // *scroll container*: the user cannot scroll it, but the browser can,
          // and it does — focusing anything inside triggers a scroll-into-view
          // that walks up every ancestor scroll box. That pushed the header off
          // the top of the shell with no way to bring it back. `clip` creates no
          // scroll container at all, so there is nothing left to shift.
          className="h-svh min-h-svh flex-col overflow-clip"
          style={
            {
              // `Sidebar`'s fixed panel reads this to start below `TopPanel`
              // instead of at the true viewport top — see `ui/sidebar.tsx`.
              // Matches `TopPanel`'s own `h-12`.
              "--top-panel-height": "3rem",
              "--sidebar-width": `${NAV_WIDTH}px`,
              // 3rem, not 2.5. `SidebarGroup` carries `px-2` and a collapsed
              // menu button is `size-8`, so a row needs 8 + 32 + 8 = 48px to
              // sit with equal air on both sides. At 40 the right-hand 8px had
              // nowhere to go and every icon looked shoved against the seam.
              "--sidebar-width-icon": "3rem",
            } as React.CSSProperties
          }
        >
          {/*
            The first thing in the tab order, and invisible until it is
            focused. Without it, reaching the page content by keyboard means
            tabbing through the whole rail on every navigation.
          */}
          <a
            href="#main-content"
            className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-popover focus-visible:px-3 focus-visible:py-2 focus-visible:text-xs focus-visible:font-medium focus-visible:text-popover-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Skip to content
          </a>
          {/* `g` to jump and `?` for the list of every binding. Inside the
              provider so it sits under the same profile, outside the sidebar
              so both work from the editor rail as well. */}
          <KeyboardShortcuts profile={profile} />
          <TopPanel profile={profile} />
          <div className="flex min-h-0 flex-1">
            <AdminSidebar user={user} profile={profile} />
            {/* <SidebarResizeHandle width={width} onWidthChange={setWidth} /> */}
            <SidebarInset
              // `overflow-clip` for the same reason as the shell above: this only
              // ever needed to clip the inset's rounded corners, and being a
              // scroll container was an accident the browser could exploit.
              //
              // `border-r` is the seam against the editor rail, drawn here
              // rather than by the rail itself. A border is a stroke on the
              // inside of its own box, so a `border-l` on the rail sat on the
              // rail's `bg-sidebar` fill and read as a line *inside* the panel.
              // Owning both seams from the middle column makes them mirror
              // images: nav's right edge, inset's right edge, one ink.
              className="min-h-0 overflow-clip border-r border-border"
            >
              {/* Above the header rather than over the content: it is a fact
                  about the whole app, and it must not cover a control. */}
              <OfflineBar />
              <AdminHeader />
              {/* The skip link's target. Not the `<main>` itself: `SidebarInset`
                  already is one, and it holds the header the link exists to skip.
                  `tabIndex` because a div is not focusable, and a skip link that
                  moves the scroll without moving the focus leaves the next Tab
                  back at the rail it just skipped. */}
              <div
                id="main-content"
                tabIndex={-1}
                className="min-h-0 flex-1 overflow-y-auto outline-none"
              >
                {children}
              </div>
            </SidebarInset>
            <EditorSidebar />
          </div>
        </SidebarProvider>
      </NewDocumentProvider>
    </EditorPanelProvider>
  );
}

export { NAV_WIDTH, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH };
