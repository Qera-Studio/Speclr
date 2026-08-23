import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import ClientRequestChecklist from '@/components/tools/ClientRequestChecklist';
import { PageBody, PageHeader } from '@/components/admin/Page';

export const metadata: Metadata = {
  title: 'What to request — speclr',
  robots: { index: false, follow: false },
};

// The session cookie must be read on every request. Nothing else here is
// dynamic: the checklist reads no table and belongs to no particular client.
export const dynamic = 'force-dynamic';

/**
 * Everything to ask a new client for, as ticks.
 *
 * Authorization is enforced AT THE RESOURCE like every other page here, even
 * though this one holds nothing: the list names what we collect, which is
 * itself not for a signed-out visitor.
 */
export default async function ChecklistPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    // Width-capped: this one is read rather than scanned.
    <PageBody className="max-w-5xl">
      <PageHeader
        title="What to request"
        description="The details and documents to ask a new client for. Ticks are a scratchpad kept for this tab only, not a record: what a client actually supplied lives on their record."
      />
      <ClientRequestChecklist />
    </PageBody>
  );
}
