import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listDocuments } from '@/db/store';
import DocumentsBrowser from '@/components/admin/DocumentsBrowser';
import NewDocumentButton from '@/components/admin/NewDocumentButton';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; document list is live data.
export const dynamic = 'force-dynamic';

/**
 * Documents dashboard — the admin home. Enforces authorization AT THE
 * RESOURCE (not in middleware): a valid Clerk session AND an allowlisted
 * email. Anyone else is redirected to sign-in / no-access.
 */
export default async function DashboardPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const documents = await listDocuments();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <NewDocumentButton />
      </div>
      <DocumentsBrowser documents={documents} />
    </div>
  );
}
