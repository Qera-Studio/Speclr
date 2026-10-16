"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & {
  /**
   * For the container, not the table.
   *
   * It exists for one thing: a table wide enough to need sideways scrolling
   * puts `overflow-x-auto` here. **That trades away the sticky header**, for the
   * reason `TableHeader` records below, so it is a deliberate choice at a call
   * site rather than anything a table gets by default.
   */
  containerClassName?: string;
}) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-meta", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      // Sticky so the column names stay readable in a long list. This is why
      // the container above no longer scrolls horizontally: an ancestor with
      // `overflow-x: auto` computes `overflow-y: auto` too, which makes it the
      // scrollport and pins the header to a box that never scrolls. The page's
      // own scroll area in `AdminShell` is the scrollport now.
      //
      // `bg-sidebar`, not the `bg-background` the rows are on. A header is a
      // different kind of row and a hairline was carrying that whole
      // distinction on its own. The value is the shell's own ground, so a
      // table's header band matches the page's header band and the margin the
      // card floats in: the card then reads as data held inside the chrome
      // rather than as a box with a slightly different first row. Subtle in
      // light (slate-50 against white) and strong in dark (slate-950 against
      // the card), which is the right way round, since dark mode is where a
      // hairline does least.
      //
      // Opaque either way, which `sticky` requires: rows scroll under this.
      // The card *footer* is deliberately not tinted (docs/design.md §2.3).
      className={cn(
        "sticky top-0 z-10 bg-sidebar [&_tr]:border-b",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "h-10 border-b transition-colors hover:bg-muted/40 has-aria-expanded:bg-muted/40 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      // `scope="col"` by default. Without it a screen reader has to guess which
      // cells a heading governs, and it guesses from the table's shape, which
      // is exactly what a heading is supposed to remove the need for. Every
      // `<TableHead>` in this app is a column heading; a row heading passes
      // `scope="row"` and overrides it.
      scope="col"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        // 8px vertical padding against `h-10` on the row: a 40px row, which is the 20px line plus one control gap each side.
        // `` because a cell holds a value, not prose: prose leading
        // makes rows of different content types sit at different heights in the
        // same table.
        //
        // 44 rather than the 36 this was, in two steps and on request. It is
        // also the WCAG 2.5.5 target size, which this table had always been
        // under deliberately (a desktop-only internal tool, scanned rather than
        // tapped) and now clears for free. `RowActions`' own note already sized
        // its hit targets against a 44px row, so the two agree now instead of
        // one of them being written against a height that was not there.
        "px-2 py-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-meta text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
