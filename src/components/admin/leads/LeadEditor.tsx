'use client';

import { useRouter } from 'next/navigation';
import type { Lead } from '@/lib/domain/lead';
import LeadForm from './LeadForm';

/**
 * One lead on its own page, added or edited. A page rather than a side panel
 * (17 October 2026): a lead is a record somebody opens, links to and comes
 * back to, not a row tweaked in passing. The service page's frame, narrowed
 * to a form's width.
 */
export default function LeadEditor({
  lead,
  services,
}: {
  /** Absent means a new lead. */
  lead?: Lead;
  services: { code: string; name: string }[];
}) {
  const router = useRouter();
  const back = () => router.push('/client/leads');

  return (
    <div className="mx-auto flex w-full max-w-[768px] flex-col gap-8 pt-12 pb-16">
      {/* No back arrow of its own: the shell draws one above every page. */}
      <h1 className="text-display font-medium">{lead ? lead.name : 'Add lead'}</h1>
      <LeadForm lead={lead} services={services} onDone={back} />
    </div>
  );
}
