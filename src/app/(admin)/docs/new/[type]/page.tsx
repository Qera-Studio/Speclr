import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'New document — speclr',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function NewDocumentPlaceholder({ params }: { params: Promise<{ type: string }> }) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }
  const { type } = await params;

  return (
    <div className="flex flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold">New {type.replace(/-/g, ' ')}</h1>
      <p className="text-sm text-muted-foreground">The editor for this document type arrives in the next phase.</p>
    </div>
  );
}
