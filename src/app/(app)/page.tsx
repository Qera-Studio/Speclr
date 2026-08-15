import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  DEFAULT_PROFILE,
  isProfile,
  isProfilePath,
  PROFILE_COOKIE,
  profilePathCookie,
} from '@/lib/profile';

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
 *
 * It reopens the exact *page*, not just the side, when one was recorded. The
 * path is validated by `isProfilePath` first, and that check is load-bearing
 * rather than defensive: this value comes from a cookie, cookies are
 * client-writable, and it is handed straight to `redirect()`. Without the
 * check this is an open redirect.
 */
export default async function RootPage() {
  const jar = await cookies();
  const saved = jar.get(PROFILE_COOKIE)?.value;
  const profile = isProfile(saved) ? saved : DEFAULT_PROFILE;

  const raw = jar.get(profilePathCookie(profile))?.value;
  let last: string | undefined;
  try {
    last = raw ? decodeURIComponent(raw) : undefined;
  } catch {
    // A malformed escape sequence. Fall through to the profile home.
  }

  redirect(isProfilePath(profile, last) ? last : `/${profile}`);
}
