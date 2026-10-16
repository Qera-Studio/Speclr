"use client";

import { Suspense, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { InsetProvider } from "@/components/ui/sheet";
import AdminSidebar from "@/components/shell/AdminSidebar";
import AdminHeader from "@/components/shell/AdminHeader";
import TopPanel from "@/components/shell/TopPanel";
import SidebarResizeHandle, {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
} from "@/components/shell/SidebarResizeHandle";
import { EditorPanelProvider } from "@/components/shell/EditorPanel";
import EditorSidebar from "@/components/shell/EditorSidebar";
import { PageHeaderSlotProvider } from "@/components/shell/PageHeaderSlot";
import { DocumentCrumbProvider } from "@/components/shell/DocumentCrumb";
import { NewDocumentProvider } from "@/components/shell/NewDocumentCommand";
import KeyboardShortcuts from "@/components/shell/KeyboardShortcuts";
import type { UserCardUser } from "@/components/shell/UserCard";
import { DEFAULT_PROFILE, profileFromPath, type Profile } from "@/lib/profile";
import RememberLocation from "@/components/shell/RememberLocation";
import { OfflineBar } from "@/components/shell/OfflineBar";

/**
 * The admin layout: nav on the left, one floating content card in the middle,
 * and the shared editor rail on the right.
 *
 * All three live under a single `SidebarProvider`. That provider owns one open
 * state, which the nav uses; the editor rail drives its own via `Sidebar`'s
 * `state` override so the two collapse independently (see `EditorSidebar`).
 *
 * The nav is drag-resizable again (15 September 2026): `SidebarResizeHandle`
 * sits on its right edge and writes the width below. Session-only, as it was
 * the first time; a reload returns to `NAV_WIDTH`.
 */
/**
 * The nav's *starting* width. It toggles between whatever the operator has
 * dragged it to and `--sidebar-width-icon` when collapsed.
 *
 * It is a constant rather than measured from the rows on purpose. Sizing the
 * rail from its own content needs a measure-and-write pass, and the panel is
 * `position: fixed` while the space it occupies comes from an empty spacer div,
 * so the two are only ever in step one frame late. Every version of that fought
 * the 200ms collapse transition, which flips `data-collapsible` at once but
 * animates width. A number wide enough for the longest row ("Experience
 * letter", plus the `variant="inset"` gutter) has none of those failure modes.
 * Widen it if a longer label lands.
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

  /**
   * The inset card, which is what every sheet in the app opens inside.
   *
   * It is handed to `InsetProvider` below rather than passed down, and that is
   * the point of it: a drawer four levels into a page cannot be given a prop,
   * and the clause library's spilled over the card because of it. See
   * `ui/sheet.tsx`.
   *
   * A ref rather than state because nothing here re-renders on it: `SheetPortal`
   * reads it when a sheet opens, which is always well after mount.
   */
  const inset = useRef<HTMLDivElement>(null);

  /**
   * The nav's live width, in px, written by the drag handle and read by
   * `--sidebar-width` below. Clamped by the handle to
   * [`SIDEBAR_MIN_WIDTH`, `SIDEBAR_MAX_WIDTH`].
   */
  const [width, setWidth] = useState(NAV_WIDTH);

  return (
    <EditorPanelProvider>
      {/* Wraps the header and the page together: the header registers the host,
          the page portals its title and pager into it. */}
      <PageHeaderSlotProvider>
      {/* Lets the page below name its document type for the breadcrumb, which
          the path alone cannot say. See `DocumentCrumb.tsx`. */}
      <DocumentCrumbProvider>
      {/* Records the profile *and* the page, so each side reopens where it was
          left. Suspense because it reads the search params: see the component. */}
      <Suspense fallback={null}>
        <RememberLocation />
      </Suspense>
      {/* Outside the sidebar so ⌘D and the ⌥ shortcuts work on every admin
          page, including from inside the editor rail. */}
      {/* Published to every sheet in the app, which is why nothing below is
          handed it. See `InsetProvider` in `ui/sheet.tsx`. It wraps the whole
          shell rather than the card, because `TopPanel` sits outside the card
          and its notification drawer still opens inside it. */}
      <InsetProvider inset={inset}>
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
          // `bg-sidebar` is the shell's ground, and it is what the inset card
          // is inset *from*: the nav, the header band and the 8px margin the
          // card floats in are all one field, with the card the one step above
          // it. Set here rather than on `body`, which carries `bg-background`
          // for every page in the app including the ones with no shell at all.
          // `group/shell` is what the search field's offline-bar offset keys
          // off. `relative` stays for the skip link's `focus-visible:absolute`.
          //
          // The search field is *not* positioned against this box any more: it
          // is centred on the content column below, so it lines up with the
          // inset card rather than with the window. See `TopPanel`.
          className="group/shell relative h-svh min-h-svh flex-col overflow-clip bg-sidebar"
          style={
            {
              // Zero, and that is the whole of the full-height nav.
              //
              // `Sidebar`'s fixed panel offsets its top by this, so it used to
              // begin below the header band. The band no longer spans the
              // window: it starts where the nav ends, so the nav runs from the
              // true viewport top to the bottom and the header is one of the
              // things sitting beside it rather than above it.
              //
              // Set rather than dropped. `ui/sidebar.tsx` defaults it to 0 on
              // its own, but the float's `max-h` arithmetic reads it too, and
              // naming it here keeps the shell's own statement of the layout in
              // one place instead of half here and half in a fallback.
              "--top-panel-height": "0px",
              "--sidebar-width": `${width}px`,
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
            className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-popover focus-visible:px-3 focus-visible:py-2 focus-visible:text-meta focus-visible:font-medium focus-visible:text-popover-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Skip to content
          </a>
          {/* `g` to jump and `?` for the list of every binding. Inside the
              provider so it sits under the same profile, outside the sidebar
              so both work from the editor rail as well. */}
          <KeyboardShortcuts profile={profile} />
          {/*
            The nav, then everything else.

            The nav runs the window's full height, so the header band starts
            where the nav ends rather than crossing above it. That is the whole
            of the change: the nav is the app's one permanent column, and a bar
            drawn over the top of it made the wordmark and the account card look
            like they belonged to different surfaces.

            `has-[[data-editor-rail]]` so the inset's seam follows the rail's
            existence. The rail unmounts on a page with nothing editable, and a
            border drawn against nothing is a stroke down the right edge of the
            window. Done here rather than by passing a prop, because `AdminShell`
            renders inside `EditorPanelProvider` and so cannot read the panel
            count itself.
          */}
          <div className="group/shell-row flex min-h-0 flex-1">
            <AdminSidebar user={user} profile={profile} />
            {/*
              The right-hand column: the header band, then the inset card.

              `min-w-0` because the inset below holds a horizontally scrolling
              document preview, and a flex child's `min-width` is `auto` — which
              floors this column at its widest content and pushes the whole
              layout off the right of the window instead of scrolling inside.
            */}
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              {/* Above the header rather than over the content: it is a fact
                  about the whole app, and it must not cover a control. */}
              <OfflineBar />
              <TopPanel />
              {/*
                The inset: one card holding the content and the editor rail,
                floated off the shell on all four sides.

                `m-2 mt-0`: the header band above already leaves its own air, so
                a top margin here would read as a gap in the column rather than
                as the card's inset. The nav's right edge is the left bound, and
                `ml-0` is deliberately *not* used — the card is inset from the
                nav too, which is what makes it read as a layer above the shell
                rather than as the other half of a split.
              */}
              {/*
                `rounded-md` (4.8px), the smallest named step above a square
                corner. A frame this large reads its radius as a *hint* of one:
                at `rounded-lg` the card looked like a widget floated on the
                page, and the shell is meant to read as one surface with a seam
                in it. Named rather than `rounded-[4px]`, per `docs/design.md`
                §1.3, which is also where the shell-frame row was corrected.
              */}
              {/*
                `relative` is what makes the notification drawer land in here.
                A sheet positions itself `fixed`, which resolves to the viewport
                from wherever it is portalled, so `Notifications` switches its
                panel and scrim to `absolute` and this is the box they resolve
                against. `overflow-clip` above then clips the panel to the
                card's own corners, which is the other half of it reading as
                part of the card rather than a pane laid over the window.
              */}
              {/*
                `shadow-2xs`, the smallest step Tailwind names: one pixel of
                5% black under the bottom edge. The ring is still the edge; the
                shadow only says the card sits a hair above the shell rather
                than flush with it. Asked for as the faintest possible lift,
                and it is the one shadow on a non-floating surface in the app,
                logged in `docs/design.md` §1.7. Anything stronger reads as the
                widget-on-a-page look the `rounded-md` call above avoids.
              */}
              {/*
                The card and its resize handle, in one `relative` box that
                carries the card's 8px inset. The handle straddles the card's
                left edge, which is why it cannot live *inside* the card
                (`overflow-clip` would take its outer half) and why it is not on
                the nav (the nav's edge is 8px to the left, and the whole point
                is that the hand is on the card).

                The card's ring does not react to it. The handle draws its own
                glow on that ring, lit only at the pointer's height and fading
                either side, so the edge never lights as a whole. What it
                resizes is the nav, and the card follows because it is the
                flex remainder.
              */}
              <div className="relative m-2 mt-0 flex min-h-0 min-w-0 flex-1">
                <SidebarResizeHandle width={width} onWidthChange={setWidth} />
                <div
                  ref={inset}
                  // Named like every other part of the shell. It is also what
                  // the account card's placement is measured against: the
                  // card's left edge, not the rail's, is the edge a popover
                  // opening rightwards has to clear.
                  data-slot="shell-inset"
                  className="group/inset relative flex min-h-0 min-w-0 flex-1 overflow-clip rounded-md shadow-2xs ring-1 ring-sidebar-border"
                >
                <SidebarInset
                  // `overflow-clip` for the same reason as the shell above: this
                  // only ever needed to clip the inset's rounded corners, and
                  // being a scroll container was an accident the browser could
                  // exploit.
                  //
                  // `border-r` is the seam against the editor rail, drawn here
                  // rather than by the rail itself. A border is a stroke on the
                  // inside of its own box, so a `border-l` on the rail sat on
                  // the rail's `bg-sidebar` fill and read as a line *inside* the
                  // panel. It is drawn only when there is a rail to be a seam
                  // against, which is what `group/shell-row` above is for.
                  className="min-h-0 min-w-0 overflow-clip border-border group-has-[[data-editor-rail]]/shell-row:border-r"
                >
                  <AdminHeader />
                  {/* The skip link's target. Not the `<main>` itself:
                      `SidebarInset` already is one, and it holds the header the
                      link exists to skip. `tabIndex` because a div is not
                      focusable, and a skip link that moves the scroll without
                      moving the focus leaves the next Tab back at the rail it
                      just skipped. */}
                  {/*
                    `overscroll-contain` is a bug fix, not a tightening.

                    Without it this box rubber-bands past its own top, and
                    anything `sticky` inside it is carried along for the ride:
                    scrolling the print view back to the first page dragged the
                    sealed banner down with the bounce and let it spring back,
                    which reads as the header coming loose. It also stops a
                    scroll that reaches the end of this box from chaining out to
                    the page behind it. The document preview and the page rail
                    already contain their own for the same reason.
                  */}
                  <div
                    id="main-content"
                    tabIndex={-1}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none"
                  >
                    {children}
                  </div>
                </SidebarInset>
                <EditorSidebar />
                </div>
              </div>
            </div>
          </div>
        </SidebarProvider>
      </NewDocumentProvider>
      </InsetProvider>
      </DocumentCrumbProvider>
      </PageHeaderSlotProvider>
    </EditorPanelProvider>
  );
}

export { NAV_WIDTH, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH };
