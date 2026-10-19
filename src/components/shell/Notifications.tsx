"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { DrawerFrame } from "@/components/ui/drawer-sheet";

/**
 * The header's bell, and the drawer it opens.
 *
 * **Nothing produces a notification yet**, and the drawer says so in those
 * words rather than showing a plausible-looking list. speclr sends no mail and
 * has no background job; an invented "Invoice QS-INV-2627-001 was viewed" would
 * be a fabricated record in an app whose whole point is records that are not.
 *
 * `Sheet` rather than a hand-rolled panel: it is the house primitive for a
 * pane that slides in over the page, and it brings the backdrop, the focus
 * trap, Esc-to-close and the right-to-left transition with it. It was already
 * in `ui/` serving the mobile nav inside `sidebar.tsx`; this is its second
 * caller, not a new dependency.
 *
 * The editor rail's `WordingDrawer` is deliberately *not* the model here. That
 * one slides within the rail because every field in it changes a word printed
 * beside it, so covering the preview would hide the thing being edited. A
 * notification is about the app rather than about the document on screen, so it
 * is chrome over the page, not a second pane inside a column.
 *
 * It opens **inside the inset card**, and says nothing about that at all: the
 * shell publishes the card through `InsetProvider` and `SheetContent` reads it
 * (`ui/sheet.tsx`). This component used to be handed the ref as a prop, which
 * worked only because it is a direct child of the shell, and left every drawer
 * deeper in a page with no way to ask.
 *
 * Why it matters here: a sheet over the window darkened the nav, the header
 * band and the margin the card floats in, so the one permanent column went dim
 * to report something that has nothing to do with it. The scrim belongs to the
 * surface being covered.
 */
export default function Notifications() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm" icon
            aria-label="Notifications"
            className="shrink-0 text-muted-foreground"
          >
            <Bell className="size-4" />
          </Button>
        }
      />
      {/*
        `DrawerFrame` rather than the parts: same three-part layout every
        drawer in the app draws, and the padding, the close-button clearance
        and the scrolling body come with it. `headerBorder` is on here and off
        in the editing drawers, which is the one real difference between them:
        this header is a label over a feed of unrelated items, so a rule is
        right; a header naming the field directly below it should not be
        fenced off from it.

        Not `RecordDrawer`, because there is no record: a feed has no draft, no
        dirty state and nothing to save.
      */}
      <DrawerFrame
        // A feed read down one column, which is the narrow size.
        size="sm"
        title="Notifications"
        description="Anything the app needs to tell you will appear here."
        headerBorder
      >
        <Empty className="h-full border-0 bg-transparent dark:bg-transparent">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellOff />
            </EmptyMedia>
            <EmptyTitle>Nothing to report</EmptyTitle>
            <EmptyDescription>
              You have no notifications. speclr does not send any yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </DrawerFrame>
    </Sheet>
  );
}
