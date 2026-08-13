import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { getStudioSettings } from '@/db/store';
import StudioForm from '@/components/admin/settings/StudioForm';

export const metadata: Metadata = {
  title: 'Settings — speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; the settings row is live data.
export const dynamic = 'force-dynamic';

/**
 * Studio settings. Authorization is enforced AT THE RESOURCE (a valid Clerk
 * session AND an allowlisted email), never in middleware.
 */
export default async function SettingsPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const studio = await getStudioSettings();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Studio settings</h1>
        <p className="text-sm text-muted-foreground">
          What documents print as the issuer. Changes apply to drafts and future
          documents — anything already finalized keeps the details it was issued with.
        </p>
      </div>
      <StudioForm studio={studio} />
    </div>
  );
}
