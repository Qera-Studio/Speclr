import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listClientInputs, listExclusions, listServices } from '@/db/store';
import { servicePageData } from '@/lib/domain/service';
import ServicePage from '@/components/admin/services/ServicePage';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; the catalogue is live data.
export const dynamic = 'force-dynamic';

/**
 * One Service: its price list, its description, and the contract terms it
 * links to. See `ServicePage` for what the page is for.
 *
 * The two libraries are loaded **with** their archived rows: an archived line
 * this Service still cites has to stay on its list, or there is no way to
 * untick it. The form itself hides the archived lines it does not cite.
 */
export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const { code } = await params;
  // Every service, archived included: the terms a service names are archived
  // rows, and so may be the services sharing them.
  const [all, exclusions, clientInputs] = await Promise.all([
    listServices(true),
    listExclusions(true),
    listClientInputs(true),
  ]);
  const data = servicePageData(code, all);
  if (!data) notFound();

  return <ServicePage {...data} exclusions={exclusions} clientInputs={clientInputs} />;
}
