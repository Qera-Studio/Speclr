import {
  MAX_URLS,
  buildTree,
  extractLocs,
  isSitemapIndex,
  layoutTree,
  normaliseSiteUrl,
  sitemapsFromRobots,
} from '../sitemap';

function urlset(...urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>2026-01-01</lastmod></url>`).join('\n')}
</urlset>`;
}

describe('normaliseSiteUrl', () => {
  it('accepts a bare host, because that is what anyone types', () => {
    expect(normaliseSiteUrl('qera.studio')?.origin).toBe('https://qera.studio');
    expect(normaliseSiteUrl('  qera.studio  ')?.origin).toBe('https://qera.studio');
  });

  it('keeps an explicit scheme and discards the path', () => {
    expect(normaliseSiteUrl('http://qera.studio/about')?.origin).toBe('http://qera.studio');
  });

  it('refuses anything that is not http(s)', () => {
    for (const bad of ['file:///etc/passwd', 'ftp://qera.studio', 'javascript:alert(1)']) {
      expect(normaliseSiteUrl(bad)).toBeNull();
    }
  });

  it('refuses a dotless host, which is how localhost is typed', () => {
    for (const bad of ['', '   ', 'localhost', 'http://localhost:3000', 'nonsense']) {
      expect(normaliseSiteUrl(bad)).toBeNull();
    }
  });
});

describe('extractLocs', () => {
  it('reads every URL out of a urlset', () => {
    expect(extractLocs(urlset('https://a.test/', 'https://a.test/about'))).toEqual([
      'https://a.test/',
      'https://a.test/about',
    ]);
  });

  it('unescapes entities, so a query string survives intact', () => {
    const xml = urlset('https://a.test/search?q=a&amp;page=2');
    expect(extractLocs(xml)).toEqual(['https://a.test/search?q=a&page=2']);
  });

  it('tolerates whitespace and newlines inside loc', () => {
    expect(extractLocs('<url><loc>\n  https://a.test/x\n</loc></url>')).toEqual([
      'https://a.test/x',
    ]);
  });

  it('returns nothing for a document with no locs', () => {
    expect(extractLocs('<html><body>Not found</body></html>')).toEqual([]);
  });
});

describe('isSitemapIndex', () => {
  it('distinguishes an index of sitemaps from a list of pages', () => {
    expect(isSitemapIndex('<sitemapindex xmlns="x"><sitemap><loc>a</loc></sitemap>')).toBe(true);
    expect(isSitemapIndex(urlset('https://a.test/'))).toBe(false);
  });
});

describe('sitemapsFromRobots', () => {
  it('finds Sitemap directives regardless of case or spacing', () => {
    const robots = [
      'User-agent: *',
      'Disallow: /admin',
      'Sitemap: https://a.test/sitemap_index.xml',
      '  sitemap:https://a.test/news.xml',
    ].join('\n');

    expect(sitemapsFromRobots(robots)).toEqual([
      'https://a.test/sitemap_index.xml',
      'https://a.test/news.xml',
    ]);
  });

  it('returns nothing when robots.txt declares none', () => {
    expect(sitemapsFromRobots('User-agent: *\nDisallow:')).toEqual([]);
  });
});

describe('buildTree', () => {
  it('nests URLs by their path segments', () => {
    const tree = buildTree(
      ['https://a.test/', 'https://a.test/blog', 'https://a.test/blog/first-post'],
      'a.test',
    );

    expect(tree.label).toBe('a.test');
    expect(tree.present).toBe(true);
    expect(tree.children.map((c) => c.path)).toEqual(['/blog']);
    expect(tree.children[0].children[0].path).toBe('/blog/first-post');
  });

  it('marks an implied segment absent — the sitemap never claimed it exists', () => {
    const tree = buildTree(['https://a.test/blog/2026/a-post'], 'a.test');

    const blog = tree.children[0];
    expect(blog.path).toBe('/blog');
    expect(blog.present).toBe(false);
    expect(blog.children[0].present).toBe(false); // /blog/2026
    expect(blog.children[0].children[0].present).toBe(true); // the post itself
  });

  it('drops URLs on another host, which an index may legitimately list', () => {
    const tree = buildTree(['https://a.test/keep', 'https://other.test/drop'], 'a.test');
    expect(tree.children.map((c) => c.label)).toEqual(['keep']);
  });

  it('ignores entries that are not URLs at all', () => {
    const tree = buildTree(['not a url', '/relative', 'https://a.test/ok'], 'a.test');
    expect(tree.children.map((c) => c.label)).toEqual(['ok']);
  });

  it('sorts children so the same sitemap always draws the same chart', () => {
    const tree = buildTree(
      ['https://a.test/zebra', 'https://a.test/apple', 'https://a.test/mango'],
      'a.test',
    );
    expect(tree.children.map((c) => c.label)).toEqual(['apple', 'mango', 'zebra']);
  });

  it('percent-decodes a segment for its label but keeps the path exact', () => {
    const tree = buildTree(['https://a.test/case%20studies'], 'a.test');
    expect(tree.children[0].label).toBe('case studies');
    expect(tree.children[0].path).toBe('/case%20studies');
  });

  it('does not duplicate a node when two URLs share a branch', () => {
    const tree = buildTree(
      ['https://a.test/work/one', 'https://a.test/work/two', 'https://a.test/work/one'],
      'a.test',
    );
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].children.map((c) => c.label)).toEqual(['one', 'two']);
  });

  it('caps the tree at MAX_URLS so a 50,000-entry sitemap cannot be drawn', () => {
    const many = Array.from({ length: MAX_URLS + 50 }, (_, i) => `https://a.test/p${i}`);
    expect(buildTree(many, 'a.test').children).toHaveLength(MAX_URLS);
  });

  it('handles a trailing slash as the same page as without one', () => {
    const tree = buildTree(['https://a.test/about/', 'https://a.test/about'], 'a.test');
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].present).toBe(true);
  });
});

describe('layoutTree', () => {
  it('gives each leaf its own row, in order', () => {
    const tree = buildTree(
      ['https://a.test/a', 'https://a.test/b', 'https://a.test/c'],
      'a.test',
    );
    const placed = layoutTree(tree);

    expect(placed.filter((n) => n.depth === 1).map((n) => n.row)).toEqual([0, 1, 2]);
  });

  it('centres a parent on the span of its children', () => {
    const tree = buildTree(
      ['https://a.test/blog/x', 'https://a.test/blog/y', 'https://a.test/blog/z'],
      'a.test',
    );
    const placed = layoutTree(tree);

    // Three leaves on rows 0..2 — the blog node sits on the middle one, and the
    // root, with one child, sits on the same line.
    expect(placed.find((n) => n.path === '/blog')?.row).toBe(1);
    expect(placed.find((n) => n.path === '/')?.row).toBe(1);
  });

  it('records depth as the column and the parent as a path to join on', () => {
    const tree = buildTree(['https://a.test/blog/post'], 'a.test');
    const placed = layoutTree(tree);

    expect(placed.map((n) => [n.path, n.depth, n.parentPath])).toEqual([
      ['/', 0, null],
      ['/blog', 1, '/'],
      ['/blog/post', 2, '/blog'],
    ]);
  });

  it('lays out every node exactly once', () => {
    const tree = buildTree(
      ['https://a.test/a/1', 'https://a.test/a/2', 'https://a.test/b', 'https://a.test/'],
      'a.test',
    );
    const placed = layoutTree(tree);

    expect(placed).toHaveLength(5); // root, /a, /a/1, /a/2, /b
    expect(new Set(placed.map((n) => n.path)).size).toBe(5);
  });
});
