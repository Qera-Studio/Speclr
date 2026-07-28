const PLACEHOLDER_DOMAIN = 'samplebrand.com';

/**
 * The domain to show in preview mockups (address bar, SERP result, social card).
 *
 * An explicit domain always wins, because a brand name cannot be mechanically
 * turned into one: "Qera Studio" is `qera.studio`, not `qerastudio.com`. The
 * slugged-brand fallback is a rough guess for when no domain has been entered
 * yet — never a substitute for the real thing.
 */
export function displayDomain(brandName?: string, domain?: string): string {
  const explicit = normaliseDomain(domain);
  if (explicit) return explicit;

  const slug = (brandName ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return slug ? `${slug}.com` : PLACEHOLDER_DOMAIN;
}

/** Reduce user input — bare domain or pasted URL — to a bare host + path. */
function normaliseDomain(raw?: string): string | null {
  const trimmed = (raw ?? '').trim().toLowerCase();
  if (!trimmed) return null;

  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  const withoutWww = withoutScheme.replace(/^www\./, '');
  const withoutTrailingSlash = withoutWww.replace(/\/+$/, '');

  return withoutTrailingSlash || null;
}
