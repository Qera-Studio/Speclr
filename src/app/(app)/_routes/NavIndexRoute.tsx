import { redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import type { Profile } from '@/lib/profile';
import { NAV_BY_PROFILE } from '@/components/admin/nav';
import NavIndex from '@/components/admin/NavIndex';

/**
 * `/<profile>/docs` and `/<profile>/tools` — the index page behind a flattened
 * rail row.
 *
 * The rail gives a section one row instead of one row per destination, so the
 * destinations need a page. It reads them straight out of `nav.ts`, which stays
 * the source of truth: the rail row, this page and the ⌘D palette can never
 * come to list different things because there is only one list.
 *
 * Written profile-agnostic even though only admin has a flat rail today —
 * giving the client the same treatment is two more wrappers and no new code.
 */
export default async function NavIndexRoute({
  profile,
  section,
}: {
  profile: Profile;
  /** `documents` is the profile's document types; anything else is a group. */
  section: 'documents' | string;
}) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const nav = NAV_BY_PROFILE[profile];
  if (section === 'documents') {
    return (
      <NavIndex
        title="Documents"
        description="Every kind of document this side of the studio issues. Pick one to see what has been issued, or to start a new one."
        links={nav.documents}
      />
    );
  }

  const group = nav.groups.find((g) => g.label === section);
  // A section this profile does not have. The route files only ever name their
  // own, so reaching here means `nav.ts` and a page wrapper disagree — louder
  // is better than an empty grid that looks like the group is simply empty.
  if (!group) throw new Error(`No "${section}" group in the ${profile} profile`);

  return <NavIndex title={group.label} links={group.links} />;
}
