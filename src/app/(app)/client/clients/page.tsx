import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listClients, listEmployees, listServices } from '@/db/store';
import { studioMemberOf } from '@/lib/profile';
import { inrRatesToday } from '@/server/rates';
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

  // The list resolves a client's lead and team from ids and an engaged item's
  // price from the catalogue, so both come with the rows. Employees are
  // narrowed at this boundary, never passed on whole: see the note on
  // `StudioMember` in `lib/profile.ts`.
  // Today's rates ride along for the amount column's currency toggle. They are
  // a reading convenience and null on a bad day, which costs the toggle and
  // never the figure.
  const [clients, services, employees, rates] = await Promise.all([
    listClients(),
    listServices(),
    listEmployees(),
    inrRatesToday(),
  ]);

  return (
    <PageBody>
      <ClientManager
        clients={clients}
        catalogue={services}
        people={employees.map(studioMemberOf)}
        rates={rates}
      />
    </PageBody>
  );
}
