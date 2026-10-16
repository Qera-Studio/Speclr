"use client";

import Link from "next/link";
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isPrimaryPath, parentCrumb } from "./breadcrumb";
import { usePageHeaderSlot } from "./PageHeaderSlot";
import { useDocumentCrumb } from "./DocumentCrumb";

/**
 * One row across the top of the content panel: back, where you are, and
 * whatever the page puts beside it.
 *
 * It was two rows and part of a third. The breadcrumbs were here; the document
 * title and its pager were a second bar inside the page (`DocumentWorkspaceBar`,
 * now gone); the back arrow was a third, in the editor rail's own header a
 * column to the right. Three bands stacked down the top of one screen, each
 * saying a different part of "which document is this and where did it come
 * from". They are one line now, read left to right: back, the trail, the pager.
 *
 * The title is not here: it names what the rail is editing, so it prints on the
 * rail's own row (`EditorSidebar`), which is the column it belongs to. What
 * arrives by portal through `PageHeaderSlot` is the autosave line and the pager,
 * because the page owns that state and the header does not know what a document
 * is.
 *
 * `h-12`, the nav header's height. The shell's three columns each carry one row
 * across the top and they are levelled against the nav, which is where every
 * other measurement up here already comes from.
 *
 * Still not a bar: no border, no background, no blur. `TopPanel` draws the only
 * horizontal rule up here, and a second one 36px under it was what made this
 * read as chrome stacked on chrome.
 */
export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const slot = usePageHeaderSlot();
  // The document type, when the page below is showing one. The path cannot say
  // so on its own; see `DocumentCrumb.tsx`.
  const typeLabel = useDocumentCrumb();
  const primary = isPrimaryPath(pathname);

  // A page the nav links to directly has nothing to say here: the rail is
  // already showing where you are, and there is nowhere above it to go back to.
  // The portal host goes with it, which is safe because a document is always a
  // secondary route — every one of them is reached through its type's list.
  if (primary) return null;

  // Where back lands, and what to call it. One walk for both, so the tooltip
  // cannot name somewhere the click does not go.
  const parent = parentCrumb(pathname);

  /*
    Whether leaving can lose anything, which is what decides between a plain
    link and a confirmation.

    **A document editor is the only page that can.** Its edits live in the form
    until the autosave runs or Finalize is pressed, so back is genuinely
    destructive there. Every other secondary page saves a section at a time
    against a row that already exists (`CONTEXT.md` §5d), and the one panel that
    does hold unsaved input, the editor rail, carries its own discard guard in
    `RecordPanel`.

    So the dialog was firing on pages with nothing to discard: opening a service
    and pressing back asked whether to abandon work that had already been
    written. A confirmation that is usually wrong is a confirmation people learn
    to click through, which spends the one on the document editor that matters.

    Read off the path rather than published upward from the page. `/…/docs/…`
    is what a document route is, and the alternative is a second context beside
    `DocumentCrumb` whose only subscriber would be this one button.
  */
  const guarded = /^\/(client|admin)\/docs\//.test(pathname);

  return (
    <header
      data-print-hidden
      // `h-12`, the nav header's height, so the three columns' top rows are one
      // band across the shell. `px-2` for the same reason: the nav's header and
      // its rows both sit in 8px, so the back button's box starts where the nav
      // rows' boxes start rather than a pixel column of its own.
      //
      // **No `z-index`, and that is the fix rather than the omission.** It
      // carried `z-30` against the nav's `z-20`, which did exactly what it says
      // and was the bug: the collapsed nav peeks open over the card
      // deliberately (`ui/sidebar.tsx`), the card's fill is drawn by
      // `SidebarInset` at `z-auto` and goes under it, and this row's `z-30`
      // lifted the back chip and the trail back out on their own. Glyphs from
      // two columns interleaved, with the nav's panel showing between them,
      // because this row is transparent and had nothing to hide it with. The
      // card goes under the peek whole or not at all, and under is what the
      // peek is for.
      className="relative flex h-12 shrink-0 items-center gap-2 px-2"
    >
      {/*
        Back leaves the page, and a draft's unsaved edits live in the form
        rather than on the server, so it asks first. This is the rail's old
        arrow, moved: same confirmation, same destination, now at the head of
        the row it belongs to rather than in a column to the right of it.

        **It was a filled chip reading "Back", and both halves were dropped on
        18 September 2026.** The arguments for them are worth keeping, because
        each is answered by something else in the row rather than being wrong:

        - The resting `bg-accent` was there because a ghost control among
          breadcrumb text reads as another crumb until the pointer finds it.
          The separator beside it now draws that boundary, which is the job the
          fill was doing.
        - The word "Back" was there because a bare arrow sat one row above a
          pager whose own arrows also mean "back". The pager is at the far end
          of the row now, so the two are no longer read as a pair.

        **Both strings name the destination, because there are two back
        controls on a document page.** This one leaves for the list the document
        came from; the editor's own arrow steps through the flow. Two unlabelled
        arrows that mean different kinds of "back" is the confusion the word
        used to remove, and naming where this one lands removes it better: the
        difference between them is not that one is a button but that they go to
        different places.

        The destination is read off the breadcrumb (`parentCrumb`), which is the
        same walk the trail below renders and the same one the click navigates
        to, so the tooltip cannot promise somewhere the button does not go.

        The two strings differ, per §1.5. The tooltip is read by somebody who
        can see the arrow and the trail beside it, so the destination alone is
        the whole of what it adds; the `aria-label` is reached out of that
        context, so it keeps its verb. An icon-only control with no accessible
        name is the one button rule `design-system.test.ts` fails the build
        over.
      */}
      {guarded ? (
        /*
          Worth knowing when checking this in a browser: Base UI's tooltip is
          not `[role=tooltip]`. The trigger carries `aria-haspopup="dialog"`,
          so a hover check should look for `[data-slot=tooltip-content]`.
        */
        <ConfirmDialog
          trigger={<BackButton label={parent.label} />}
          tooltip={parent.label}
          title="Leave page"
          consequence="Anything you have not saved will be lost."
          confirmLabel="Leave page"
          destructive
          onConfirm={() => router.push(parent.href)}
        />
      ) : (
        /*
          A real anchor where nothing can be lost, not a `router.push` behind a
          button. Middle-click, cmd-click and "copy link address" all work on
          the first and none work on the second, which is `RowOpener`'s own
          argument one level up: a control that navigates and is not a link is
          a link with its affordances removed.
        */
        <Tooltip>
          <TooltipTrigger
            render={<BackButton label={parent.label} href={parent.href} />}
          />
          <TooltipContent>{parent.label}</TooltipContent>
        </Tooltip>
      )}

      {/*
        The trail is not here any more: it moved to `TopPanel`, the band above
        the card, on 18 September 2026. The separator that stood between the
        arrow and it went with it, having nothing left to separate.

        The arrow deliberately did **not** go up with the trail, so the two
        rows each begin with one navigational thing rather than stacking both
        in the same column. What that costs is the reason the arrow had a
        resting fill in the first place: it is a ghost control with no text and
        now nothing beside it, so what tells a reader it is a control is its
        hover and focus states rather than anything at rest. Its tooltip names
        the destination, which is the compensation.
      */}

      {/*
        What kind of document this is, centred on the inset.

        Absolutely positioned rather than a flex child, and that is the whole
        reason it can be centred at all: the trail to its left and the pager to
        its right are different widths on every page, so a centred flex item
        would sit at the middle of whatever they left over and drift with the
        length of a uuid. Out of flow it takes the card's own centre.

        `pointer-events-none` because it spans the row it floats over, and a
        transparent strip across the header would otherwise swallow clicks
        meant for the trail and the pager underneath it.

        It is the same value the trail's type crumb reads, so the two cannot
        disagree about what is open.
      */}
      {typeLabel ? (
        <p className="pointer-events-none absolute inset-x-0 text-center text-sm font-medium text-foreground">
          {typeLabel}
        </p>
      ) : null}

      {/* The page's own content: the document title, then its pager hard
          against the right edge. Empty on every page that portals nothing,
          where it is an unfilled flex child and draws nothing. */}
      <div
        ref={slot?.setHost}
        data-slot="page-header-host"
        className="flex min-w-0 flex-1 items-center gap-3"
      />
    </header>
  );
}

