'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty';
import { DateValue } from '@/components/patterns/Page';
import { INK } from '@/components/admin/services/quiet';
import { LEAD_STAGES, type Lead } from '@/lib/domain/lead';
import { cn } from '@/lib/utils';

/**
 * Leads: people who might become clients, grouped by where they are in the
 * pipeline. The service page's frame and language (16 October 2026): a
 * centred column, quiet groups, one ink action. Each lead opens as its own
 * page (`LeadEditor`), and so does adding one.
 */
export default function LeadsPage({
  leads,
  services,
}: {
  leads: Lead[];
  services: { code: string; name: string }[];
}) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = q
      ? leads.filter((l) => [l.name, l.company, l.email].some((v) => v.toLowerCase().includes(q)))
      : leads;
    return LEAD_STAGES.map((stage) => ({
      ...stage,
      leads: shown.filter((l) => l.stage === stage.key),
    })).filter((g) => g.leads.length > 0);
  }, [leads, query]);

  const nameOf = (code: string) => services.find((s) => s.code === code)?.name ?? code;

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-12 pt-12 pb-16">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h1 className="text-display font-medium">Leads</h1>
          <p className="text-body text-muted-foreground">
            People who might become clients, and where each conversation stands.
          </p>
        </div>
        <Link href="/client/leads/new" className={cn(buttonVariants({ variant: 'primary' }), INK)}>
          <Plus aria-hidden />
          Add lead
        </Link>
      </header>

      <section aria-labelledby="leads-heading" className="flex flex-col gap-4">
        <div className="flex h-7 items-center gap-2">
          <h2 id="leads-heading" className="text-lead font-normal text-muted-foreground">
            Pipeline
          </h2>
          <Badge variant="secondary" className="font-normal text-muted-foreground tabular-nums">
            {leads.length}
          </Badge>
          {leads.length > 0 ? (
            <div className="relative ml-auto w-56">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-tab-label"
              />
              <Input
                type="search"
                aria-label="Search leads"
                placeholder="Search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-7 border-border/50 pl-8 hover:border-tab-label/50"
              />
            </div>
          ) : null}
        </div>

        {leads.length === 0 ? (
          <EmptyState
            preset="none-yet"
            noun="lead"
            description="Add someone the moment they get in touch, then move them along as the conversation goes."
            action={
              <Link
                href="/client/leads/new"
                className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), INK)}
              >
                Add your first lead
              </Link>
            }
          />
        ) : groups.length === 0 ? (
          <p className="text-body text-tab-label">No leads match “{query.trim()}”.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                <h3 className="px-1 text-meta text-tab-label">{group.label}</h3>
                <ul className="divide-y divide-border/50 rounded-lg border border-border/50">
                  {group.leads.map((lead) => (
                    <li
                      key={lead.id}
                      className="relative flex min-h-10 items-center gap-4 px-4 py-2 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        {/* The link's overlay makes the whole row the target. */}
                        <Link
                          href={`/client/leads/${lead.id}`}
                          className="truncate rounded-sm text-body focus-ring after:absolute after:inset-0"
                        >
                          {lead.name}
                        </Link>
                        {lead.company ? (
                          <span className="truncate text-meta text-tab-label">{lead.company}</span>
                        ) : null}
                      </div>
                      <span className="max-w-64 truncate text-meta text-muted-foreground">
                        {lead.serviceCodes.map(nameOf).join(', ')}
                      </span>
                      {lead.source ? <span className="text-meta text-tab-label">{lead.source}</span> : null}
                      <span className="text-meta text-tab-label tabular-nums">
                        <DateValue value={lead.createdAt} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
