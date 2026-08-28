"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, PanelRight } from "lucide-react";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { parentHref } from "./breadcrumb";
import { useEditorPanel } from "./EditorPanel";

/**
 * Wider than the nav (`NAV_WIDTH` in `AdminShell`), because it holds full form
 * fields rather than links. Matching the two was tried and reverted — at the
 * same number the nav looked oversized for a list of short labels.
 *
 * 336 is the floor, and it is arithmetic rather than taste: the rail loses 16px
 * to the inset `p-2` and 32px to `SidebarContent`'s `p-4`, so the `field-group`
 * container is width − 48. `FieldRow` puts two fields side by side at 288px
 * (`@2xs`). Below 336 every paired field in every editor silently stacks — see
 * `field-row.tsx`.
 */
export const EDITOR_RAIL_WIDTH = 352;

/**
 * The app-level edit rail: one right-hand panel shared by every admin page.
 * Document editors fill it with their form; the record pages fill it with the
 * add/edit form that used to open as a screen-darkening modal.
 *
 * It lives under the *same* `SidebarProvider` as the nav but drives its own
 * open state via `Sidebar`'s `state` override, so the two rails collapse
 * independently. For the same reason it must not use `SidebarTrigger` or
 * `SidebarRail` — both toggle the shared nav state through context — hence the
 * plain `Button` below.
 *
 * Collapsed to an icon strip by default. The expand button is disabled when no
 * page content has registered, and says why.
 */