/**
 * The arrow itself, in both of its forms.
 *
 * One component because the two differ only in what happens on the click: with
 * an `href` it is a link, without one it is the button a dialog trigger wraps.
 * Writing it twice would be the same arrow, size, colour and label maintained
 * in two places, and the failure mode is silent (they drift and nobody sees
 * both at once).
 *
 * `...rest` is what makes the trigger pairing work: Base UI's `render` prop
 * hands the trigger's own props to the element it is given, so they have to
 * reach the `Button` rather than being dropped here.
 */
function BackButton({
  label,
  href,
  ...rest
}: Omit<React.ComponentProps<typeof Button>, 'href'> & { label: string; href?: string }) {
  const shared = {
    'aria-label': `Back to ${label}`,
    className: cn(
      buttonVariants({ variant: 'ghost', size: 'sm', icon: true }),
      'shrink-0 text-muted-foreground',
    ),
  };

  // `buttonVariants` on a `Link` rather than a polymorphic button, which is
  // `add-button.tsx`'s own pairing: a Next `Link` and not a bare anchor,
  // because an internal href on an `<a>` is a full document load that tears
  // down the admin shell and brings a collapsed sidebar back expanded.
  if (href) {
    return (
      <Link {...(rest as React.ComponentProps<typeof Link>)} {...shared} href={href}>
        <ArrowLeft className="size-3.5" />
      </Link>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm" icon
      aria-label={shared['aria-label']}
      className="shrink-0 text-muted-foreground"
      {...rest}
    >
      <ArrowLeft className="size-3.5" />
    </Button>
  );
}
