/**
 * @jest-environment node
 */
import { GET, isPublicAddress } from '../route';

const authorized = jest.fn();
jest.mock('@/server/actions/authGate', () => ({
  authorized: () => authorized(),
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const lookup = jest.fn();
jest.mock('node:dns/promises', () => ({
  __esModule: true,
  default: { lookup: (...args: unknown[]) => lookup(...args) },
}));

const originalFetch = global.fetch;

function request(url: string): Request {
  return new Request(`http://localhost/api/sitemap?url=${encodeURIComponent(url)}`);
}

function xmlResponse(body: string, init: { status?: number; location?: string } = {}) {
  const headers = new Headers();
  if (init.location) headers.set('location', init.location);
  return {
    ok: (init.status ?? 200) < 400,
    status: init.status ?? 200,
    headers,
    text: async () => body,
  };
}

function urlset(...urls: string[]): string {
  return `<urlset>${urls.map((u) => `<url><loc>${u}</loc></url>`).join('')}</urlset>`;
}

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue({ email: 'shivanshu@qera.studio' });
  // Public by default; individual tests override to test the guard.
  lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('isPublicAddress', () => {
  it('refuses every address family that reaches our own infrastructure', () => {
    const private_ = [
      '127.0.0.1', // loopback
      '0.0.0.0', // this host
      '10.1.2.3', // private
      '172.16.0.1',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // the cloud metadata endpoint — the one that matters
      '100.64.0.1', // CGNAT
      '198.18.0.1', // benchmarking
      '224.0.0.1', // multicast
      '::1', // v6 loopback
      '::',
      'fc00::1', // v6 unique-local
      'fd12:3456::1',
      'fe80::1', // v6 link-local
      '::ffff:127.0.0.1', // v4-mapped loopback
      '::ffff:169.254.169.254',
    ];

    for (const address of private_) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });

  it('allows ordinary public addresses', () => {
    for (const address of ['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:2800:220:1::']) {
      expect(isPublicAddress(address)).toBe(true);
    }
  });

  it('refuses a malformed address rather than guessing', () => {
    for (const address of ['', 'nonsense', '1.2.3', '1.2.3.4.5', '999.1.1.1', '-1.0.0.1']) {
      expect(isPublicAddress(address)).toBe(false);
    }
  });
});

describe('GET /api/sitemap', () => {
  it('refuses unauthenticated callers so this is not an open proxy', async () => {
    authorized.mockResolvedValue(null);
    global.fetch = jest.fn();

    const response = await GET(request('https://example.com'));

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-http scheme before spending a network call', async () => {
    global.fetch = jest.fn();

    for (const bad of ['file:///etc/passwd', 'ftp://example.com', '', 'localhost']) {
      const body = await (await GET(request(bad))).json();
      expect(body.ok).toBe(false);
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuses a host that resolves to a private address — the SSRF guard', async () => {
    lookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }]);
    global.fetch = jest.fn();

    const body = await (await GET(request('https://metadata.attacker.test'))).json();

    expect(body.ok).toBe(false);
    // Nothing was fetched at all: not the sitemap, not robots.txt.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuses a host with even one private address among several', async () => {
    lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    global.fetch = jest.fn();

    const body = await (await GET(request('https://split.test'))).json();

    expect(body.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuses a host that does not resolve, failing closed', async () => {
    lookup.mockRejectedValue(new Error('ENOTFOUND'));
    global.fetch = jest.fn();

    const body = await (await GET(request('https://nope.test'))).json();

    expect(body.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('re-checks a redirect target, because a public host may redirect at a private one', async () => {
    lookup.mockImplementation(async (hostname: string) =>
      hostname === 'evil.test'
        ? [{ address: '93.184.216.34', family: 4 }]
        : [{ address: '127.0.0.1', family: 4 }],
    );
    global.fetch = jest
      .fn()
      .mockResolvedValue(xmlResponse('', { status: 302, location: 'http://internal.test/admin' }));

    const body = await (await GET(request('https://evil.test'))).json();

    expect(body.ok).toBe(false);
    // The hop was refused before it was requested: only the two discovery
    // fetches on the public host happened.
    for (const call of (global.fetch as jest.Mock).mock.calls) {
      expect(String(call[0])).toContain('evil.test');
    }
  });

  it('does follow a redirect to another public host — http→https is everywhere', async () => {
    let hop = 0;
    global.fetch = jest.fn(async () =>
      hop++ === 0
        ? xmlResponse('', { status: 301, location: 'https://www.example.com/sitemap.xml' })
        : xmlResponse(urlset('https://example.com/after-redirect')),
    ) as unknown as typeof fetch;

    const body = await (await GET(request('http://example.com'))).json();

    expect(body.ok).toBe(true);
    expect(body.tree.children[0].label).toBe('after-redirect');
  });

  it('builds a tree from /sitemap.xml', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        xmlResponse(urlset('https://example.com/', 'https://example.com/work/one')),
      );

    const body = await (await GET(request('example.com'))).json();

    expect(body.ok).toBe(true);
    expect(body.host).toBe('example.com');
    expect(body.origin).toBe('https://example.com');
    expect(body.total).toBe(2);
    expect(body.truncated).toBe(false);
    expect(body.tree.children[0].path).toBe('/work');
  });

  it('follows a sitemap index and merges the child sitemaps', async () => {
    global.fetch = jest.fn(async (input: URL | string) => {
      const href = String(input);
      if (href.endsWith('/sitemap.xml')) {
        return xmlResponse(
          `<sitemapindex><sitemap><loc>https://example.com/pages.xml</loc></sitemap>` +
            `<sitemap><loc>https://example.com/posts.xml</loc></sitemap></sitemapindex>`,
        );
      }
      if (href.endsWith('/pages.xml')) return xmlResponse(urlset('https://example.com/about'));
      return xmlResponse(urlset('https://example.com/blog/post-1'));
    }) as unknown as typeof fetch;

    const body = await (await GET(request('example.com'))).json();

    expect(body.ok).toBe(true);
    expect(body.total).toBe(2);
    expect(body.tree.children.map((c: { path: string }) => c.path)).toEqual(['/about', '/blog']);
  });

  it('falls back to the sitemap robots.txt declares', async () => {
    global.fetch = jest.fn(async (input: URL | string) => {
      const href = String(input);
      if (href.endsWith('/sitemap.xml')) return xmlResponse('Not found', { status: 404 });
      if (href.endsWith('/robots.txt')) {
        return xmlResponse('User-agent: *\nSitemap: https://example.com/sitemap_index.xml');
      }
      return xmlResponse(urlset('https://example.com/from-robots'));
    }) as unknown as typeof fetch;

    const body = await (await GET(request('example.com'))).json();

    expect(body.ok).toBe(true);
    expect(body.tree.children[0].label).toBe('from-robots');
  });

  it('reports a site with no sitemap rather than an error', async () => {
    global.fetch = jest.fn().mockResolvedValue(xmlResponse('Not found', { status: 404 }));

    const body = await (await GET(request('example.com'))).json();

    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/No sitemap found/);
  });

  it('reports an empty sitemap distinctly from a missing one', async () => {
    global.fetch = jest.fn(async (input: URL | string) =>
      String(input).endsWith('/robots.txt')
        ? xmlResponse('User-agent: *')
        : xmlResponse('<urlset></urlset>'),
    ) as unknown as typeof fetch;

    const body = await (await GET(request('example.com'))).json();

    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/No sitemap found/);
  });

  it('surfaces a network failure as one message, leaking nothing', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED 10.0.0.5:443'));

    const response = await GET(request('example.com'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: false, error: 'Could not read that site.' });
  });

  it('flags truncation when a sitemap exceeds what can be drawn', async () => {
    const many = Array.from({ length: 2_500 }, (_, i) => `https://example.com/p${i}`);
    global.fetch = jest.fn().mockResolvedValue(xmlResponse(urlset(...many)));

    const body = await (await GET(request('example.com'))).json();

    expect(body.total).toBe(2_500);
    expect(body.truncated).toBe(true);
    expect(body.tree.children).toHaveLength(2_000);
  });
});
