import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listServices } from '@/db/store';
import ServiceManager from '@/components/admin/services/ServiceManager';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; service list is live data.
export const dynamic = 'force-dynamic';

/**
 * Services dashboard. Enforces authorization AT THE RESOURCE (not in
 * middleware): a valid Clerk session AND an allowlisted email. Anyone else
 * is redirected to sign-in / no-access.
 */
export default async function ServicesPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const services = await listServices();

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Services</h1>
      <ServiceManager services={services} />
    </div>
  );
}
