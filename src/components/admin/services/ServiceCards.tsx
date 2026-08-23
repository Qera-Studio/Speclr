"use client";

import { useState } from "react";
import { Package, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SCHEDULES, type ScheduleKey } from "@/lib/domain/contract/schedules";
import {
  rateUnitOf,
  type ContractService,
} from "@/lib/domain/contract/service";
import { formatINR } from "@/lib/domain/money";
import { NIL } from "@/lib/utils";
import { PageHeader } from "@/components/admin/Page";
import ServiceEditDialog from "@/components/admin/services/ServiceEditDialog";

const Heading = () => <PageHeader title="Services" />;

/**
 * The services library: one column per Schedule, every Service visible at once.
 *
 * A reference, not a chooser — assembling a contract happens on the contract's
 * own screen, where a card carries its description and its counts. Here the
 * question is only "what does the studio sell", so a card is its number, its
 * list price, its name, one line of what it is, and its classification.
 *
 * **Four columns, not one scrolling row.** The Schedules are the grouping that
 * matters — a Service belongs to exactly one, and which one decides how the
 * work is paid for, approved and owned — and a board says that in the layout
 * instead of in a tab strip and a set of dividers. It also removes the row's
 * horizontal scroll, which put two-thirds of the catalogue off-screen and took
 * a scroll-spy, a settle timer and a mask to make legible.
 *
 * Column order is `SCHEDULES` — the order an engagement runs in, which is also
 * the order the Schedules print in and the order the codes are numbered in.
 */
export default function ServiceCards({
  services,
}: {
  services: ContractService[];
}) {
  /**
   * The Service whose dialog is open, or null.
   *
   * The whole record rather than its code, so the dialog is keyed on it and
   * mounts fresh each time. Keeping a code here would mean re-finding the row
   * on every render for the one moment it is needed.
   */
  const [editing, setEditing] = useState<ContractService | null>(null);
  /** The column whose add card was clicked, or null. */
  const [adding, setAdding] = useState<ScheduleKey | null>(null);

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
    <div className="flex h-full min-h-0 flex-col gap-5">
      <Heading />

      {/* Full height only where all four columns are side by side. Stacked, a
          column with its own scrollbar would be a scroll trap inside a page
          that is already scrolling. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-4">
        {SCHEDULES.map((schedule) => {
          const mine = services.filter((s) => s.scheduleKey === schedule.key);

          return (
            <section
              key={schedule.key}
              aria-label={schedule.name}
              className="flex min-h-0 flex-col rounded-md border border-border bg-muted/40"
            >
              {/* Add sits in the column header rather than at the foot of the
                  list: the column *is* the answer to "which Schedule", and up
                  here it is in the same place in every column instead of
                  wherever that column's cards happen to end. */}
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <h2 className="text-sm font-medium">{schedule.name}</h2>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Add to ${schedule.name}`}
                    onClick={() => setAdding(schedule.key)}
                    className="size-7 text-muted-foreground"
                  >
                    <Plus />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {mine.length}
                  </span>
                </div>
              </div>

              {/* The scroll lives here, not on the page: the Build column holds
                  most of the catalogue, and one long Schedule should not push
                  the other three off the bottom. The heading stays put outside
                  it, and so does the add button it carries. */}
              {/* `pb-2` so the last card ends clear of the column's bottom
                  edge rather than flush against it, which is what the add
                  button used to provide. */}
              <ul className="scrollbar-none flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                {mine.map((service) => (
                  <li key={service.code}>
                    {/* `bg-background`, not `bg-card`: in dark mode `--card`
                        (0.205) sits within a hair of the column's `bg-muted/40`
                        and the cards dissolve into it. The page background
                        reads as a well the cards sit in. In light mode the two
                        tokens are both white, so nothing changes there. */}
                    <div className="group/card flex flex-col gap-3 rounded-md border border-border bg-background p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">{service.code}</span>
                        {/*
                          Revealed on hover, and equally on focus — `opacity-0`
                          keeps a button in the tab order, so the keyboard reaches
                          it in card order and `group-focus-within` is what makes
                          it visible when it does. A control that only exists
                          under a pointer is a control half the people using this
                          cannot find.
                        */}
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`Edit ${service.name}`}
                          onClick={() => setEditing(service)}
                          className="-my-1 ml-auto size-7 opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 focus-visible:opacity-100"
                        >
                          <Pencil />
                        </Button>
                      </div>

                      {/* <Separator /> */}

                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {service.name}
                        </span>
                        {/* One line, clipped. The full overview is contract
                            source material and belongs to the dialog; here it
                            is only enough to tell two similar names apart. */}
                        {service.overview[0] ? (
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {service.overview[0]}
                          </span>
                        ) : null}
                      </div>

                      <Separator />

                      {/* SAC left, price right: the classification and what it
                          costs, which is the pair a quote is read off. A
                          Retainer carries its unit, because the same number
                          means something different by the month, and a Service
                          with no list price is quoted per engagement. */}
                      <div className="flex items-baseline gap-2 text-xs tabular-nums text-muted-foreground">
                        <span>
                          {service.sacCode ? `SAC ${service.sacCode}` : NIL}
                        </span>
                        <span className="ml-auto">
                          {service.ratePaise === undefined
                            ? "Quoted"
                            : service.scheduleKey === "retainer"
                              ? `${formatINR(service.ratePaise)} / mo`
                              : formatINR(service.ratePaise)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {editing ? (
        <ServiceEditDialog
          key={editing.code}
          service={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {adding ? (
        <ServiceEditDialog
          key={`add-${adding}`}
          scheduleKey={adding}
          onClose={() => setAdding(null)}
        />
      ) : null}
    </div>
  );
}
