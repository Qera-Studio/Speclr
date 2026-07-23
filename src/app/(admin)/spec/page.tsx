import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import IconSpecTool from '@/components/spec/IconSpecTool';

export const metadata: Metadata = {
  title: 'Icon Spec — speclr',
  robots: { index: false, follow: false },
};

// Reads the Clerk session cookie on every request.
export const dynamic = 'force-dynamic';

export default async function SpecPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    <main id="main-content">
      <IconSpecTool />
    </main>
  );
}
