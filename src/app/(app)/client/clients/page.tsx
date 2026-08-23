import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listClients } from '@/db/store';
import ClientManager from '@/components/admin/clients/ClientManager';
import { PageBody } from '@/components/admin/Page';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; client list is live data.
export const dynamic = 'force-dynamic';

/**
 * Clients dashboard. Enforces authorization AT THE RESOURCE (not in
 * middleware): a valid Clerk session AND an allowlisted email. Anyone else
 * is redirected to sign-in / no-access.
 */
export default async function ClientsPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const clients = await listClients();

  return (
    <PageBody>
      <ClientManager clients={clients} />
    </PageBody>
  );
}
