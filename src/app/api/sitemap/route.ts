import { NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import { authorized } from '@/server/actions/authGate';
import { logger } from '@/lib/logger';
import {
  MAX_CHILD_SITEMAPS,
  MAX_URLS,
  buildTree,
  extractLocs,
  isSitemapIndex,
  normaliseSiteUrl,
  sitemapsFromRobots,
  type SitemapNode,
} from '@/lib/domain/sitemap';

/**
 * Read a site's published sitemap and return it as a tree.
 *
 * The only route in speclr that fetches a URL a human typed, which makes it the
 * only one with an SSRF surface: left unguarded, "https://169.254.169.254/…"
 * would have our server read cloud instance metadata and hand it back over
 * HTTP. So every request — including every redirect hop — resolves its host and
 * is refused unless every address it resolves to is public.
 *
 * Gated on the session like `/api/pincode`: an internal tool holding financial
 * records must not also be an open proxy someone else can fetch through.
 */

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_HOPS = 3;

interface SitemapResponse {
  ok: boolean;
  error?: string;
  /** Origin the tree was read from, so the client can link each page. */
  origin?: string;
  host?: string;
  /** URLs the sitemap listed, before `MAX_URLS` truncation. */
  total?: number;
  truncated?: boolean;
  tree?: SitemapNode;
}

function fail(error: string, status = 200): NextResponse<SitemapResponse> {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request): Promise<NextResponse<SitemapResponse>> {
  if (!(await authorized())) {
    return fail('Unauthorized.', 401);
  }

  const site = normaliseSiteUrl(new URL(request.url).searchParams.get('url') ?? '');
  if (!site) return fail('Enter a site address, like qera.studio.');

  try {
    const xml = await discoverSitemap(site);
    if (!xml) {
      return fail('No sitemap found — nothing at /sitemap.xml, and robots.txt names none.');
    }

    const locs = isSitemapIndex(xml) ? await followIndex(xml) : extractLocs(xml);
    if (locs.length === 0) return fail('That sitemap lists no URLs.');

    return NextResponse.json({
      ok: true,
      origin: site.origin,
      host: site.hostname,
      total: locs.length,
      truncated: locs.length > MAX_URLS,
      tree: buildTree(locs, site.hostname),
    });
  } catch (err) {
    // Timeouts, DNS failures, TLS errors, malformed XML — one message to the
    // caller. Log the shape of the failure and the host, never a response body.
    logger.warn({
      action: 'sitemapRead',
      event: 'read_failed',
      host: site.hostname,
      error: err,
    });
    return fail('Could not read that site.');
  }
}

/**
 * `/sitemap.xml` first — the overwhelmingly common case, and one request. Only
 * when that yields nothing do we spend a second request on `robots.txt`, which
 * is where sites that shard their sitemaps declare them.
 */
async function discoverSitemap(site: URL): Promise<string | null> {
  const direct = await safeFetch(new URL('/sitemap.xml', site));
  if (direct && extractLocs(direct).length > 0) return direct;

  const robots = await safeFetch(new URL('/robots.txt', site));
  if (!robots) return null;

  for (const declared of sitemapsFromRobots(robots).slice(0, MAX_CHILD_SITEMAPS)) {
    const target = asUrl(declared);
    if (!target) continue;
    const body = await safeFetch(target);
    if (body && extractLocs(body).length > 0) return body;
  }

  return null;
}

/**
 * A `<sitemapindex>` names child sitemaps rather than pages, so fetch them and
 * merge. One level only: an index of indexes is legal but effectively unseen,
 * and recursing would make the request count unbounded on a hostile file.
 */
async function followIndex(xml: string): Promise<string[]> {
  const children = extractLocs(xml).slice(0, MAX_CHILD_SITEMAPS);

  const bodies = await Promise.all(
    children.map(async (loc) => {
      const target = asUrl(loc);
      if (!target) return null;
      // One slow child sitemap must not lose the rest of the tree.
      return safeFetch(target).catch(() => null);
    }),
  );

  return bodies.flatMap((body) => (body && !isSitemapIndex(body) ? extractLocs(body) : []));
}

function asUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/**
 * Fetch a URL only if it is safe to point our server at.
 *
 * Redirects are handled by hand (`redirect: 'manual'`) rather than by fetch,
 * because a perfectly public host is free to redirect at `127.0.0.1` — and an
 * automatic follow would never show us the hop to check.
 *
 * ponytail: resolve-then-connect leaves a DNS-rebinding window (the name could
 * resolve differently for the actual connection). Closing it means resolving
 * once and connecting to the literal address with a Host header, which fetch
 * cannot express — a custom agent or an egress proxy if this ever faces
 * anything other than a handful of allowlisted internal users.
 */
async function safeFetch(url: URL, hops = 0): Promise<string | null> {
  if (hops > MAX_HOPS) return null;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!(await resolvesPublicly(url.hostname))) return null;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'manual',
    headers: { Accept: 'application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8' },
    cache: 'no-store',
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) return null;
    const next = asUrl(new URL(location, url).href);
    // Re-guarded from the top: the hop is a new destination, not a continuation.
    return next ? safeFetch(next, hops + 1) : null;
  }

  if (!response.ok) return null;

  // ponytail: an undeclared Content-Length is only caught after the body is in
  // memory. The timeout bounds it in practice; stream-and-abort if that stops
  // being true.
  if (Number(response.headers.get('content-length')) > MAX_BYTES) return null;

  const body = await response.text();
  return body.length > MAX_BYTES ? null : body;
}

/**
 * True only when a hostname resolves entirely to public addresses.
 *
 * `every`, not `some`: a host with one public and one loopback address is an
 * attack, not a fallback. An unresolvable host is refused too — there is
 * nothing to fetch, and failing closed is the only safe direction here.
 */
async function resolvesPublicly(hostname: string): Promise<boolean> {
  try {
    const records = await dns.lookup(hostname, { all: true });
    return records.length > 0 && records.every((record) => isPublicAddress(record.address));
  } catch {
    return false;
  }
}

/** Exported for its test — the guard the whole route rests on. */
export function isPublicAddress(address: string): boolean {
  return address.includes(':') ? isPublicV6(address) : isPublicV4(address);
}

function isPublicV4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4) return false;
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;

  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return false; // this-host, private, loopback
  if (a === 169 && b === 254) return false; // link-local — the cloud metadata endpoint
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 192 && b === 0) return false; // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a >= 224) return false; // multicast and reserved
  return true;
}

function isPublicV6(address: string): boolean {
  const lower = address.toLowerCase();

  // A v4-mapped address (::ffff:127.0.0.1) is a v4 address wearing a v6 hat.
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicV4(mapped[1]);

  if (lower === '::' || lower === '::1') return false;

  const head = parseInt(lower.split(':')[0] || '0', 16);
  if (Number.isNaN(head)) return false;
  if ((head & 0xfe00) === 0xfc00) return false; // fc00::/7 unique-local
  if ((head & 0xffc0) === 0xfe80) return false; // fe80::/10 link-local
  return true;
}
