'use client';

import { Suspense } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import AdminShell from '@/components/shell/AdminShell';
import LeadEditor from '@/components/admin/leads/LeadEditor';
import { SERVICES } from '@/lib/domain/seed/services';
import type { Lead } from '@/lib/domain/lead';

/**
 * `/preview/lead`: the add-lead page; `?edit` shows an existing one. No
 * session, no database, nothing saves. Does not exist in production.
 */
const DEV: Lead = {
  id: 'd',
  name: 'Dev Mehta',
  company: 'Halo Labs',
  email: 'dev@halolabs.io',
  phone: '',
  source: 'LinkedIn',
  stage: 'quote_sent',
  serviceCodes: ['APP', 'AI'],
  notes: 'Wants a pilot before the full build.',
  createdAt: '2026-10-08',
};

function Fixture() {
  const edit = useSearchParams().has('edit');
  return (
    <LeadEditor lead={edit ? DEV : undefined} services={SERVICES.map(({ code, name }) => ({ code, name }))} />
  );
}

export default function LeadPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }}>
      <Suspense>
        <Fixture />
      </Suspense>
    </AdminShell>
  );
}
