"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FlowStep } from "./steps";

/**
 * The frame every multi-step flow in the app is built on.
 *
 * Lifted out of `ClientOnboarding` unchanged when the contract builder needed
 * the same three bands. It was the only wizard in the app until then, so the
 * layout, the step row, the submit portal and the finish moment all lived
 * inside it; a second flow copying that would be two sets of answers about
 * what a locked step looks like, whether the current one is announced, and
 * where the button sits (`PRINCIPLES.md` rule 1, `CONTEXT.md` §5e).
 *
 * **Three bands, and which band a thing is in is the whole layout rule: what
 * belongs to the wizard is pinned, what belongs to the step moves.** The row
 * and the button are the same on every step and the button is pressed once per
 * step in a row, so neither may travel with the fields sliding in and out
 * between them.
 *
 * Only the middle band scrolls. `h-full` resolves against the inset's scroll
 * area in `AdminShell`, which is therefore never the thing that scrolls here.
 */
export const STAGGER_MS = 80;

export default function FlowShell<R>({
  steps,
  active,
  record,
  title,
  finishing = false,
  finishPanel,
  back,
  onSelect,
  onActionsSlot,
  rightAction,
  aside,
  width,
  anchor = "center",
  fill = false,
  chrome = true,
  slideFrom = "right",
  children,
}: {
  steps: readonly FlowStep<R>[];
  active: number;
  /** Null before the first save, which is what locks `needsRecord` steps. */
  record: R | null;
  /** The page's accessible name. Visually hidden: the row already names the step. */
  title: string;
  /** Every step reads as done, ticking left to right. See `finishPanel`. */
  finishing?: boolean;
  /** Shown in place of the step while `finishing`. */
  finishPanel?: ReactNode;
  back?: { label: string; go: () => void };
  onSelect: (index: number) => void;
  /**
   * Receives the footer node the step's submit button is portalled into.
   *
   * A callback rather than the shell holding the state, because the caller is
   * what provides the slot context the steps read.
   */
  onActionsSlot: (node: HTMLElement | null) => void;
  /** The far end of the footer: "Save and close", or a phase's own escape. */
  rightAction?: ReactNode;
  /**
   * A column beside the step, under the step row rather than beside it.
   *
   * The contract builder's summary rail is the caller. It sits *inside* the
   * middle band on purpose: the step row is the frame around the whole flow,
   * so a rail wrapped around the shell would have pushed the row off-centre
   * over the form and left the rail with no progress indicator above it.
   *
   * Optional, and onboarding passes nothing. A flow with no aside lays out
   * exactly as it did before this existed.
   */
  aside?: ReactNode;
  /**
   * How wide the panel holding the step is. A Tailwind max-width class.
   *
   * Defaults to `max-w-6xl` (1152px), which is what a column of full-width
   * inputs wants. A step whose controls carry their *own* widths asks for
   * less: the contract's client phase is two calendar-wide date fields and a
   * two-digit term, so at the default it sat in a card 116px wider than
   * anything in it and the fill ran past the last field as empty space.
   *
   * It is a prop rather than the panel shrinking to its content, because the
   * panel cannot: every step is `w-full`, so `w-fit` and `w-max` both leave
   * the box asking the child while the child asks the box, and the pair
   * collapse to the padding alone. Only the step knows, so the step says.
   */
  width?: string;
  /**
   * Where the panel sits in the band: centred (default) or pinned to the top.
   *
   * Centring is right for a step whose height is fixed, which is most of them:
   * a short form in the middle of the card reads better than one hanging from
   * the step row. It is wrong for a step that **changes height as it is
   * used**, because the panel then re-centres on every change and everything
   * above the change moves.
   *
   * The contract's services phase is the caller. Its four Schedule tiles open
   * a list underneath, and the lists are different lengths: Audit has 2 rows,
   * Build has 10. Measured, the tiles travelled 92px between them, so going
   * from Build to Setup moved the tile out from under the pointer that had
   * just opened it.
   */
  anchor?: "center" | "top";
  /**
   * Drop the centred column and give the step the whole middle band.
   *
   * For a phase that is itself a layout — a document preview beside a rail, a
   * ledger of cards — rather than a column of fields.
   */
  fill?: boolean;
  /**
   * The shell's own furniture: the step row above and the pinned footer below.
   *
   * Off leaves the middle band and nothing else. The contract builder's preview
   * phase is the caller, because that phase is a document rather than a step of
   * a form, and a track across the top plus a footer underneath are two bands
   * of wizard framing something that is not one.
   *
   * Two things stay regardless. The `h1` is the page's only name for a screen
   * reader and is `sr-only` anyway. And the actions slot stays mounted, so a
   * phase portalling its button into it is never left holding a node that never
   * arrives; where that button then *appears* is the caller's business.
   */
  chrome?: boolean;
  /** Which way the last move went, so the step slides in from where it came. */
  slideFrom?: "left" | "right";
  children: ReactNode;
}) {
  const step = steps[active];

  return (
    /*
      One column holding all three bands, so they share a centre by
      construction. They used to centre independently, which is visible the
      moment a flow has an aside: the row centred on the whole card while the
      form started at the rail's right edge, and "Client" printed over the rail.

      **The cap is on the header alone, not here.** The row is five words
      spread across a track, and a track as wide as a 1,900px card says nothing
      about progress because every step is then equally far from every other.
      The band below wants the opposite: the rail and the form are columns of
      content, and capping them would leave the form narrow with air down both
      sides of the card it already sits inside.
    */
    <div className="mx-auto flex h-full min-h-0 w-full flex-col">
      {/*
        The step row is the whole progress indicator. A bar, a "Step 3 of 7"
        label and a "2/7 complete" counter all said the same thing the row was
        already showing, three more times — and the page heading repeated the
        step heading directly below it. The h1 stays for assistive tech, which
        does need a page name.

        **The cap and the 80px gutters are this band's own**, and nothing else
        shares them. Edge to edge across the card the row spread five steps over
        a 1,900px window, which put "Client" and "Preview" so far apart they
        stopped reading as one track: at that spacing the distance between two
        steps says nothing, because every step is equally far from every other.
        The band below is content rather than a track and takes the full width.
      */}
      {/* With the chrome off the band collapses to the heading alone, which is
          `sr-only` and therefore costs no height. The padding goes with the row
          rather than staying on an empty header: a band with nothing in it is
          still 96px of nothing at the top of the card. */}
      <header
        className={cn(
          "mx-auto w-full shrink-0",
          chrome && "max-w-5xl px-20 py-8",
        )}
      >
        <h1 className="sr-only">{title}</h1>
        {chrome ? (
          <StepNav
            steps={steps}
            active={active}
            record={record}
            finishing={finishing}
            onSelect={onSelect}
          />
        ) : null}
      </header>

      {/*
        No step heading: the row above already names the step, and repeating it
        as an h2 with a description under it said the same thing twice and cost
        the fold. `aria-label` keeps the section named for assistive tech.

        `m-auto` on the inner column is what gives both behaviours from one
        rule: a short step sits in the middle of the card instead of hugging the
        top, and a tall one scrolls from the top once it outgrows the band.

        That needs the band to be a flex *container*, not merely a flex item.
        `flex-1` makes it the latter, and auto margins in block layout resolve
        to zero vertically — which is why the column centred sideways and still
        hugged the top. `flex flex-col` is the whole fix. Auto margins rather
        than `justify-center` deliberately: a centred flex line pushes overflow
        past the scroll container's top edge, out of reach; auto margins
        collapse instead, so a tall step still scrolls from its first field.
      */}
      {/*
        The band is a row when there is an aside: the rail, then the step.

        The aside is **inside** this band rather than wrapped around the whole
        shell, which is what puts the step row and the footer across both
        columns instead of only over the form. Wrapped outside, the row centred
        itself on the remaining column and sat visibly off-axis from the track
        it is meant to frame.

        `min-h-0` and `min-w-0` on the row for the usual reason: a flex child's
        minimums are `auto`, which floors this at its widest content and pushes
        the layout off the card instead of scrolling inside it.
      */}
      <div className="flex min-h-0 min-w-0 flex-1 gap-6">
        {aside}
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
          aria-label={step?.title ?? title}
        >
          {/* `shrink-0`, or a step taller than the band gets squashed to fit
            rather than scrolling. A `fill` phase is the exception: it is its
            own layout and takes the band, so it must be allowed to shrink and
            to stretch. */}
          {/*
          **The fill is on this box, not on the scroll column above it.** The
          column is the full height and width of the band, so filling it
          painted the empty track the centred form floats in as well, and the
          surface ran to the card's own edges with no margin between the two.
          Here it ends where the form ends, which is what makes it read as a
          panel the fields sit on rather than as the band's background.

          `bg-card` is slate-50 in light and slate-900 in dark, the token
          rather than a palette class for the ordinary reason
          (`design-tokens.test.ts` bans the latter), and it already carries a
          measured contrast pair for muted text, which a form is mostly made of.
          It is also what replaced the rule between the two columns: one is
          filled and one is not, which separates them without drawing a seam
          through a card meant to read as continuous.

          A `fill` phase takes none of it: it is its own layout and draws its
          own insets.
        */}
          {/*
            `max-w-6xl` is the ceiling; a step that wants less says so with
            `width`, which is what `ClientPhase` does.

            Shrinking the panel to its content from *here* was tried twice and
            cannot work: every step is `w-full`, so `w-fit` (`fit-content`,
            resolved against the available width) and `w-max` (`max-content`)
            both leave the box asking the child while the child asks the box,
            and the pair collapse to the padding alone — measured at 80px.
            Only the step knows how wide it wants to be, so only the step can
            say.
          */}
          <div
            className={cn(
              fill
                ? "flex min-h-0 w-full flex-1 flex-col"
                : cn(
                    "mx-auto w-full shrink-0 rounded-lg bg-card p-10",
                    // `my-auto` centres a short step in the band, which is
                    // right for a form that does not change height. A step
                    // that grows as it is used must not: see `anchor`.
                    anchor === "top" ? "mb-auto" : "my-auto",
                  ),
              fill ? undefined : (width ?? "max-w-6xl"),
            )}
          >
            {finishing ? (
              finishPanel
            ) : (
              /*
              `key` remounts the step on every move. react-hook-form reads
              `defaultValues` on mount only, so without this, stepping from one
              step to another and back would show the previous step's values.

              The remount is also what replays the slide, for free. It comes in
              from the side it is travelling from, so going back looks like
              going back rather than like another new page.
            */
              <div
                key={step?.key}
                className={cn(
                  "animate-in fade-in duration-200",
                  slideFrom === "right"
                    ? "slide-in-from-right-6"
                    : "slide-in-from-left-6",
                  fill && "flex min-h-0 flex-1 flex-col",
                )}
              >
                {children}
              </div>
            )}
          </div>
        </section>
      </div>

      {/*
        The pinned footer. The submit button is portalled in here by the step's
        own form, so it keeps that step's `submitting` and label while sitting
        outside the subtree that slides.

        Back is absolute so the button stays centred on the column rather than
        on whatever space is left beside it. The two ending up in the same band
        is fine where the original objection was not: they are at opposite ends
        of the card, not adjacent.
      */}
      {/*
        `pb-6` is the whole of it: the button sat on the card's bottom edge with
        only the shell's own 8px inset under it, which reads as the control
        having fallen to the floor rather than as the end of the form. The row
        is pinned, so this is air the layout can always afford — the middle band
        is what gives way when the window is short.

        It takes its width and its axis from the wrapper, like the row above,
        so the button and the step track cannot drift apart.
      */}
      {/*
        With the chrome off the band is gone and only the slot node remains, so
        the phase's own portal target still exists and renders nothing. The
        caller draws its actions itself — the contract's preview floats them
        over the document rather than sitting them on a bar.
      */}
      <div
        className={cn(
          chrome
            ? "relative flex w-full shrink-0 items-center justify-center pt-2 pb-6"
            : "hidden",
        )}
      >
        {chrome && back && !finishing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute left-0"
            aria-label={back.label}
            onClick={back.go}
          >
            <ArrowLeft aria-hidden />
          </Button>
        ) : null}

        <div ref={onActionsSlot} className="contents" />

        {chrome && !finishing ? rightAction : null}
      </div>
    </div>
  );
}

