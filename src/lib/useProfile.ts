'use client';

import { usePathname } from 'next/navigation';
import { DEFAULT_PROFILE, PROFILE_COOKIE, profileFromPath, type Profile } from './profile';

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
