import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listDocumentsByProfile } from '@/db/store';
import DocumentsBrowser from '@/components/admin/DocumentsBrowser';
import NewDocumentButton from '@/components/admin/NewDocumentButton';
import { PageBody, PageHeader } from '@/components/admin/Page';
import { NAV_BY_PROFILE } from '@/components/admin/nav';
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
    <PageBody>
      {/* The heading is the rail's own label, so the two cannot drift: the
          client side calls this "Documents", the admin side "Dashboard". */}
      <PageHeader title={NAV_BY_PROFILE[profile].home.label}>
        {/* The one button trialling `raised` — see the variant's note in
            `button.tsx`. Every other create button is still `default`. */}
        <NewDocumentButton variant="raised" />
      </PageHeader>
      <DocumentsBrowser documents={documents} />
    </PageBody>
  );
}
