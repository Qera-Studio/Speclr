"use client";

import { ArrowLeft } from "lucide-react";
import { Sidebar, SidebarContent } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
 * It lives under the *same* `SidebarProvider` as the nav but pins itself
 * expanded via `Sidebar`'s `state` override, so the nav's collapse leaves it
 * alone. For the same reason it must not use `SidebarTrigger` or `SidebarRail`
 * — both toggle the shared nav state through context.
 *
 * **It has no collapse control.** That went when the app header became one row:
 * a rail that can be shut needs a way back, and the toggle was the only control
 * anywhere that reopened it, so on a document page the rail is simply always
 * there.
 *
 * Its header row stayed, holding the page's title. It is levelled against the
 * inset's back-and-trail row, the other 48px row inside the content card: the
 * two are what read as one band across the card, and a rail whose form began at
 * the top while the column beside it carried a band was the odd one out.
 *
 * The nav's own wordmark row is no longer one of them. The nav runs the
 * window's full height with the header band starting where it ends, so its row
 * sits above the card rather than beside these two. Pinned in
 * `e2e/document-header.spec.ts`.
 *
 * `open` is still real, because the record managers drive it: Clients,
 * Employees and Services open the rail on "Add" and close it on save
 * (`useRecordPanel`). What is gone is a *user-facing* collapse, not the state.
 */
