/**
 * The two profiles — the top-level split of the app.
 *
 * speclr is two applications in one shell: the *client* side (contracts,
 * invoices, receipts, the clients who receive them) and the *admin* side (the
 * HR slips and letters, the employees they are about, the studio's own settings
 * and tools). Only one is active at a time, and the active one is carried in
 * the URL: `/client/…` and `/admin/…`.
 *
 * **A profile is derived, never stored.** Every document type already names
 * either a client or an employee — `isHrDocType` answers that from the type's
 * `kind`, and this module is a thin rename of that answer for navigation. So
 * there is no `profile` column, no migration, and no way for a document to
 * disagree with the side it is filed under. (`PRINCIPLES.md` rule 3: derivable
 * → compute it.)
 *
 * **This file is also the backdoor.** The two profiles are otherwise sealed
 * from each other — separate homes, separate ⌘D, separate ⌘K. Anything that
 * ever needs to cross the seam routes through the functions here, so the seam
 * is one file to find rather than a rule scattered through the UI.
 */

import { DOC_TYPE_LIST, isHrDocType } from './domain/registry';
import type { DocTypeCode } from './domain/types';

export type Profile = 'client' | 'admin';

/**
 * In display order, left to right.
 *
 * The order is load-bearing, not cosmetic: the switcher renders it left-to-
 * right and the sidebar swipe steps along it, so a right-to-left swipe lands on
 * whatever sits to the right of the current profile. Reordering this reverses
 * the gesture, which is the correct consequence.
 */
export const PROFILES: readonly Profile[] = ['client', 'admin'] as const;

/** The profile a user lands in with nothing else to go on. */
export const DEFAULT_PROFILE: Profile = 'client';

/** Cookie holding the last profile used, so `/` reopens where you left off. */
export const PROFILE_COOKIE = 'speclr_profile';

export function isProfile(value: unknown): value is Profile {
  return value === 'client' || value === 'admin';
}

/** Which side a document type is filed under. */
export function profileOfDocType(code: DocTypeCode): Profile {
  return isHrDocType(code) ? 'admin' : 'client';
}

/**
 * Where a document lives, prefix and all.
 *
 * Built from the document's own type rather than from the page doing the
 * linking: a document belongs to a side whatever surface you found it on, and a
 * list that showed both would otherwise link half its rows into the wrong
 * profile and bounce through a redirect.
 */
export function docHref(doc: { id: string; type: DocTypeCode }, suffix = ''): string {
  return `/${profileOfDocType(doc.type)}/docs/${doc.id}${suffix}`;
}

/** Where a blank document of `type` is started. */
export function newDocHref(type: DocTypeCode, slug: string): string {
  return `/${profileOfDocType(type)}/docs/new/${slug}`;
}

/**
 * Every document type on one side, in registry order.
 *
 * Computed from the registry rather than written out, so a document type added
 * to `DOC_TYPES` lands on a side without anyone remembering to file it — the
 * same failure `isHrDocType` was written to prevent.
 */
export function docTypesForProfile(profile: Profile): DocTypeCode[] {
  return DOC_TYPE_LIST.filter((spec) => profileOfDocType(spec.code) === profile).map((s) => s.code);
}

/**
 * The profile a pathname belongs to, or `null` for a path outside both — `/`
 * itself, `/sign-in`, and the legacy redirect routes.
 *
 * Deliberately returns `null` rather than defaulting: the layout needs to tell
 * "no profile yet, read the cookie" apart from "the client profile", and a
 * silent default would have `/sign-in` render the client nav.
 *
 * Accepts null because `usePathname()` is typed to return it, and does outside
 * a router — a component rendered in isolation must fall back, not throw.
 */
export function profileFromPath(pathname: string | null | undefined): Profile | null {
  const first = pathname?.split('/').filter(Boolean)[0];
  return isProfile(first) ? first : null;
}