export default function EditorSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const panel = useEditorPanel();
  if (!panel) return null;

  const {
    setHost,
    setFooterHost,
    setOverlayHost,
    drawer,
    setDrawer,
    count,
    open,
  } = panel;
  const hasContent = count > 0;
  // A page with nothing editable can't be expanded; collapse if content goes.
  const expanded = open && hasContent;

  return (
    <Sidebar
      side="right"
      variant="sidebar"
      collapsible="icon"
      data-editor-rail=""
      // No seam of its own. `variant="sidebar"` draws a `border-l` here, which
      // is a stroke on the *inside* of this box: the rail is `bg-sidebar`, a
      // different fill from the inset, so a line sitting on that fill reads as
      // a rule drawn inside the panel rather than as the join between two
      // panels. It also cut a pixel out of the rail's own 352px while the nav's
      // seam cuts one out of the nav, so the two were not mirror images.
      //
      // Both seams are drawn by the middle column now: the nav's `border-r` on
      // its own right edge, and the inset's `border-r` in `AdminShell` on its
      // right. Same box, same ink, symmetric, and neither one lands on the
      // sidebar fill. That also settles the colour problem this class used to
      // solve by hand: the inset is outside `[data-editor-rail]`, so `--border`
      // there is the app's value with no override to work around.
      className="group-data-[side=right]:border-l-0"
      state={expanded ? "expanded" : "collapsed"}
      style={
        {
          "--sidebar-width": `${EDITOR_RAIL_WIDTH}px`,
          // 3rem, matching the nav's collapsed strip. It is also what the
          // toggle's alignment needs: at 2.5rem a right-aligned 28px button
          // with 12px of padding leaves 0 on its left and reads as pushed
          // against the seam.
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      {/*
        Two panes on one track, and the track holds the *whole* rail: header,
        form and footer slide out together while the drawer slides in over all
        three. Sliding only the content left a fixed header above a pane that
        had gone somewhere else, which reads as one sidebar with a moving middle
        rather than as one sidebar replaced by another.

        The pane that leaves also fades, because two panes at full strength
        crossing each other look like two things; one handing over to the other
        is what the motion is describing.

        `visibility` is in the transition on purpose. Without it the closed
        drawer is off-screen but still focusable, so tabbing through the form
        walks into thirty inputs nobody can see. It is a discrete property, so
        it flips at the end of the slide out and at the start of the slide in,
        which is exactly the behaviour wanted at both ends.

        The track is `overflow-hidden` only while the rail is expanded: it is
        what clips the pane on its way past the edge, and a collapsed rail is
        3rem wide with a tooltip-bearing button in it.
      */}
      {/*
        The rail's collapse toggle, floated over the header row rather than
        placed in it.

        It was in `TopPanel` while that bar was divided into rail-width columns.
        The bar is one band now, and a control that opens this column belongs on
        the column. But it cannot go *inside* the track below: that pane is
        `inert` while the drawer is over it, and hidden entirely at the icon
        width, and this is the one control that has to survive both.

        So it is a sibling of the track, absolutely placed in the same 3rem
        the two panes give their own headers, at the right edge where the
        titles' text runs out. A second stacked row would have been the obvious
        way to keep it outside, and would have given the rail two header bars.

        `z-20` clears the drawer, which is `absolute inset-0` over the same box.

        It keeps `px-3` and its right alignment at *both* widths, rather than
        centring in the collapsed strip. That is what puts it directly under the
        notifications bell: the header also pads 12px from the right edge and
        its bell is the same 28px box, so both centres land 26px in. Centring in
        the 3rem strip would have put this one 24px in — two pixels off, which
        is exactly the kind of miss that reads as sloppy rather than as a
        different decision.
      */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:overflow-visible">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-end px-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!hasContent}
            onClick={() =>
              expanded ? panel.requestClose() : panel.setOpen(true)
            }
            aria-label={expanded ? "Collapse edit panel" : "Expand edit panel"}
            title={hasContent ? undefined : "No editable content on this page"}
            className="pointer-events-auto size-7 shrink-0 text-muted-foreground"
          >
            <PanelRight className="size-4" />
          </Button>
        </div>

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col duration-200 ease-standard",
            drawer
              ? "-translate-x-full opacity-0"
              : "translate-x-0 opacity-100",
          )}
          style={{ transitionProperty: "transform, opacity" }}
          // Whichever pane is off screen is not a pane you can reach. `inert`
          // takes its subtree out of the tab order and `aria-hidden` off the
          // accessibility tree, which is also what stops the two collapse toggles
          // from both answering to the same name.
          inert={drawer !== null}
          aria-hidden={drawer !== null}
        >
          {/*
        The rail's own header, matching the drawer's row below it.

        It sat in `TopPanel` while that bar was divided into three columns of
        rail width. The bar is one unbroken band now, so a document title in it
        would appear and disappear mid-header as this rail opened, which is the
        thing that band exists to stop. A title belongs to the panel it names.

        The collapse toggle is not in this row: it sits above the track, where
        it survives both the drawer sliding over this pane and the rail
        collapsing to its icon strip. This row goes with the form it names.

        The back arrow leaves the page, so it confirms first: the draft's
        unsaved edits live in the form, not the server. It is a different
        control from the drawer's, which returns to the form behind it.
      */}
          {/* `pr-10` clears the floated collapse toggle above (12px of padding
              plus its 28px box), so a long title truncates before it reaches
              the button rather than under it. */}
          <div className="flex h-12 shrink-0 items-center gap-1 border-b pr-10 pl-3 group-data-[collapsible=icon]:hidden">
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Go back"
                    className="size-7 shrink-0 text-muted-foreground"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Leave this page?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Anything you have not saved will be lost.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Stay</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => router.push(parentHref(pathname))}
                  >
                    Leave
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <span className="truncate text-sm font-semibold">
              {panel.title ?? "Edit"}
            </span>
          </div>

          <SidebarContent className="no-scrollbar gap-0 p-4 group-data-[collapsible=icon]:hidden">
            {/* The portal target. Kept mounted so panels can fill it at any time. */}
            <div ref={setHost} data-slot="editor-panel-host" />
          </SidebarContent>

          {/*
        The second target, outside the scroll. `empty:hidden` is what keeps it
        from drawing a bare rule on every page that supplies no footer — the
        node is empty until something is portalled into it, and CSS notices.
      */}
          <div
            ref={setFooterHost}
            data-slot="editor-panel-footer-host"
            className="shrink-0 border-t py-4 empty:hidden group-data-[collapsible=icon]:hidden"
          />
        </div>

        {/*
        The drawer, covering the pane above along with its header. Its back
        arrow is a different control from the form pane's: that one leaves the
        page, this one returns to the form behind it. The collapse toggle is
        above both, floated over this row, which is why it alone still answers
        while this is open.
      */}
        <div
          className={cn(
            "invisible absolute inset-0 flex translate-x-full flex-col bg-sidebar opacity-0 duration-200 ease-standard group-data-[collapsible=icon]:hidden",
            drawer && "visible translate-x-0 opacity-100",
          )}
          style={{ transitionProperty: "transform, opacity, visibility" }}
          inert={drawer === null}
          aria-hidden={drawer === null}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b pr-10 pl-3">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Back to the form"
                onClick={() => setDrawer(null)}
                className="size-7 shrink-0 text-muted-foreground"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <span className="truncate text-sm font-semibold">{drawer}</span>
            </div>
          </div>
          <div
            ref={setOverlayHost}
            data-slot="editor-panel-overlay-host"
            className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4"
          />
        </div>
      </div>
    </Sidebar>
  );
}
