import { DASHBOARD_LINK, DOCUMENT_SECTIONS, RECORD_LINKS, TOOL_LINKS } from './nav';

export interface Crumb {
  label: string;
  /** Link target, or undefined for a non-navigable grouping crumb (e.g. a section). */
  href: string | undefined;
}

/** A flat href → label lookup for every leaf link in the nav. */
const LEAF_LABELS: Record<string, string> = {
  [DASHBOARD_LINK.href]: DASHBOARD_LINK.label,
  ...Object.fromEntries(RECORD_LINKS.map((l) => [l.href, l.label])),
  ...Object.fromEntries(TOOL_LINKS.map((l) => [l.href, l.label])),
  ...Object.fromEntries(DOCUMENT_SECTIONS.flatMap((s) => s.children.map((c) => [c.href, c.label]))),
};

/** For a document leaf href, the section it belongs to (e.g. /docs/new/invoice → "Client"). */
const SECTION_FOR_HREF: Record<string, string> = Object.fromEntries(
  DOCUMENT_SECTIONS.flatMap((s) => s.children.map((c) => [c.href, s.label])),
);

/** Turn a raw path segment into a human label ("exit-letter" → "Exit letter"). */
function humanize(segment: string): string {
  const spaced = segment.replace(/[-_]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Derive the breadcrumb trail for a pathname from the nav definition — the single
 * source of truth for route labels. Always starts at Dashboard. Known routes use
 * their nav label (and their section, for documents); unknown leaves (e.g. a
 * document id under /docs/<id>) fall back to a "Documents" grouping + the raw id.
 */
export function breadcrumbForPath(pathname: string): Crumb[] {
  const clean = (pathname.split('?')[0] || '/').replace(/\/+$/, '') || '/';

  const root: Crumb = { label: DASHBOARD_LINK.label, href: DASHBOARD_LINK.href };
  if (clean === '/') return [root];

  const known = LEAF_LABELS[clean];
  if (known) {
    const section = SECTION_FOR_HREF[clean];
    const trail: Crumb[] = [root];
    if (section) trail.push({ label: section, href: undefined });
    trail.push({ label: known, href: clean });
    return trail;
  }

  // Unknown route. Group document routes under a "Documents" crumb; otherwise
  // humanize the last segment as a best-effort leaf label.
  const segments = clean.split('/').filter(Boolean);
  const leaf = segments[segments.length - 1];
  const trail: Crumb[] = [root];
  if (segments[0] === 'docs') {
    // Under /docs, an unknown leaf is a document id — show it verbatim.
    trail.push({ label: 'Documents', href: undefined });
    trail.push({ label: leaf, href: clean });
  } else {
    trail.push({ label: humanize(leaf), href: clean });
  }
  return trail;
}
