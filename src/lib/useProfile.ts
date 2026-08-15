'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  DEFAULT_PROFILE,
  PROFILE_COOKIE,
  PROFILES,
  isProfilePath,
  profileFromPath,
  profilePathCookie,
  type Profile,
} from './profile';

/**
 * Which profile the current page belongs to.
 *
 * Read from the path rather than passed down, because almost everything that
 * needs it needs it to *build a link* — and the answer is already sitting in
 * the URL of the page doing the linking. Threading a prop through the table,
 * the row actions, the editors and their autosave hook would have been the same
 * fact restated at every level.
 *
 * Where the document's own type is to hand, prefer `profileOfDocType`: it is
 * the stronger answer, since a document belongs to a side whatever page you
 * happen to be looking at it from.
 *
 * Separate module from `profile.ts` so that file stays importable from Server
 * Components and `src/db/store.ts`.
 */
export function useProfile(): Profile {
  return profileFromPath(usePathname()) ?? DEFAULT_PROFILE;
}

/** A month — long enough that the app reopens where you left it. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Remember the profile currently being shown, so `/` reopens on that side.
 *
 * Written from wherever you *landed*, not from the switcher's click handler.
 * Several things move you between profiles — the switcher, the swipe, the
 * Settings link in the account menu (settings live on the admin side), a
 * legacy redirect, a pasted URL — and hanging the memory off one of them left
 * the other routes quietly disagreeing with what `/` would reopen.
 */
export function rememberProfile(profile: Profile) {
  document.cookie = `${PROFILE_COOKIE}=${profile}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Remember the exact page, not just the side.
 *
 * A profile is a place you are in the middle of something, and the middle of
 * something is usually a specific record on a specific step. Sending you back
 * to the dashboard on return threw that away and made switching sides
 * expensive enough to avoid, which defeats having two sides at all.
 *
 * The search string is included deliberately: onboarding keeps its active step
 * there, so `?step=tax` is the difference between resuming and starting over.
 *
 * Validated on the way in as well as on the way out. A cookie that only ever
 * held a good value is easier to trust than one checked at the last moment.
 */
export function rememberProfilePath(profile: Profile, path: string) {
  if (!isProfilePath(profile, path)) return;
  const value = encodeURIComponent(path);
  document.cookie = `${profilePathCookie(profile)}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * Where each profile should reopen: the last page seen there, or its home.
 *
 * Read in an effect rather than during render. `document.cookie` does not exist
 * on the server, so using it in the render pass would either crash or mismatch
 * hydration. The first paint therefore links to the home and the link corrects
 * itself immediately after, which keeps the markup stable and keeps the switcher
 * a real `<Link>` (cmd-click, middle-click, the status bar preview).
 *
 * Re-read on every navigation, because moving around one side changes where the
 * *other* side's link should point the moment you come back.
 */
export function useProfileEntries(): Partial<Record<Profile, string>> {
  const pathname = usePathname();
  const [entries, setEntries] = useState<Partial<Record<Profile, string>>>({});

  useEffect(() => {
    const next: Partial<Record<Profile, string>> = {};
    for (const profile of PROFILES) {
      const saved = readCookie(profilePathCookie(profile));
      if (isProfilePath(profile, saved)) next[profile] = saved;
    }
    setEntries(next);
  }, [pathname]);

  return entries;
}
