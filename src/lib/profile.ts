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

import { todayISO } from './domain/dates';
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

/**
 * Cookie holding the last *page* visited on a profile.
 *
 * One per profile rather than one shared cookie, because the two are written
 * and read independently: you are only ever on one side, and the other side's
 * memory must survive untouched while you are away. That is the whole feature.
 *
 * A cookie rather than `sessionStorage` so `/` can use it too. The server
 * already reads `PROFILE_COOKIE` there to choose a side; reading one more
 * makes it choose the page as well, for free.
 */
export function profilePathCookie(profile: Profile): string {
  return `speclr_last_${profile}`;
}

/**
 * Is this somewhere we are willing to send a person?
 *
 * A cookie is client-writable, and its value is fed to `redirect()`, so this is
 * an open-redirect guard and not a formality. The path must be same-origin,
 * absolute, and inside the profile it was filed under.
 *
 * The trailing-character check is the part that is easy to get wrong:
 * `/clientele.evil.com` passes a naive `startsWith('/client')`. So the
 * character after the prefix has to be a boundary, not more name.
 */
export function isProfilePath(profile: Profile, value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 512) return false;
  const prefix = `/${profile}`;
  if (!value.startsWith(prefix)) return false;
  const next = value.charAt(prefix.length);
  return next === '' || next === '/' || next === '?';
}

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

/**
 * Where a row opens when somebody clicks it.
 *
 * A finalized document lives on its **print view**: the pages as they print,
 * with the sealed card, Duplicate and Download beside them. `DocumentRoute`
 * redirects there anyway, which is what keeps a bookmark, a ⌘K hit and a mailed
 * link landing right; this saves the round trip on the common path.
 *
 * Here rather than in whichever list asked first, because three of them ask:
 * the table, the cards and the board's cards. Two of them writing the rule and
 * one forgetting is how a list comes to send you somewhere different depending
 * on which view you happened to be in.
 */
export function openDocHref(doc: { id: string; type: DocTypeCode; status: string }): string {
  if (doc.status === 'finalized') return docHref(doc, '/print');
  return docHref(doc);
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

// ─── The crossing ─────────────────────────────────────────────────────────────

/**
 * A member of the studio, as the **client** side is allowed to see them.
 *
 * This type is the seam doing its actual job rather than merely being a place
 * to put a function. An `EmployeeRecord` carries the person's salary, PAN, UAN,
 * PF and ESIC numbers, their home address and their engagement type: a payroll
 * record. The client side needs to draw a name on a card and store an id, so
 * handing it the record would put every person's pay one `console.log` away
 * from a clients page, and one careless prop-spread away from the DOM.
 *
 * So the crossing **narrows**. Four fields, each because the card prints it:
 *
 * - `id` is what is stored on the client (ids, never names, §5d-i);
 * - `name` and `role` are what the card shows;
 * - `engagementType` is why an intern can be on a team but is drawn as one.
 *
 * Widening this is a decision, not a convenience. Before adding a field, ask
 * what the client side renders it for, and whether it is a fact about the
 * person's *employment* rather than about their work on a client.
 */
export interface StudioMember {
  id: string;
  name: string;
  role: string;
  engagementType: string;
  /** Left the studio: still resolvable on old records, never newly assignable. */
  departed: boolean;
}

/**
 * Narrow a payroll record to what the client profile may see.
 *
 * Takes the fields it needs rather than the whole record, so this module never
 * imports the employee type and the seam stays one-directional: the admin side
 * knows about this shape, the client side does not know about `EmployeeRecord`.
 */
export function studioMemberOf(employee: {
  id: string;
  name: string;
  role: string;
  engagementType: string;
  endDate?: string;
}): StudioMember {
  return {
    id: employee.id,
    name: employee.name,
    role: employee.role,
    engagementType: employee.engagementType,
    // An end date in the past is what "no longer here" means. Computed rather
    // than stored, and computed *here* so the client side never has to know
    // that an employment ends with a date rather than a flag.
    //
    // `todayISO()`, never a UTC slice of the current timestamp: that converts
    // to UTC first, so between 00:00 and 05:30 IST it answers yesterday and
    // somebody whose last day is today reads as already gone.
    // `design-system.test.ts` polices this, and caught it here.
    departed: Boolean(employee.endDate && employee.endDate <= todayISO()),
  };
}
