import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listClients, listEmployees, listServices } from '@/db/store';
import { studioMemberOf } from '@/lib/profile';
import { inrRatesToday } from '@/server/rates';
import { resumeStep } from '@/components/admin/clients/onboarding/steps';
import { PageBody, PageHeader } from '@/components/admin/Page';
import RichClientsPreview from '@/components/library/richTable/RichClientsPreview';
import { richRowOf } from '@/components/library/richTable/fromClient';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie and live client data, read on every request, as `/clients`.
export const dynamic = 'force-dynamic';

/**
 * `/client/clients-rich`: the real clients, in the rich table.
 *
 * **Archived 9 October 2026, see `README.md` beside this file.** Kept outside
 * `src/app` so it is not a route; moving it back to
 * `src/app/(app)/client/clients-rich/page.tsx` revives it as it was.
 *
 * **Temporary.** It exists so the rich table can be judged against real
 * records beside the list it would replace, without touching that list. It
 * reads exactly what `/client/clients` reads, and its row menu is that list's
 * own (edit, archive, delete, through the same server actions). Either the
 * table replaces the clients list and this page goes, or the table is dropped
 * and this page goes with it.
 *
 * Live clients only: the archived view, filtering and sorting stay on the
 * real list.
 */
export default async function RichClientsPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const [clients, services, employees, rates] = await Promise.all([
    listClients(),
    listServices(),
    listEmployees(),
    inrRatesToday(),
  ]);

  const nameOf = new Map(employees.map(studioMemberOf).map((person) => [person.id, person.name]));
  const live = clients.filter((client) => !client.archived);
  const rows = live.map((client) =>
      richRowOf(client, {
        catalogue: services,
        nameOf,
        href: `/client/clients/${client.id}?step=${resumeStep(client)}`,
      }),
    );

  return (
    <PageBody className="flex flex-col gap-6">
      <PageHeader
        title="Clients (rich table preview)"
        description="Temporary: the live clients in the rich table, beside the list it would replace."
      />
      <RichClientsPreview clients={live} rows={rows} rates={rates} />
    </PageBody>
  );
}
