'use client';

import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { needsControls, pageRuns } from '@/components/ui/pageGroups';

/**
 * Client-side pagination for the admin tables, and the one pager in the app.
 *
 * Not shadcn's `pagination` primitive: that one is built from `<a href>` links
 * for URL-driven paging, and these lists page in memory over data the page has
 * already fetched — the same reasoning as the in-memory filtering in
 * `DocumentsBrowser`.
 *
 * It used to say it "mirrors the document preview's pager", and a mirror is
 * what it was: two components, and only one of them had the box you type a page
 * into. So a nine-page document went to page 9 in one keystroke and a nine-page
 * table took eight clicks, for no reason either surface could give. `docs/design.md`
 * §2.10 now states the rule the other way round — **a pager is this component** —
 * and `DocumentPager` is a thin wrapper over it rather than a second copy.
 */

/** Rows per page. Ten keeps a long list from burying whatever follows it. */
export const PAGE_SIZE = 10;

/**
 * Slice `rows` into pages, holding the current page.
 *
 * The page is **clamped during render** rather than corrected in an effect:
 * filtering or deleting can shrink the list under the page you are on, and a
 * clamp means that never shows an empty table for a page that no longer exists.
 */
export function usePagedRows<T>(rows: T[], pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(0, page), pageCount - 1);
  const start = safePage * pageSize;

  return {
    page: safePage,
    pageCount,
    visible: rows.slice(start, start + pageSize),
    setPage,
    /** Index of the first row shown, for a "1–10 of 24" style summary. */
    start,
  };
}

/**
 * "24 clients", or "1–10 of 24 clients" while a page is showing part of them.
 *
 * The count belongs beside the pager rather than above the table: it is the
 * answer to "is this all of them", which is a question you ask at the *end* of
 * a list. The en dash is the correct character for a numeric range and is the
 * one place the house rule allows it.
 */
export function rowCountLabel(
  total: number,
  noun: string,
  start = 0,
  shown = total,
): string {
  const word = total === 1 ? noun : `${noun}s`;
  return shown < total
    ? `${start + 1}–${start + shown} of ${total} ${word}`
    : `${total} ${word}`;
}

/**
 * The pages, as a tab group: a trough with the page you are on raised on it.
 *
 * It was a "Page 3 / 9" label between two arrows, which is a readout rather
 * than a control — every page but the two either side of you took a click each
 * to reach, and the one thing the label told you was already in the row count
 * beside it. The numbers are the control now, and they borrow the tab pill's
 * surface because a raised thing on a trough is a shape this app already has
 * (`docs/design.md` §2.10, and `tabPillSurface` in `ui/tabs.tsx`).
 *
 * **Past six pages it becomes three runs**: the first page, a sliding window of
 * four, and the last, all inside one container with a hairline standing where
 * numbers are missing. `1 7 8 9 10 23` run together would be a lie about which
 * numbers are adjacent, and the separator is what refuses to tell it. Where a
 * run would touch its neighbour the two are merged instead and no rule is
 * drawn, so no number is ever repeated and no elision is ever claimed between
 * neighbours. All of that arithmetic is in `pageGroups.ts`.
 *
 * Each run carried its own trough once, and the gap between troughs did the
 * separator's job. One container is fewer objects (it was five strokes to say
 * one thing) but the background then groups everything *together*, so the gap
 * alone became indistinguishable from loose tracking. The hairline is what the
 * trough edges used to be.
 *
 * **The arrow steps one page and the window follows in batches.** Inside a
 * window it moves the pill; stepping off the last slot starts the next four.
 * That keeps the arrow's meaning constant — it is always "next page" — while
 * the numbers under it turn a page at a time rather than crawling one column
 * per click.
 */
