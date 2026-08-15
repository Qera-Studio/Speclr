'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { profileFromPath } from '@/lib/profile';
import { rememberProfile, rememberProfilePath } from '@/lib/useProfile';

/**
 * Records where you are, so each profile reopens where you left it.
 *
 * Renders nothing. It exists as its own component for one reason: it needs
 * `useSearchParams`, and a component that calls that must sit under a Suspense
 * boundary or it opts every statically-rendered page above it into dynamic
 * rendering. Putting it in `AdminShell` directly would have hung that
 * requirement on the whole app's layout.
 *
 * **The only writer.** `AdminShell` used to record the profile itself, and the
 * reason that logic moved here rather than being duplicated is that two writers
 * race: this one runs first (it is the deeper component) and the shell's effect
 * would then overwrite the precise path with a bare one. One writer, from
 * wherever you actually landed, which is the same rule `rememberProfile` was
 * written under: the switcher, the swipe, the Settings link and a pasted URL
 * all move you, and hanging the memory off any one of them leaves the others
 * quietly disagreeing.
 *
 * Paths outside both profiles (`/sign-in`, a legacy redirect passing through)
 * write nothing, so a bounce never overwrites a real choice.
 */
export default function RememberLocation() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const profile = profileFromPath(pathname);
    if (!profile) return;
    rememberProfile(profile);
    rememberProfilePath(profile, search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}
