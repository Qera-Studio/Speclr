import { DEFAULT_PROFILE, profileFromPath, type Profile } from '@/lib/profile';
import { linksForProfile, NAV_BY_PROFILE, SETTINGS_LINK } from './nav';

export interface Crumb {
  label: string;
  /** Link target, or undefined for a non-navigable grouping crumb. */
  href: string | undefined;
}

/** A flat href → label lookup for every leaf link in one profile's nav. */
function leafLabels(profile: Profile): Record<string, string> {
  return {
    ...Object.fromEntries(linksForProfile(profile).map((l) => [l.href, l.label])),
    // Settings is reachable from the account menu in either profile, so it is
    // labelled here rather than in whichever nav happens to hold it.
    [SETTINGS_LINK.href]: SETTINGS_LINK.label,
  };
}

/**
 * Whether this path is one the sidebar links to directly.
 *
 * A trail on such a page says nothing the nav does not already say, with the
 * current page highlighted in it: "Dashboard > Clients" is one hop restated as
 * two, above a rail that is showing you the same hop. Secondary pages are the
 * ones worth a trail, because nothing else on screen says how you got there or
 * offers the way back up.
 *
 * Read off the same `leafLabels` map the trail itself uses, so a link added to
 * the nav loses its breadcrumb in the same commit rather than in whichever one
 * somebody notices. The home is included by construction (it is a nav link) and
 * so is Settings, which is primary in the way that matters here: it is reached
 * from the account menu in one click and has no parent to walk back to.
 */
export function isPrimaryPath(pathname: string): boolean {
  const clean = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  const profile = profileFromPath(clean) ?? DEFAULT_PROFILE;
  return clean === '/' || Boolean(leafLabels(profile)[clean]);
}

/** Turn a raw path segment into a human label ("exit-letter" → "Exit letter"). */
function humanize(segment: string): string {
  const spaced = segment.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Where a "back" control on `pathname` should lead: its nearest navigable
 * ancestor, read off the breadcrumb trail.
 *
 * Derived rather than passed down per page, so back and the breadcrumb can
 * never disagree about the hierarchy — both read the nav definition. Grouping
 * crumbs are skipped because they have no page of their own, and anything
 * without an ancestor falls back to the profile's home.
 */
export function parentHref(pathname: string): string {
  const home = NAV_BY_PROFILE[profileFromPath(pathname) ?? DEFAULT_PROFILE].home.href;
  const ancestors = breadcrumbForPath(pathname)
    .slice(0, -1)
    .filter((c) => c.href);
  return ancestors[ancestors.length - 1]?.href ?? home;
}

/**
 * Derive the breadcrumb trail for a pathname from the nav definition — the
 * single source of truth for route labels.
 *
 * Always starts at the *profile's* home, not a global one: the app is two
 * applications sharing a shell, and a trail that walked up past the profile
 * would be offering to navigate somewhere the profile cannot reach. The profile
 * itself is not a crumb — the switcher above already says which side you are
 * on, and repeating it would be the same word twice on every page.
 */
export function breadcrumbForPath(pathname: string): Crumb[] {
  const clean = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';
  const profile = profileFromPath(clean) ?? DEFAULT_PROFILE;
  const nav = NAV_BY_PROFILE[profile];

  const root: Crumb = { label: nav.home.label, href: nav.home.href };
  if (clean === '/' || clean === nav.home.href) return [root];

  const known = leafLabels(profile)[clean];
  if (known) return [root, { label: known, href: clean }];

  // Strip the profile so the rest of this reads the same as it did before the
  // split: `['docs', 'new', 'invoice']`, `['docs', '<uuid>']`.
  const segments = clean.split('/').filter(Boolean).slice(1);
  const leaf = segments[segments.length - 1];
  if (!leaf) return [root];

  // `…/docs/new/<slug>` — the create form for a type whose list is
  // `…/docs/<slug>`. Trail through the list so the type stays navigable.
  if (segments[0] === 'docs' && segments[1] === 'new' && segments.length === 3) {
    const listHref = `/${profile}/docs/${leaf}`;
    const label = leafLabels(profile)[listHref];
    if (label) {
      return [root, { label, href: listHref }, { label: 'New', href: clean }];
    }
  }

  // Unknown route. Group document routes under a "Documents" crumb; otherwise
  // humanize the last segment as a best-effort leaf label.
  if (segments[0] === 'docs') {
    // Under /docs, an unknown leaf is a document id — show it verbatim.
    return [root, { label: 'Documents', href: undefined }, { label: leaf, href: clean }];
  }

  /**
   * `…/clients/<uuid>` — the onboarding flow for one client.
   *
   * Unlike a document id, which is what people quote to each other, a client's
   * uuid says nothing to anybody, and humanizing it printed thirty-six
   * characters of hex across the top of the page. The trail can't name the
   * client — it only has the path, and the record lives in the database — so it
   * says what kind of thing this is and keeps the list navigable.
   */
  if (segments[0] === 'clients' && segments.length === 2) {
    const listHref = `/${profile}/clients`;
    const label = leafLabels(profile)[listHref];
    if (label) {
      return [
        root,
        { label, href: listHref },
        { label: leaf === 'new' ? 'New client' : 'Client', href: clean },
      ];
    }
  }

  return [root, { label: humanize(leaf), href: clean }];
}
