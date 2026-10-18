import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listLeads, listServices } from '@/db/store';
import LeadsPage from '@/components/admin/leads/LeadsPage';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; leads are live data.
export const dynamic = 'force-dynamic';

/** Leads: people who might become clients, before onboarding asks for more. */
export default async function LeadsRoute() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const [leads, services] = await Promise.all([listLeads(), listServices()]);

  return <LeadsPage leads={leads} services={services.map(({ code, name }) => ({ code, name }))} />;
}
