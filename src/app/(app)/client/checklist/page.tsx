import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import ClientRequestChecklist from '@/components/tools/ClientRequestChecklist';

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
    <div className="flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">What to request</h1>
        <p className="text-sm text-muted-foreground">
          The details and documents to ask a new client for. Ticks are a
          scratchpad kept for this tab only, not a record: what a client actually
          supplied lives on their record.
        </p>
      </div>
      <ClientRequestChecklist />
    </div>
  );
}
