/**
 * A site's own `sitemap.xml`, read as a tree.
 *
 * Deliberately NOT a crawler. A sitemap is a machine-generated list the site
 * publishes about itself, so reading it is one HTTP request, needs no link
 * extraction, no queue, no `robots.txt` politeness budget and no page cap — and
 * the URL paths already encode the hierarchy we want to draw. `/blog/posts/x`
 * and `/blog/posts/y` nest under `/blog` for free.
 *
 * The trade is honest: a site with no sitemap gets no chart. That is the right
 * trade for an internal tool used a handful of times on sites that are almost
 * always Webflow, WordPress or Next — all of which emit one.
 *
 * Pure functions over strings. The fetching, and every guard that goes with
 * pointing our server at a URL someone typed, lives in the route handler.
 */

/**
 * One node of the tree. Interior nodes exist for path segments the sitemap
 * implies but never lists — `/blog/2026/a-post` gives us a `/blog` and a
 * `/blog/2026` whether or not either is a page — which is what `present`
 * distinguishes. Drawing an inferred segment as a real page would assert
 * something the sitemap does not say.
 */
export interface SitemapNode {
  /** The single path segment this node is, or the host at the root. */
  label: string;
  /** Full path from the site root: '/', '/blog', '/blog/posts'. */
  path: string;
  /** True when the sitemap listed exactly this path as a URL. */
  present: boolean;
  children: SitemapNode[];
}

/**
 * The cap on URLs drawn. Sitemaps are allowed 50,000 entries; an SVG of 50,000
 * rows is not a chart, it is a denial of service against the person reading it.
 * Truncation is reported rather than hidden.
 */
export const MAX_URLS = 2000;

/** How many child sitemaps of a `<sitemapindex>` we are willing to fetch. */
export const MAX_CHILD_SITEMAPS = 20;

/**
 * What someone typed → the site origin to read, or null if it is not usable.
 *
 * A bare host is accepted because that is what people type. The dot requirement
 * turns away `localhost` and a bare word early; it is a convenience, not the
 * security boundary — the route resolves the host and rejects private addresses
 * before any request goes out.
 */
export function normaliseSiteUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname.includes('.')) return null;

  return url;
}

const LOC_RE = /<loc>\s*([^<]+?)\s*<\/loc>/gi;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
};

/**
 * Every `<loc>` in a sitemap or sitemap index.
 *
 * A regex over XML is usually a mistake; here it is the boring right answer.
 * `<loc>` holds an escaped absolute URL and nothing else — no attributes, no
 * nesting, no namespace variance that matters — so the shape a parser would
 * protect us from cannot occur, and one regex saves a dependency and a
 * streaming parse of a file that can be tens of megabytes.
 */
export function extractLocs(xml: string): string[] {
  return [...xml.matchAll(LOC_RE)].map((match) =>
    match[1].replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, entity: string) => ENTITIES[entity]),
  );
}

/** True for a `<sitemapindex>` — a sitemap of sitemaps, not of pages. */
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

/**
 * The `Sitemap:` lines of a `robots.txt`.
 *
 * This is the discovery mechanism the sitemap protocol actually specifies;
 * `/sitemap.xml` is only the overwhelmingly common default. Sites that shard
 * their sitemaps (Shopify, most WordPress SEO plugins) often declare them here
 * and nowhere else.
 */
export function sitemapsFromRobots(robots: string): string[] {
  return [...robots.matchAll(/^[ \t]*sitemap[ \t]*:[ \t]*(\S+)/gim)].map((m) => m[1]);
}

/** Percent-decoding a path segment must never throw on a malformed one. */
function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * A flat URL list → the tree its paths describe.
 *
 * Only URLs on `host` are kept: a sitemap index legitimately points at other
 * hosts, and merging a different site's paths into this tree would silently
 * invent pages. Children are sorted so the same sitemap always draws the same
 * chart.
 */
export function buildTree(urls: string[], host: string): SitemapNode {
  const root: SitemapNode = { label: host, path: '/', present: false, children: [] };
  const byPath = new Map<string, SitemapNode>([['/', root]]);

  for (const raw of urls.slice(0, MAX_URLS)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.hostname !== host) continue;

    let node = root;
    for (const segment of url.pathname.split('/').filter(Boolean)) {
      const path = `${node.path === '/' ? '' : node.path}/${segment}`;
      let child = byPath.get(path);
      if (!child) {
        child = { label: safeDecode(segment), path, present: false, children: [] };
        byPath.set(path, child);
        node.children.push(child);
      }
      node = child;
    }
    node.present = true;
  }

  sortChildren(root);
  return root;
}

function sortChildren(node: SitemapNode): void {
  node.children.sort((a, b) => a.label.localeCompare(b.label));
  node.children.forEach(sortChildren);
}

/** A node with a grid position: `depth` is its column, `row` its line. */
export interface PlacedNode extends SitemapNode {
  depth: number;
  /** Fractional for interior nodes — they sit centred on their children. */
  row: number;
  /** Resolved by the renderer into the parent's row, to draw the edge. */
  parentPath: string | null;
}

/**
 * Lay the tree out left-to-right: depth is the column, and rows are handed to
 * leaves in order while every parent centres on the span of its children.
 *
 * Left-to-right rather than top-down because the labels are URL slugs — text
 * that reads along a row, in columns wide enough to hold it, instead of
 * colliding with its neighbours under a top-down node.
 */
export function layoutTree(root: SitemapNode): PlacedNode[] {
  const placed: PlacedNode[] = [];
  let nextLeafRow = 0;

  function walk(node: SitemapNode, depth: number, parentPath: string | null): number {
    // Claim the slot before recursing, so the output is in document order and
    // a parent is always drawn before its children.
    const slot = placed.length;
    placed.push({ ...node, depth, row: 0, parentPath });

    const row =
      node.children.length === 0
        ? nextLeafRow++
        : mean(node.children.map((child) => walk(child, depth + 1, node.path)));

    placed[slot].row = row;
    return row;
  }

  walk(root, 0, null);
  return placed;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