function PageRuns({
  page,
  pageCount,
  onPageChange,
  label,
  children,
  box,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
  /** The arrows, rendered either side of the runs inside the one container. */
  children?: (position: 'before' | 'after') => ReactNode;
  /** The go-to box, last in the container, after the trailing arrow. */
  box?: ReactNode;
}) {
  return (
    <div
      data-slot="page-runs"
      /*
        **One container, holding the arrows and every number.**

        It was three troughs with the arrows loose outside them, which drew five
        separate objects to say one thing: five strokes, five fills, and a
        reader having to work out that they were one control. The gap between
        runs still says numbers are missing, but it is now a gap *inside* a box
        rather than a gap between boxes, so the background does the grouping and
        the strokes do not have to.

        **No fill: the stroke is what groups it.** It carried
        `bg-sidebar-field`, and that token is slate-100 in light and slate-900
        in dark — where `--background` is *also* slate-900, so the fill only
        ever existed in one theme. A surface that appears in light and vanishes
        in dark is not the ramp doing its job, it is two different pagers, and
        the light one was the odd one out (18 September 2026).

        Nothing was lost with it. The border below already says where the
        control ends, and the gap between runs still says numbers are missing;
        the fill was a third thing saying what those two say.

        The pill inside had to absorb it. It was "the step above the container",
        which only means something while the container has a fill to be above;
        it now sits on the card and steps *down* in light instead. See
        `--page-active` in `globals.css`.
      */
      className="flex items-center gap-2 rounded-lg border border-border p-[3px]"
    >
      {children?.('before')}
      {pageRuns(page, pageCount).map((run, position) => (
        <Fragment key={run[0]}>
          {/*
            A hairline where numbers are missing.

            The gap alone used to say this, and it worked while every run had
            its own trough: the space between two backgrounds is a boundary. One
            container groups everything *together* instead, so 8px between runs
            became indistinguishable from loose tracking and `‹ 1 9 10 11 12 23 ›`
            read as one continuous list — the exact lie §2.10 exists to prevent,
            reached from the other direction.

            It sits *between* runs, never after the last, or it would claim
            pages beyond the last page. `aria-hidden` because it says something
            about numbers a screen reader is already reading one at a time with
            their own labels, and the live region above states the page.

            **Not `--border`, and that is the point of it.** `--border` is what
            bounds a box, and in dark it is white at 10%, about as faint as a
            line gets here. This rule is not bounding anything: it is the only
            thing left saying numbers are missing, now that the runs have no
            troughs whose edges once said it. A mark that carries meaning cannot
            be quieter than the frame around it, so it is drawn in the text
            ramp at 40% — under a digit's own weight, over the container's edge.
          */}
          {position > 0 ? (
            <span
              data-slot="page-gap"
              aria-hidden="true"
              className="h-3 w-px shrink-0 rounded-full bg-muted-foreground/40"
            />
          ) : null}
        <div
          data-slot="page-run"
          /*
            A run has no fill and no stroke of its own any more. It is a
            grouping of adjacent numbers, and with one container around
            everything the only thing it still has to do is hold its members
            tight together so the 8px between runs reads as the gap it is.
          */
          className="flex items-center gap-0.5"
        >
          {run.map((index) => {
            const current = index === page;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onPageChange(index)}
                // "Page 4 of clients", or just "Page 4" where the pager names
                // no list. A bare `of` left dangling by an empty label is what
                // the arrows' own templates already avoid by ending on it.
                aria-label={label ? `Page ${index + 1} of ${label}` : `Page ${index + 1}`}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  // `rounded-sm` against the container's `rounded-lg`: a tighter
                  // inner corner is what says the pill is *in* the box. Two
                  // boxes at one radius read as a single shape with a line
                  // through it.
                  'inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-transparent px-1.5 text-xs font-medium transition-colors [font-variant-numeric:tabular-nums]',
                  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                  current
                    ? /*
                        `--page-active`: lighter than the container in both
                        themes, plus a stroke.

                        Its own token because no existing role is a step *up*
                        from `--sidebar-field` on both sides. `--card` is right
                        in light (slate-50) and is the container's own value in
                        dark, where the fill separated by 0.000 and only the
                        border drew the active page. `--raised`, which every
                        other active pill in the app uses, is the mirror
                        problem: it fixes dark and is a step *down* in light,
                        making the pill a well.

                        Dark is slate-700 rather than the symmetrical
                        slate-800, on request and for contrast: 3.04 against the
                        container where slate-800 gives 0.91. Lighter is what
                        "nearer" means under a light source, and that does not
                        invert with the theme, so dark raises rather than sinks.
                      */
                      'border-border bg-page-active text-foreground shadow-sm dark:shadow-[0_1px_2px_oklch(0_0_0/0.4)]'
                    : /*
                        Bare at rest, filled only under the pointer. A resting
                        fill on every number would rebuild the per-page box the
                        container replaced, and leave the active one nothing to
                        be raised from.

                        **Hover is darker than the active pill here, which is
                        the one place in the app that inverts.** Everywhere
                        else a hovered thing is a step toward the reader and an
                        active thing is further still; in this control the pill
                        is the *smallest* step off the page (slate-100, one
                        rung) because it is a resting state that also carries a
                        border and a shadow, and the fill is only the third
                        thing saying "you are here".

                        That leaves hover with nowhere to go but past it, to
                        slate-200. It works because hovering is transient and
                        reads as a press, and because only the pill has a
                        stroke: the two are never confusable even at the moment
                        the pointer is over the current page.

                        Measured, both themes, rather than reasoned about:
                        light is page 100, pill 96.2, hover 92.2 — and the pair
                        collided at 90.9 when the pill was slate-200, which is
                        what this arrangement exists to avoid.
                      */
                      'text-foreground/60 hover:bg-hover hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground',
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        </Fragment>
      ))}
      {children?.('after')}
      {box}
    </div>
  );
}

/**
 * The pages as a tab group, with arrows and a go-to box on a long list.
 *
 * **The box is the pager's own state until it is committed.** Typing "1" on the
 * way to "12" must not page to 1 and then to 12, so the value is local and
 * applied on Enter or on blur. It re-syncs from `page` whenever that changes
 * underneath: the arrows move it, and in the document preview scrolling does
 * too, and a box still holding what was typed three pages ago is a box lying
 * about where you are.
 *
 * Renders nothing at a single page — a pager whose every control is disabled is
 * noise under a short table.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  label,
}: {
  page: number;
  pageCount: number;
  /**
   * Go to a page, however that surface moves.
   *
   * The only mover, and it used to be one of three: the document preview was
   * given `onPrev`/`onNext` on the grounds that its arrows animate a scroll
   * where a table's swap a slice. That distinction was never real — the box
   * already went through this same callback, so typing a page scrolled while
   * clicking the arrow beside it also scrolled, through a different prop. Every
   * caller routed all three at one function. A number now scrolls for exactly
   * the same reason, and there is one way in.
   */
  onPageChange: (page: number) => void;
  /** Names what is being paged, for screen readers ("contracts", "services"). */
  label: string;
}) {
  const [typed, setTyped] = useState(String(page + 1));
  useEffect(() => setTyped(String(page + 1)), [page]);

  if (pageCount <= 1) return null;

  const commit = () => {
    const target = Number(typed);
    // An empty or out-of-range box is not a page, so it goes back to saying
    // where the reader is rather than silently moving them somewhere else.
    if (!typed || !Number.isFinite(target) || target < 1 || target > pageCount) {
      setTyped(String(page + 1));
      return;
    }
    onPageChange(target - 1);
  };

  /*
    The arrows and the box are the tools for a list too long to click through,
    so they appear exactly when the numbers stop being the whole list. Under
    that, every page is one click away and a disabled arrow beside them would
    be a control with nothing to do.
  */
  const controls = needsControls(pageCount);

  return (
    <nav
      // Everything is in the container now: the arrows, the numbers and the
      // box. The nav is only the landmark and the live region.
      className="flex items-center justify-end"
      aria-label={`${label} pagination`}
      data-slot="pagination"
    >
      {/* A live region for the page, since the numbers themselves are buttons
          and a screen reader following a click hears the label rather than
          where it landed. */}
      <span className="sr-only" aria-live="polite">
        Page {page + 1} of {pageCount}
      </span>

      <PageRuns
        page={page}
        pageCount={pageCount}
        onPageChange={onPageChange}
        label={label}
        box={
          controls ? (
            /*
              Deliberately not the shadcn `Input`: that primitive is a
              full-height bordered form field, and this is a two-character box
              inside a pager that is itself 30px tall.

              **A step *down* from the surface while every other filled thing
              here is a step up.** That direction is the point: an active or
              hovered page is a pill lifted off the surface, and this is a well
              sunk into it, because it is the one control here you type into
              rather than press.

              `bg-sidebar-field` rather than `--hover`, since the container
              stopped filling and the box's own surface moved with it. As a
              well inside a slate-100 container, `--hover` (slate-200) was one
              ramp step; on the bare card it became a two-step drop and read as
              a hard chip on a light panel. Slate-100 restores the one step.

              `--hover` was deliberately not re-valued to fix this:
              `DocumentsCards` uses it for a hovered card, and moving a shared
              role to suit one caller is how a token stops meaning anything
              (`docs/design.md` §1.1).

              **This is now the same value as the active pill, and that is a
              decision rather than a drift** (18 September 2026). The pill came
              down to slate-100 as well, so the well and the marker are one
              fill apart from the pill's border and shadow. Allowed because
              they sit at opposite ends of the control and are never read
              against each other, and because the ramp has exactly one rung
              between the page and slate-200: something had to share. If the
              box ever needs to be told apart from the pill at a glance, it
              goes *down* to slate-200, not the pill up.

              It was transparent until hovered once, which made the one control
              you can *type* into look like the counter printed beside it. A
              field that takes input should say so before it is touched. Still
              borderless: the fill identifies it, and a stroke as well would
              make a form field of it.

              Digits only, sanitised on the way in rather than rejected
              afterwards (`AGENTS.md`, input rules). It is not registered with
              react-hook-form, so `numericField` does not apply.
            */
            <input
              type="text"
              inputMode="numeric"
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commit();
                }
                // The document workspace pages on the arrow keys, and a caret
                // inside this box is the one place they mean "move within the
                // value".
                e.stopPropagation();
              }}
              aria-label={`Go to page of ${label}`}
              className="h-6 w-9 rounded-sm bg-sidebar-field text-center text-xs text-muted-foreground transition-colors [font-variant-numeric:tabular-nums] hover:text-foreground focus:text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            />
          ) : null
        }
      >
        {(position) =>
          controls ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              // Square, and a shade smaller than a page so the glyph sits at
              // the same optical weight as a digit beside it.
              className="size-6 rounded-sm"
              onClick={() => onPageChange(position === 'before' ? page - 1 : page + 1)}
              disabled={position === 'before' ? page <= 0 : page >= pageCount - 1}
              aria-label={`${position === 'before' ? 'Previous' : 'Next'} page of ${label}`}
            >
              {position === 'before' ? <ChevronLeft /> : <ChevronRight />}
            </Button>
          ) : null
        }
      </PageRuns>
    </nav>
  );
}
