import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { z } from 'zod';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { getLead, listServices } from '@/db/store';
import LeadEditor from '@/components/admin/leads/LeadEditor';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; a lead is live data.
export const dynamic = 'force-dynamic';

/** One lead, on its own page. An id that is malformed or unknown is a 404. */
export default async function LeadRoute({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [lead, services] = await Promise.all([getLead(id), listServices()]);
  if (!lead) notFound();

  return <LeadEditor lead={lead} services={services.map(({ code, name }) => ({ code, name }))} />;
}
