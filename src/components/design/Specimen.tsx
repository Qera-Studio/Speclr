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
  stage = 'background',
  trial = false,
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
  /**
   * The surface the component really ships on, which is what the stage is for.
   * Nearly everything stands on `--background`; a pager stands in a table
   * footer on `--sidebar`, and judged on anything else it is signed off on a
   * band it never sits on (`e2e/component-library.spec.ts` measures it).
   */
  stage?: 'background' | 'sidebar';
  /**
   * The looser frame being tried on the Specimen entry only (16 October
   * 2026): no border on the stage, twice the card padding. Lands everywhere
   * or is deleted; never set it elsewhere while it is being judged.
   */
  trial?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      role="group"
      aria-label={name}
      className={cn(
        "flex flex-col rounded-md border border-border",
        trial ? "bg-muted" : "bg-sidebar",
      )}
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
      <div className={trial ? "px-3 pt-4 pb-3" : "px-1 pt-2 pb-2"}>
        <h3 className="text-body font-medium">{name}</h3>
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
            // `min-w-0` on the stage, and it is the same one-property lesson as
            // `overflow-clip` on `AdminShell` and `min-h-0` on
            // `UploadDropzone`'s preview (`CONTEXT.md` §5e): a **flex item's
            // `min-width` is `auto`**, so a child that cannot shrink below its
            // content floors the box holding it. A table specimen is exactly
            // that child — a 1824px table in a 924px stage pushed the stage to
            // 1842 and every ancestor with it, so the table ran out past the
            // card, past the library pane and under the window's edge.
            //
            // On the stage rather than on the table, because the table is
            // already `w-full` and doing the right thing: what was wrong was
            // the box being asked to contain it. It costs nothing to a specimen
            // whose content fits, which is every other one on this page.
            "flex min-h-14 min-w-0 items-center gap-4 rounded-sm",
            trial ? "mx-1 mb-1 px-6 py-4" : "mx-0.5 mb-0.5 border border-border px-4 py-3",
            stage === "sidebar" ? "bg-sidebar" : "bg-background",
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
    <Button type="button" variant="secondary" size="lg" onClick={onClick}>
      {label}
    </Button>
  );
}
