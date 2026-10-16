'use client';

import { Suspense } from 'react';
import { notFound, useSearchParams } from 'next/navigation';
import AdminShell from '@/components/shell/AdminShell';
import ServicePage from '@/components/admin/services/ServicePage';
import { SERVICES } from '@/lib/domain/seed/services';
import { PARTS } from '@/lib/domain/seed/parts';
import { CLIENT_INPUTS, EXCLUSIONS } from '@/lib/domain/contract/seed/libraries';
import { servicePageData, type ContractService } from '@/lib/domain/service';

/**
 * `/preview/service?code=<code>`: the service page with no session and no
 * database, on the seed. Dev only, like its siblings.
 *
 * Worth opening at: `WEB` (six groups, one set of terms), `SOC` (three sets of
 * terms), `DSGN` (terms shared with `APP`), `06` (a terms page), and `NEW` (a
 * service just added, with nothing on it).
 */
const NEW: ContractService = {
  ...SERVICES.find((s) => s.code === 'STR')!,
  code: 'NEW',
  name: 'Newsletter design',
  blurb: undefined,
  items: [],
  partCodes: [],
};

// A few prices filled in, since the seed quotes most of the catalogue.
const ALL = [...SERVICES, ...PARTS, NEW].map((s) =>
  s.code === 'WEB' ? { ...s, ratePaise: 1_20_000_00 } : s,
);

function Body() {
  const data = servicePageData(useSearchParams().get('code') ?? 'WEB', ALL);
  if (!data) return <p className="p-8 text-body">No such service in the seed.</p>;
  return <ServicePage {...data} exclusions={EXCLUSIONS} clientInputs={CLIENT_INPUTS} />;
}

export default function ServicePreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }}>
      <Suspense>
        <Body />
      </Suspense>
    </AdminShell>
  );
}