/**
 * The step row.
 *
 * One horizontal line above the form rather than a column beside it: seven
 * steps stacked down the left took a quarter of the page to say something the
 * progress bar was already saying, and pushed the form into a narrow gutter.
 * Across the top it costs one line and the form gets the width.
 *
 * Real buttons in a real list, so it is keyboard-reachable and announced as
 * what it is. A step that needs a saved record is `disabled` before there is
 * one — the honest state, rather than a link that fails on arrival. The row
 * scrolls rather than wrapping on a narrow window, so a step is never on a
 * second line pretending to be the first.
 *
 * Three states, carried by the square alone rather than by a filled pill: ahead
 * is muted, current is `primary` tinted to a tenth, done is `primary` solid
 * with a tick in place of the number. Colour is never the only signal —
 * `aria-current="step"` marks the current one and a visually-hidden
 * "(complete)" marks the finished ones.
 *
 * This row is also the only place the step is named. There is no heading below
 * it repeating the label and a description under that.
 */
function StepNav<R>({
  steps,
  active,
  record,
  finishing,
  onSelect,
}: {
  steps: readonly FlowStep<R>[];
  active: number;
  record: R | null;
  finishing: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    // Edge to edge across the card. `justify-between` spreads the steps, so the
    // first and last mark the ends of the track and the spacing itself carries
    // how far along the flow is.
    //
    // Each step stays `shrink-0` and the list keeps `overflow-x-auto`, so a
    // narrow window scrolls rather than crushing the labels — and the scroll
    // container is the list itself, never a centred box that would put the
    // first step out of reach past its left edge.
    <nav aria-label="Steps" className="w-full min-w-0">
      <ol className="scrollbar-none -mx-1 flex items-center justify-between gap-3 overflow-x-auto px-1">
        {steps.map((step, index) => {
          const complete =
            finishing || (record ? step.isComplete(record) : false);
          const locked = step.needsRecord && !record;
          const current = !finishing && index === active;
          const delay = `${index * STAGGER_MS}ms`;
          return (
            <li key={step.key} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={locked || finishing}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  current && "font-medium text-primary/80",
                  !current && complete && "text-foreground",
                  !current && !complete && "text-muted-foreground",
                  !current && !locked && !finishing && "hover:text-foreground",
                  locked && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  // Staggered only while finishing, so the row reads left to
                  // right once instead of every square landing at once. During
                  // ordinary stepping there is no delay and the single tick
                  // that just turned pops on its own.
                  style={finishing ? { transitionDelay: delay } : undefined}
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-sm text-[11px] tabular-nums transition-colors",
                    complete && "bg-primary text-primary-foreground",
                    // Current is the accent held back rather than the accent
                    // dropped: same blue as done, at a tenth of the fill. The
                    // two states stay distinguishable — one is solid with a
                    // tick, the other a tinted block with its number.
                    !complete &&
                      current &&
                      "bg-primary/10 font-medium text-primary/80",
                    !complete && !current && "bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? (
                    // Mounted fresh the moment the step turns complete, which
                    // is what makes the pop play exactly once, on the square
                    // that earned it, with no state tracking which.
                    <Check
                      className="animate-in zoom-in-50 fill-mode-backwards size-3.5 duration-200"
                      style={finishing ? { animationDelay: delay } : undefined}
                      aria-hidden
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                {step.short}
                {complete ? <span className="sr-only">(complete)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The last screen of a flow, held for a beat while the row ticks through.
 *
 * It exists because onboarding had no ending. Seven forms, and the seventh save
 * swapped the page for a table with no acknowledgement that anything had been
 * completed — the only genuinely rewarding moment in the task, and it was the
 * one moment given nothing.
 *
 * It says what was achieved rather than congratulating anybody, which is why
 * the line is the caller's: what the record is now *for* is the payoff, and
 * only the caller knows it. `role="status"` because a screen reader gets no
 * ticking row.
 */
export function FinishPanel({
  heading,
  children,
}: {
  heading: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-3 py-16 text-center duration-200"
    >
      <span className="animate-in zoom-in-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground duration-200">
        <Check className="size-6" aria-hidden />
      </span>
      <p className="text-base font-medium">{heading}</p>
      {children ? (
        <p className="max-w-sm text-sm text-muted-foreground">{children}</p>
      ) : null}
    </div>
  );
}

/**
 * The footer slot as state rather than a ref.
 *
 * A ref set during commit does not re-render, and the step below needs to hear
 * about the node in order to render into it. Every flow needs this same pair,
 * so it ships with the shell rather than being re-derived per caller.
 */
export function useActionsSlot() {
  return useState<HTMLElement | null>(null);
}
