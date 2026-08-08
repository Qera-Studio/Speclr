"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import ScheduleTabList from "@/components/contract/ScheduleTabList";
import { Package } from "lucide-react";
import { SCHEDULE_TABS } from "@/lib/domain/contract/schedules";
import type { ContractService } from "@/lib/domain/contract/service";

const Heading = () => (
  <h2 className="shrink-0 text-lg font-semibold">Services</h2>
);

/**
 * One row of cards, and no more.
 *
 * The section sits at the foot of the page, so its height has to be a number
 * rather than whatever the tab happens to hold — otherwise Setup's four cards
 * and Build's ten push the heading to a different place on every tab. The row
 * is fixed, the grid's rows are fixed to match, and anything past the first
 * scrolls inside an otherwise invisible container.
 */
const ROW = { "--service-row": "11rem" } as React.CSSProperties;

/**
 * The services library, as cards grouped by Schedule.
 *
 * One tab per Schedule, because the grouping *is* the information: a Service
 * belongs to exactly one Schedule, and which one decides how the work is paid
 * for, approved and owned. Twenty-two cards at once say none of that; a tab at
 * a time says all of it — so the tabs share the heading's row and take the
 * width, rather than sitting under it as a control.
 *
 * Tab order is `SCHEDULE_TABS` — the order an engagement runs in, not the
 * order the Schedules print in.
 *
 * Read-only. Editing a Service is not in this milestone: the twenty-two are
 * seeded from the specs and there is nothing yet to correct.
 */
export default function ServiceCards({
  services,
}: {
  services: ContractService[];
}) {
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
    // Clipped horizontally so a panel sliding in cannot widen the page.
    <Tabs defaultValue={SCHEDULE_TABS[0].key} className="gap-5 overflow-x-clip">
      <div className="flex items-center gap-96">
        <Heading />
        <ScheduleTabList className="flex-1" />
      </div>

      {SCHEDULE_TABS.map((schedule) => {
        const mine = services.filter((s) => s.scheduleKey === schedule.key);

        return (
          <TabsContent key={schedule.key} value={schedule.key}>
            <div
              style={ROW}
              className="h-(--service-row) overflow-x-hidden overflow-y-auto"
            >
              <ul className="grid grid-cols-1 gap-3 [grid-auto-rows:var(--service-row)] sm:grid-cols-2 xl:grid-cols-3">
                {mine.map((service) => (
                  <li key={service.code}>
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm">
                            {service.name}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className="shrink-0 tabular-nums"
                          >
                            {service.code}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-3">
                          {service.overview[0]}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-3 gap-2 text-xs">
                          {[
                            ["Included", service.included.length],
                            ["Excluded", service.exclusionIds.length],
                            ["Client inputs", service.clientInputIds.length],
                          ].map(([label, count]) => (
                            <div key={label}>
                              <dt className="text-muted-foreground">{label}</dt>
                              <dd className="font-medium tabular-nums">
                                {count}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