export default function EditorSidebar() {
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
    title,
  } = panel;
  /*
    A page with nothing editable has no rail at all, rather than a disabled
    strip. The registration that drives this already existed — panels register
    on mount and `count` is what the expand button was reading — so this is the
    same fact used one step earlier: it decided whether the rail could open,
    and now it decides whether the rail is there.

    The portal hosts below are ref callbacks, so they null out on the way out
    and are re-set on the way back in. The ordering holds because registration
    is what brings the rail back: a panel mounts, `count` goes to 1, this
    renders, and `setHost` fires before the panel's own portal effect reads it.
  */
  if (count === 0) return null;

  const expanded = open;

  return (
    <Sidebar
      side="right"
      variant="sidebar"
      // `offcanvas`, not `icon`. The icon strip existed to hold the expand
      // button, and that button is gone. The only remaining collapsed state is
      // a record page that has not been asked for a form yet, and there the
      // honest width is zero: a 3rem strip with nothing in it is a column
      // announcing a control the page no longer has.
      collapsible="offcanvas"
      data-editor-rail=""
      // No seam of its own. `variant="sidebar"` draws a `border-l` here, which
      // is a stroke on the *inside* of this box: the rail is `bg-sidebar`, a
      // different fill from the inset, so a line sitting on that fill reads as
      // a rule drawn inside the panel rather than as the join between two
      // panels. It also cut a pixel out of the rail's own 352px while the nav's
      // seam cuts one out of the nav, so the two were not mirror images.
      //
      // The seam against this rail is the inset's `border-r`, drawn in
      // `AdminShell` from the middle column, so it lands on the inset's fill
      // rather than on the sidebar's. The card's outer edge is its own ring,
      // also drawn there.
      /*
        Pulled inside the inset card.

        The panel underneath is `position: fixed` and anchored to the viewport's
        own right and bottom edges, which is right while the rail is a column of
        the window and wrong now that it is a column *of the card*: it spanned
        the header band and overhung the card's inset edges by 8px on two sides.

        So its box is restated against the card: below the header band, and in
        by the same 8px margin the card carries. `className` lands on the
        container itself (the primitive forwards it to the fixed box, which is
        also what carries `data-editor-rail`), so these are plain utilities and
        the `!` is what beats the base `top-[var(--top-panel-height,0px)]` and
        `bottom-0` written into `ui/sidebar.tsx`.

        **`h-auto!` is the third of those and the one that was missing.** The
        primitive states a `height` as well as both anchors
        (`h-[calc(100svh-var(--top-panel-height,0px))]`, which is right for the
        nav: that rail really is the window's height). A stated height beats the
        second anchor, so `bottom-2!` was computing nothing and the rail ran
        900px from the top of a card 844px tall, hanging 56px past its bottom
        edge with the form scrolling behind the shell rather than inside the
        card. Handing the height back to `top` and `bottom` is what makes the
        two restated edges the ones that decide.

        The spacer sibling keeps its full height and is not touched: it is what
        reserves the column's width in the flex row, and it has no edges to see.

        `[&>div]:bg-background` is the last of it, and it is what makes the rail
        part of the card rather than a column parked against it. The primitive
        fills its inner box `bg-sidebar`, which is the *shell's* ground now: in
        light that happens to look right, because the card is white and the rail
        is the one thing on it that is not, but in dark the shell is a step below
        the card and the rail read as a separate darker column with a border
        between. The card is one surface holding two columns, so both take the
        card's fill and the `border-r` is the only thing dividing them.
      */
      className="top-12! right-2! bottom-2! h-auto! overflow-hidden rounded-r-md group-data-[side=right]:border-l-0 [&>div]:bg-background"
      state={expanded ? "expanded" : "collapsed"}
      style={
        { "--sidebar-width": `${EDITOR_RAIL_WIDTH}px` } as React.CSSProperties
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

        The track is `overflow-hidden`: it is what clips the pane on its way
        past the edge.
      */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
          // accessibility tree.
          inert={drawer !== null}
          aria-hidden={drawer !== null}
        >
          {/*
            The document's title, on the rail's own 48px row.

            It is `panel.title`, which every `EditorPanelContent` already sets
            and nothing was reading — the title used to travel to the app header
            by portal instead, which was a second route for a value the panel
            context was already carrying. One route now: the page names its
            panel, the panel's column prints the name.

            `h-12 px-3` matches the drawer's row below and the nav's header
            across the shell. No `border-b`: `TopPanel` draws the only rule up
            here, and the three columns' rows read as one band because they are
            the same height, not because each one underlines itself.

            `empty:hidden` is not needed — a panel with no title renders no row
            at all rather than an empty 48px band, which is the same judgement
            `AdminHeader` makes on a primary path.

            An `h1`, and that is not decoration. This string is the name of the
            document the whole screen is about, and it was an `h1` where it used
            to render. Demoting it to a span while moving it would leave a
            document page with no top-level heading at all, which is the one
            thing a screen-reader user uses to find out what a page is.
          */}
          {title && (
            <div className="flex h-12 shrink-0 items-center px-3">
              <h1 className="truncate text-sm font-medium">{title}</h1>
            </div>
          )}

          {/* `pt-0` only under a title row: that row already leaves the form
              its air, and 48 + 16 would sit it a row and a half down. With no
              row the rail's own `p-4` is what holds it off the top. */}
          <SidebarContent className={cn("no-scrollbar gap-0 p-4", title && "pt-0")}>
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
            // `p-4`, matching the form above it: the footer's buttons sit in the
            // same column as the fields they submit. It was `py-4`, so the
            // primary action ran edge to edge while every input above it was
            // held off the rail by 16px.
            className="shrink-0 border-t p-4 empty:hidden"
          />
        </div>

        {/*
        The drawer, sliding over the form pane. Its back arrow returns to the
        form behind it, which is a different job from the header's "Back": that
        one leaves the page.
      */}
        <div
          className={cn(
            // `bg-background`, matching the pane it slides over: the drawer is
            // the same column showing something else, not a panel from
            // elsewhere. It has to be opaque, or the form behind it reads
            // through mid-slide.
            "invisible absolute inset-0 flex translate-x-full flex-col bg-background opacity-0 duration-200 ease-standard",
            drawer && "visible translate-x-0 opacity-100",
          )}
          style={{ transitionProperty: "transform, opacity, visibility" }}
          inert={drawer === null}
          aria-hidden={drawer === null}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b pr-3 pl-3">
            <div className="flex min-w-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm" icon
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
