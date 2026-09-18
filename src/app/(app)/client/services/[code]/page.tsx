import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { getService, listClientInputs, listExclusions } from '@/db/store';
import ServicePage from '@/components/admin/services/ServicePage';
import { PageBody } from '@/components/admin/Page';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; the catalogue is live data.
export const dynamic = 'force-dynamic';

/**
 * One Service: its menu, its wording and its libraries, editable in the app.
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
  const [service, exclusions, clientInputs] = await Promise.all([
    getService(code),
    listExclusions(true),
    listClientInputs(true),
  ]);
  if (!service) notFound();

  return (
    <PageBody>
      <ServicePage service={service} exclusions={exclusions} clientInputs={clientInputs} />
    </PageBody>
  );
}
