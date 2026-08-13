import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listDocumentsByProfile } from '@/db/store';
import DocumentsBrowser from '@/components/admin/DocumentsBrowser';
import NewDocumentButton from '@/components/admin/NewDocumentButton';
import type { Profile } from '@/lib/profile';

/**
 * `/client` and `/admin` — each profile's home: its own documents, nothing from
 * the other side.
 *
 * Enforces authorization AT THE RESOURCE (not in middleware): a valid Clerk
 * session AND an allowlisted email. Anyone else is redirected to
 * sign-in / no-access. Shared by both homes so that check has one copy.
 */
export default async function HomeRoute({ profile }: { profile: Profile }) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const documents = await listDocumentsByProfile(profile);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        {/* "Dashboard", matching the rail. This page browses every document
            already issued; `/<profile>/docs` lists the *types* you can create.
            Both were headed "Documents", which made them the same page twice. */}
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        {/* The one button trialling `raised` — see the variant's note in
            `button.tsx`. Every other create button is still `default`. */}
        <NewDocumentButton variant="raised" />
      </div>
      <DocumentsBrowser documents={documents} />
    </div>
  );
}
