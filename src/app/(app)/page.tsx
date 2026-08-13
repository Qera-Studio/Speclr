import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEFAULT_PROFILE, isProfile, PROFILE_COOKIE } from '@/lib/profile';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Reads a cookie, so it can never be static.
export const dynamic = 'force-dynamic';

/**
 * `/` is not a page — the app has two homes, one per profile, and this picks
 * which one you land on.
 *
 * Reopening where you left off is the point of calling these *profiles*: an
 * accountant who lives in `/client` should not be dropped into payroll every
 * morning. No auth check here on purpose — this redirects rather than renders,
 * and the profile home it lands on runs `requireAuthorizedUser()` itself.
 */
export default async function RootPage() {
  const saved = (await cookies()).get(PROFILE_COOKIE)?.value;
  redirect(`/${isProfile(saved) ? saved : DEFAULT_PROFILE}`);
}
