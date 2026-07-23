import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Document — speclr',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function DocumentViewPlaceholder({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }
  const { id } = await params;

  return (
    <div className="flex flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold">Document</h1>
      <p className="text-sm text-muted-foreground">
        Viewing document <code className="rounded bg-muted px-1 py-0.5">{id}</code> arrives in the next phase.
      </p>
    </div>
  );
}
