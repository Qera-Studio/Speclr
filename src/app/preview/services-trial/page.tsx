'use client';

import { notFound } from 'next/navigation';
import AdminShell from '@/components/shell/AdminShell';
import { ServiceCatalogueTrial } from '@/components/design/lab/ServiceCatalogueTrial';
import { SERVICES } from '@/lib/domain/seed/services';

/**
 * `/preview/services-trial`: the catalogue redrawn in the quiet style being
 * tried (see `design/lab/ServiceCatalogueTrial.tsx`). Same seed as
 * `/preview/services`, inside the real shell so the inset frame is judged
 * with it. Dev only, like its siblings.
 */
const PRICED = SERVICES.map((service, i) =>
  i === 0
    ? { ...service, ratePaise: 1_20_000_00, overview: ['A full website build, from structure and copy through to launch.'] }
    : i === 1
      ? { ...service, ratePaise: 45_000_00 }
      : service,
);

export default function ServicesTrialPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }}>
      <ServiceCatalogueTrial services={PRICED} />
    </AdminShell>
  );
}
