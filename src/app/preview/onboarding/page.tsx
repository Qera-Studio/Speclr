'use client';

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import AdminShell from '@/components/shell/AdminShell';
import ClientOnboarding from '@/components/admin/clients/onboarding/ClientOnboarding';
import { SERVICES } from '@/lib/domain/seed/services';

/**
 * `/preview/onboarding?kind=company&country=IN`: the whole onboarding flow,
 * step row included, with no session and no database. Saving goes nowhere;
 * this exists to look at the frame. Does not exist in production.
 */
export default function OnboardingPreview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }}>
      {/* The flow reads its kind, country and step from the URL. */}
      <Suspense>
        <ClientOnboarding services={SERVICES} people={[]} />
      </Suspense>
    </AdminShell>
  );
}
