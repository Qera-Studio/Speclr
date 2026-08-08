'use client';

import { Check, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsPanels } from '@/components/ui/tabs';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import ScheduleTabList from '@/components/contract/ScheduleTabList';
import { SCHEDULES } from '@/lib/domain/contract/schedules';
import type { ContractService } from '@/lib/domain/contract/service';

interface ServicePickerProps {
  services: ContractService[];
  query: string;
  onQueryChange: (query: string) => void;
  /** Codes already on the contract — those rows open for editing instead. */
  added: Set<string>;
  onPick: (service: ContractService) => void;
}

/**
 * The library, one Schedule at a time.
 *
 * A row is a button rather than a checkbox because picking a Service is not the
 * end of the decision — it opens the Service's own form, and nothing joins the
 * contract until that form is submitted. A row already on the contract reopens
 * what was filled in.
 */
export default function ServicePicker({
  services,
  query,
  onQueryChange,
  added,
  onPick,
}: ServicePickerProps) {
  const needle = query.trim().toLowerCase();
  const filtered = services.filter((s) =>
    `${s.code} ${s.name}`.toLowerCase().includes(needle),
  );

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="con-service-search">Search services</FieldLabel>
        <Input
          id="con-service-search"
          size="form"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Shopify, brand, maintenance…"
        />
      </Field>

      <Tabs defaultValue={SCHEDULES[0].key}>
        <ScheduleTabList />

        {/*
          A fixed height, because the panels overlap for the length of the
          slide: without one the rail would grow to Build's ten rows
          mid-transition and shrink again on Setup's four.
        */}
        <TabsPanels className="h-56 overflow-y-auto">
          {SCHEDULES.map((schedule) => {
            const mine = filtered.filter((s) => s.scheduleKey === schedule.key);
            return (
              <TabsContent key={schedule.key} value={schedule.key}>
                <ul className="flex flex-col gap-0.5">
                  {mine.map((service) => (
                    <li key={service.code}>
                      <button
                        type="button"
                        onClick={() => onPick(service)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="text-muted-foreground tabular-nums">
                            {service.code}
                          </span>{' '}
                          {service.name}
                        </span>
                        {added.has(service.code) ? (
                          <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="sr-only">
                          {added.has(service.code) ? 'Edit this Part' : 'Add to contract'}
                        </span>
                      </button>
                    </li>
                  ))}
                  {mine.length === 0 ? (
                    <li className="px-2 py-1.5 text-sm text-muted-foreground">
                      No matching services.
                    </li>
                  ) : null}
                </ul>
              </TabsContent>
            );
          })}
        </TabsPanels>
      </Tabs>
    </div>
  );
}
