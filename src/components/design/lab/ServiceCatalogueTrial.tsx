"use client";

import { Filter, ArrowUpDown, Plus, Search, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SCHEDULES } from "@/lib/domain/contract/schedules";
import type { ContractService } from "@/lib/domain/service";
import { formatINR } from "@/lib/domain/money";

/**
 * A trial, not a screen (16 October 2026): the service catalogue redrawn in
 * the quiet, monochrome style being considered for the whole app. It lives
 * under `design/lab/` and renders only at `/preview/services-trial`.
 *
 * What it tries, against the shipped board:
 * - a centred 980px column with 48px between sections instead of four
 *   edge-to-edge kanban columns
 * - hairlines at half strength, title at 500
 * - a near-black primary instead of the blue one
 * - one card shape: icon, name, two lines of description, a quiet footer
 *
 * The controls are static. If this lands, the board is rewritten; if not,
 * this file is deleted. It is never imported by the product.
 */
export function ServiceCatalogueTrial({ services }: { services: ContractService[] }) {
  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-9 pt-12 pb-16">
      <div className="flex flex-col gap-9">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-display font-medium">Services</h1>
            <p className="text-lead font-normal text-muted-foreground">Everything the studio sells, by Schedule</p>
          </div>
          <div className="flex items-center gap-3">
            <Button>Import</Button>
            <Button className="bg-foreground text-background hover:bg-foreground/90">
              <Plus aria-hidden />
              Add service
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search" className="h-7 border-border/50 pl-8" />
            </div>
            <Button size="sm" className="border-border/50 text-muted-foreground">
              <Filter aria-hidden />
              Filter
            </Button>
            <Button size="sm" className="border-border/50 text-muted-foreground">
              <ArrowUpDown aria-hidden />
              Sort
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        {SCHEDULES.map((schedule) => {
          const mine = services.filter((s) => s.scheduleKey === schedule.key);
          return (
            <section key={schedule.key} aria-label={schedule.name} className="flex flex-col gap-4">
              <h2 className="text-lead font-normal text-muted-foreground">{schedule.name}</h2>
              <ul className="grid grid-cols-3 gap-8">
                {mine.map((service) => (
                  <li
                    key={service.code}
                    className="flex flex-col justify-between gap-4 rounded-lg border border-border/50 bg-background p-3"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Box aria-hidden className="size-3.5 text-muted-foreground" />
                          <span className="text-lead">{service.name}</span>
                        </div>
                        <Button
                          size="sm"
                          icon
                          aria-label={`Add ${service.name} to a contract`}
                          className="size-6 border-border/50 text-muted-foreground"
                        >
                          <Plus aria-hidden />
                        </Button>
                      </div>
                      <p className="line-clamp-2 text-body text-muted-foreground">
                        {service.overview[0] ?? `${service.items?.length ?? 0} items under the ${schedule.name} Schedule.`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-meta text-muted-foreground tabular-nums">
                      <span>
                        {service.code}
                        {service.sacCode ? ` · SAC ${service.sacCode}` : ""}
                      </span>
                      <span className="text-foreground">
                        {service.ratePaise === undefined
                          ? "Quoted"
                          : service.scheduleKey === "retainer"
                            ? `${formatINR(service.ratePaise)} / mo`
                            : formatINR(service.ratePaise)}
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
