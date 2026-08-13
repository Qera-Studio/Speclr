import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listServices } from '@/db/store';
import ServiceCards from '@/components/admin/services/ServiceCards';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; the catalogue is live data.
export const dynamic = 'force-dynamic';

/**
 * The service catalogue — everything the studio sells, grouped by Schedule.
 *
 * On the client side rather than among the admin tools: a Service is contract
 * source material, pulled into a contract as a Part, so it belongs beside the
 * contracts it feeds rather than beside the CTC calculator.
 *
 * It used to render at the foot of the contract list. Moved out because the
 * list of what the studio sells is something you go and read, not a footnote
 * whose position depended on how many contracts happened to exist.
 */
export default async function ServiceCataloguePage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const services = await listServices();

  return (
    <div className="flex flex-col gap-6 p-6">
      <ServiceCards services={services} />
    </div>
  );
}
