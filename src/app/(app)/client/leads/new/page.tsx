import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listServices } from '@/db/store';
import LeadEditor from '@/components/admin/leads/LeadEditor';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; the catalogue is live data.
export const dynamic = 'force-dynamic';

/** A new lead, on its own page. */
export default async function NewLeadRoute() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const services = await listServices();
  return <LeadEditor services={services.map(({ code, name }) => ({ code, name }))} />;
}
