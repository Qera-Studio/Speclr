import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listDocumentsByProfile, listServices } from '@/db/store';
import DocumentsBrowser from '@/components/admin/DocumentsBrowser';
import NewDocumentButton from '@/components/shell/NewDocumentButton';
import { PageBody, PageHeader } from '@/components/patterns/Page';
import { NAV_BY_PROFILE } from '@/components/shell/nav';
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

  // The catalogue is for the Services column: a line names the Service it
  // bills by code, and the list needs the code's Schedule.
  const [documents, catalogue] = await Promise.all([
    listDocumentsByProfile(profile),
    listServices(),
  ]);

  return (
    // `h-full` for the board view, which fills the page and scrolls inside its
    // columns rather than making the page scroll for one busy column. The other
    // two views overflow it and the shell scrolls them, as they always did.
    <PageBody className="h-full min-h-0">
      {/* The heading is the rail's own label, so the two cannot drift: the
          client side calls this "Documents", the admin side "Dashboard". */}
      <PageHeader title={NAV_BY_PROFILE[profile].home.label}>
        {/* The one button trialling `raised` — see the variant's note in
            `button.tsx`. Every other create button is still `default`. */}
        <NewDocumentButton variant="primary" />
      </PageHeader>
      {/* No tab strip. The client side's dashboard was a tab over this list,
          which had one page answering to two names — the rail said one thing,
          the strip offered another, and the heading agreed with neither once a
          tab was picked. It is a rail row and a route of its own now
          (`/client/dashboard`), so both sides' homes are the same shape. */}
      <DocumentsBrowser documents={documents} catalogue={catalogue} />
    </PageBody>
  );
}
