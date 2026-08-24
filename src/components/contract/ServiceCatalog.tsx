'use client';

import { Check, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SCHEDULES } from '@/lib/domain/contract/schedules';
import type { ContractService } from '@/lib/domain/service';

interface ServiceCatalogProps {
  services: ContractService[];
  query: string;
  onQueryChange: (query: string) => void;
  /** Codes already on the contract — those cards open for editing instead. */
  added: Set<string>;
  onPick: (service: ContractService) => void;
}

/**
 * The library, filling the card, while a contract is being assembled.
 *
 * This used to be a tabbed list in the 384px rail, which asked the one screen
 * with the least room to carry the one decision with the most options. Here the
 * Schedules are headings rather than tabs: they are how a Service is paid for,
 * approved and owned, so seeing Setup end and Build begin is the information —
 * and with the whole card to spend there is no reason to hide three of the four.
 *
 * A card is a button, not a checkbox, because picking is not the end of the
 * decision: it opens the Service's own form, and nothing joins the contract
 * until that form is complete and submitted. The footer looks like a button and
 * fills in on hover of the *card*, which is what is actually clickable — a real
 * button nested inside a button is invalid markup and a second focus stop for
 * one action.
 */
export default function ServiceCatalog({
  services,
  query,
  onQueryChange,
  added,
  onPick,
}: ServiceCatalogProps) {
  const needle = query.trim().toLowerCase();
  const filtered = services.filter((s) => `${s.code} ${s.name}`.toLowerCase().includes(needle));

  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="con-service-search"
          aria-label="Search services"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search services — Shopify, brand, maintenance…"
          className="h-12 rounded-xl pl-11 text-base md:text-base"
        />
      </div>

      {SCHEDULES.map((schedule) => {
        const mine = filtered.filter((s) => s.scheduleKey === schedule.key);
        if (mine.length === 0) return null;

        return (
          <section key={schedule.key} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <h3 className="shrink-0 text-sm font-semibold">{schedule.name}</h3>
              <span className="text-xs text-muted-foreground tabular-nums">{mine.length}</span>
              <span className="h-px min-w-0 flex-1 bg-border" />
            </div>

            {/* `auto-rows-fr` levels every card in the section, not just its row. */}
            <ul className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mine.map((service) => {
                const chosen = added.has(service.code);
                return (
                  <li key={service.code}>
                    <button
                      type="button"
                      onClick={() => onPick(service)}
                      className="group h-full w-full text-left focus-visible:outline-none"
                    >
                      <Card className="h-full transition-colors group-hover:border-ring/60 group-focus-visible:border-ring">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm">{service.name}</CardTitle>
                            <Badge variant="outline" className="shrink-0 tabular-nums">
                              {service.code}
                            </Badge>
                          </div>
                          <CardDescription className="line-clamp-3">
                            {service.overview[0]}
                          </CardDescription>
                        </CardHeader>

                        <div className="mt-auto px-(--card-spacing)">
                          <span className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-focus-visible:bg-primary group-focus-visible:text-primary-foreground">
                            {chosen ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                            {chosen ? 'Edit this Part' : 'Add to contract'}
                          </span>
                        </div>
                      </Card>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No matching services.</p>
      ) : null}
    </div>
  );
}
