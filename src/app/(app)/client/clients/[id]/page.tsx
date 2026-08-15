import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { getClient, listServices } from '@/db/store';
import ClientOnboarding from '@/components/admin/clients/onboarding/ClientOnboarding';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; the client record is live data.
export const dynamic = 'force-dynamic';

/**
 * One client, in the same seven-step surface that created them.
 *
 * The first per-client URL this app has had. Create and edit share the flow
 * deliberately: two surfaces writing the same row is how a section quietly goes
 * missing — someone edits in the quick form and the tax details it never knew
 * about are still there, but nothing showed them.
 *
 * Editing unlocks every step, so coming back to fix one field does not mean
 * clicking through six.
 */
export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const { id } = await params;
  const [client, services] = await Promise.all([getClient(id), listServices()]);
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6 p-6">
      <ClientOnboarding client={client} services={services} />
    </div>
  );
}
