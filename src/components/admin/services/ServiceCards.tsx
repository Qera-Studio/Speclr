"use client";

import { useRef, useState } from "react";
import { Package } from "lucide-react";
import { AddButton } from "@/components/ui/add-button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SCHEDULES, type ScheduleKey } from "@/lib/domain/contract/schedules";
import type { ContractService } from "@/lib/domain/contract/service";

const Heading = () => (
  <h1 className="shrink-0 text-2xl font-semibold">Services</h1>
);

/**
 * The services library: every Service at once, in one row.
 *
 * A reference, not a chooser — assembling a contract happens on the contract's
 * own screen, where a card carries its description and its counts. Here the
 * question is only "what does the studio sell", so a card is its number and its
 * name, and twenty-two of them fit a single line that scrolls.
 *
 * **One row, not four panels.** The Schedules are still the grouping that
 * matters — a Service belongs to exactly one, and which one decides how the
 * work is paid for, approved and owned — but as dividers along the row rather
 * than tabs that hide three-quarters of it. Setup has four Services; the row
 * would otherwise end in empty space with Build behind a click. The tabs stay
 * as the way *to* a group, and follow the row when it is scrolled by hand,
 * because a pill pointing at a group that scrolled off is worse than no pill.
 *
 * Order is `SCHEDULES` — the order an engagement runs in, which is also the
 * order the Schedules print in and the order the codes are numbered in.
 */
export default function ServiceCards({
  services,
}: {
  services: ContractService[];
}) {
  const [active, setActive] = useState<ScheduleKey>(SCHEDULES[0].key);
  const rowRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Partial<Record<ScheduleKey, HTMLElement | null>>>(
    {},
  );

  /**
   * Set while a click's own smooth scroll is still running.
   *
   * The tabs and the scroll-spy write the same piece of state, so without this
   * they fight: clicking Audit from Setup set the pill to Audit, then the
   * scroll swept past Build and Retainer and the spy dragged it backwards
   * through both before it arrived. Four 500ms glides, three of them wrong.
   */
  const settling = useRef<number | null>(null);

  /** The row is `relative`, so a group's `offsetLeft` is its scroll position. */
  const jumpTo = (key: ScheduleKey) => {
    setActive(key);
    const group = groupRefs.current[key];
    if (!group) return;

    // A timer rather than `scrollend`, which Safari only shipped recently and
    // this has to hold in every browser the studio prints from. It is a
    // ceiling, not a duration: the spy is only deaf until the scroll lands.
    if (settling.current !== null) window.clearTimeout(settling.current);
    settling.current = window.setTimeout(() => {
      settling.current = null;
    }, 700);

    rowRef.current?.scrollTo({ left: group.offsetLeft, behavior: "smooth" });
  };

  // The last group whose start has passed the left edge is the one being read.
  const onScroll = () => {
    if (settling.current !== null) return;
    const row = rowRef.current;
    if (!row) return;
    let reached = SCHEDULES[0].key;
    for (const schedule of SCHEDULES) {
      const group = groupRefs.current[schedule.key];
      if (group && group.offsetLeft <= row.scrollLeft + 8) reached = schedule.key;
    }
    if (reached !== active) setActive(reached);
  };

  if (services.length === 0) {
    return (
      <>
        <Heading />
        <Empty className="mt-4 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Package />
            </EmptyMedia>
            <EmptyTitle>No services yet</EmptyTitle>
            <EmptyDescription>
              Run the contract seed to load the services library.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <Heading />

        <Tabs value={active} onValueChange={(value) => jumpTo(value as ScheduleKey)}>
          <TabsList className="w-[350px]">
            <TabsIndicator />
            {SCHEDULES.map((schedule) => (
              <TabsTrigger
                key={schedule.key}
                value={schedule.key}
                className="text-sm data-active:bg-transparent dark:data-active:border-transparent dark:data-active:bg-transparent"
              >
                {schedule.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Authoring a Service is the next change; the affordance goes where it
            will live rather than appearing from nowhere later. A disabled button
            fires no pointer events, so the tooltip hangs off a wrapping span. */}
        <Tooltip>
          <TooltipTrigger render={<span className="inline-flex justify-self-end" />}>
            <AddButton variant="outline" disabled className="cursor-not-allowed">
              Add service
            </AddButton>
          </TooltipTrigger>
          <TooltipContent>Adding a service is coming next</TooltipContent>
        </Tooltip>
      </div>

      <div
        ref={rowRef}
        onScroll={onScroll}
        className="relative flex gap-3 overflow-x-auto overscroll-x-contain pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SCHEDULES.map((schedule, index) => {
          const mine = services.filter((s) => s.scheduleKey === schedule.key);
          if (mine.length === 0) return null;

          return (
            <section
              key={schedule.key}
              ref={(node) => {
                groupRefs.current[schedule.key] = node;
              }}
              aria-label={schedule.name}
              className="flex shrink-0 gap-3"
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  // No margin of its own: the row's `gap-3` sits on its left and
                  // the section's `gap-3` on its right, so the rule lands
                  // centred between the two groups. `mr-3` doubled the right
                  // side and pushed it against the card before it.
                  className="self-stretch border-l border-dashed border-border"
                />
              ) : null}
              <ul className="flex gap-3">
                {mine.map((service) => (
                  <li key={service.code}>
                    <div className="flex size-40 flex-col justify-between rounded-xl border border-border bg-card p-4">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {service.code}
                      </span>
                      <span className="line-clamp-4 text-sm font-medium">
                        {service.name}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
