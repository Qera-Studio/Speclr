'use client';

import { Suspense } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import AdminShell from '@/components/shell/AdminShell';
import LeadsPage from '@/components/admin/leads/LeadsPage';
import { SERVICES } from '@/lib/domain/seed/services';
import type { Lead } from '@/lib/domain/lead';

/**
 * `/preview/leads`: the leads page with no session and no database, so it can
 * be looked at before the `leads` migration has run. `?empty` shows the first
 * screen a new user meets. Does not exist in production; the people are invented.
 */
const base = { email: '', phone: '', source: '' as const, serviceCodes: [] as string[], notes: '' };
const LEADS: Lead[] = [
  { ...base, id: 'a', name: 'Asha Rao', company: 'Clayora', stage: 'new', source: 'Referral', serviceCodes: ['WEB', 'BRND'], createdAt: '2026-10-16' },
  { ...base, id: 'b', name: 'Kabir Sethi', company: 'Northwind Foods', stage: 'new', source: 'Instagram', serviceCodes: ['SOC'], createdAt: '2026-10-15' },
  { ...base, id: 'c', name: 'Meera Iyer', company: '', stage: 'reached_out', source: 'Website', serviceCodes: ['DSGN'], createdAt: '2026-10-12' },
  { ...base, id: 'd', name: 'Dev Mehta', company: 'Halo Labs', stage: 'quote_sent', source: 'LinkedIn', serviceCodes: ['APP', 'AI'], createdAt: '2026-10-08' },
  { ...base, id: 'e', name: 'Riya Kapoor', company: 'Studio Fern', stage: 'contract_sent', source: 'Referral', serviceCodes: ['WEB'], createdAt: '2026-09-30' },
  { ...base, id: 'f', name: 'Arjun Nair', company: 'Petal & Co', stage: 'lost', source: 'Outreach', serviceCodes: ['SEO'], createdAt: '2026-09-21' },
];

function Fixture() {
  const empty = useSearchParams().has('empty');
  return (
    <LeadsPage
      leads={empty ? [] : LEADS}
      services={SERVICES.map(({ code, name }) => ({ code, name }))}
    />
  );
}

export default function LeadsPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }}>
      {/* `useSearchParams` needs a Suspense boundary to build. */}
      <Suspense>
        <Fixture />
      </Suspense>
    </AdminShell>
  );
}
