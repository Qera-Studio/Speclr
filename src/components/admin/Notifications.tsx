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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
 */
export default function Notifications() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="shrink-0 text-muted-foreground"
          >
            <Bell className="size-4" />
          </Button>
        }
      />
      <SheetContent side="right" className="gap-0 p-0">
        {/* `pr-14` clears the close button `SheetContent` floats at `top-4
            right-4`, so a title never runs under it. */}
        <SheetHeader className="gap-1 border-b p-4 pr-14">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            Anything the app needs to tell you will appear here.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
