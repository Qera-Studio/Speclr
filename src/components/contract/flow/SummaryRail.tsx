'use client';

import { cn } from '@/lib/utils';
import type { SummaryGroup } from './summary';

/**
 * The running record of what the contract has decided, down the left of the
 * builder.
 *
 * It exists because the five phases each show their own work and then hide it:
 * by the terms phase nothing on screen says who the contract is for or how
 * long it runs, and those are the facts every later decision is made against.
 *
 * **Read-only, and deliberately not a navigation.** The step row above is
 * already the way between phases, and a second set of targets pointing at the
 * same five places is two answers to one question. A group here marks where the
 * reader is; it does not offer to take them somewhere.
 *
 * **It reports only what is settled.** There are no placeholder rows: a phase
 * with nothing decided contributes no group at all (`summary.ts`), so on the
 * first phase the rail holds one heading and the engagement's two facts. A
 * column of "None yet" is a list of things the step row already marks as
 * outstanding, printed a second time in the one place meant to be reliable.
 *
 * Everything it prints is derived per render, so it cannot disagree with the
 * draft.
 */
export default function SummaryRail({
  groups,
  activePhase,
}: {
  groups: SummaryGroup[];
  activePhase: string;
}) {
  return (
    /*
      `aria-label` rather than a visible heading: the rail is a summary of the
      page it sits beside, and a "Summary" title above the groups is a word
      spent saying what the content already says.

      **No border.** The rail and the form are one surface with the form's own
      fill marking it out, so a rule between them drew a seam through a card
      that is meant to read as continuous.

      `justify-center` on the column: the rail is short for most of the flow and
      hanging two lines from the top of a tall band left it stranded against the
      step row. Centred, it sits with the fields it summarises. `my-auto` would
      not do it here, because this box is the flex *item* and the centring has
      to happen inside it.

      Its own scroll box with `overscroll-contain`, so a long services list
      scrolls here rather than chaining out to the flow beside it.
    */
    <aside
      aria-label="What the contract says so far"
      className="scrollbar-none hidden h-full w-56 shrink-0 flex-col justify-center overflow-y-auto overscroll-contain px-5 py-6 lg:flex"
    >
      <dl className="flex flex-col gap-5">
        {groups.map((group) => {
          const current = group.phase === activePhase;
          return (
            <div key={group.phase} className="flex flex-col gap-1.5">
              {/*
                The group heading carries the "you are here" mark, not a
                background fill: the rail sits against the card's own surface
                and a tinted block per group would read as four cards.

                **Deliberately carries no current-step attribute.** The step
                row in `FlowShell` owns that, and a page marking two elements
                as the current step tells a screen reader there are two. The
                tint is an orienting cue beside a control that is already
                announced, not a second announcement of it. Caught by
                `contract-flow.spec.ts`, which went red on exactly that, and
                the reason `design-system.test.ts` polices the attribute
                itself: writing it here at all is the thing being prevented.
              */}
              <p
                className={cn(
                  'text-xs font-medium',
                  current ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {group.title}
              </p>
              {group.lines.map((line, index) => (
                <div key={`${line.label}-${index}`} className="flex flex-col">
                  <dt className="sr-only">{line.label}</dt>
                  {/* One weight for every value, because every value here is
                      the same kind of thing: a decision that has been made.
                      Nothing is italic anywhere in this app. */}
                  <dd className="text-sm leading-snug text-foreground">{line.value}</dd>
                </div>
              ))}
            </div>
          );
        })}
      </dl>
    </aside>
  );
}
