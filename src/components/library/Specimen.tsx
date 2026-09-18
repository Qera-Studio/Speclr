"use client";

import { useState, type ReactNode } from "react";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One variant on the page: a name, why it is here, and the live control.
 *
 * `role="group"` with the variant's name on it, because a specimen is a region
 * of the page a reader moves between and a screen reader otherwise reads four
 * pagers in a row with nothing between them saying which is which. It is also
 * what lets a test scope an assertion to one specimen, which matters when every
 * variant on the page renders buttons called "Page 1".
 *
 * **The card is tinted and the stage is an inset of the page's own background.**
 * That is the one design decision this file makes, and it is the way round it
 * is because the caption is furniture and the specimen is the subject. A
 * control drawn on a tint is a control being judged against a fill it will
 * never sit on: every `outline` button in the app stands on `--background`,
 * and a `--sidebar` stage quietly flatters its border. So the tint holds the
 * heading and the inset holds the component, on the fill it really ships on.
 */
export function Specimen({
  name,
  empty = false,
  fill = false,
  children,
}: {
  name: string;
  /**
   * Why this variant is here. Required, and deliberately **not rendered**: see
   * the note in the body. Every variant still has to have one written down
   * even while the card does not show it, which is why this stays required.
   */
  note: string;
  /** This variant is the component declining to render. Drops the stage entirely. */
  empty?: boolean;
  /**
   * The child is a set of examples that wants the whole stage, laid out from
   * the left.
   *
   * The default is one control pushed right, which is where a pager sits in a
   * table footer and is the reason the stage is built that way. A row of
   * button samples is not one control: it reads left to right like the prose
   * above it, and pushed right it wraps from the wrong edge.
   */
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      role="group"
      aria-label={name}
      className="flex flex-col rounded-md border border-border bg-sidebar"
    >
      {/*
        The note is not rendered. Tried under the heading and again inside the
        inset, and the card reads better as a heading over the thing itself: at
        this width the prose is two or three lines of grey above every specimen
        and the page becomes something to read rather than something to look at.

        It stays on the catalogue rather than being deleted, because it is the
        reasoning behind each variant and `catalogue.ts` is where that belongs.
        Bring it back by rendering `note` here.
      */}
      <div className="px-1 pt-2 pb-2">
        <h3 className="text-sm font-medium">{name}</h3>
      </div>
      {/*
        `min-h-14` so a short control still gets a stage to stand in, and
        `justify-between` so one control sits right where every real pager does.

        **An absence gets no stage at all.** Some variants are a component
        declining to render (a pager at one page), and that is the rule rather
        than a failure. An empty inset among full ones reads as something that
        broke, so the card is left as a heading alone. `:empty` would be the
        tidy way to detect this in CSS, but a React child that renders `null`
        still leaves no node, so the caller is the only one who can know: hence
        the prop, defaulted off.
      */}
      {empty ? null : (
        <div
          className={cn(
            "mx-0.5 mb-0.5 flex min-h-14 items-center gap-4 rounded-sm border border-border bg-background px-4 py-3",
            fill ? "justify-start" : "justify-between",
          )}
        >
          {fill ? null : <span />}
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * A live pager over a given number of pages.
 *
 * It holds its own page exactly as `usePagedRows` does for a table, so clicking
 * a number, an arrow or the box moves it for real. **That is the point of the
 * library**: the window's batch turn, the runs merging at either end and the
 * box's commit-on-blur are all behaviours, and a screenshot of a pager proves
 * none of them. What ships is what is on this page, because it is the same
 * component the four callers import.
 */
export function LivePager({
  pageCount,
  start = 0,
}: {
  pageCount: number;
  /** Zero-based opening page, for a variant that only appears mid-list. */
  start?: number;
}) {
  const [page, setPage] = useState(start);

  return (
    <Pagination
      page={Math.min(page, Math.max(0, pageCount - 1))}
      pageCount={pageCount}
      onPageChange={setPage}
      label="specimen"
    />
  );
}

/** Opens a drawer specimen, and says which one. */
export function DrawerTrigger({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" size="form" onClick={onClick}>
      {label}
    </Button>
  );
}
