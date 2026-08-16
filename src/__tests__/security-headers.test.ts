import nextConfig from '../../next.config';

/**
 * The security headers, asserted rather than assumed.
 *
 * speclr shipped with none of these, and the failure mode for a header is that
 * nothing looks wrong: the app works identically with and without a CSP, right
 * up until it doesn't. A deleted line in `next.config.ts` produces no error,
 * no failing page and no console warning, so a test is the only thing that
 * notices.
 *
 * These read the real config rather than a copy of it. A duplicated expected
 * string would pass forever after somebody edited only one of the two.
 */
async function headerMap(): Promise<Record<string, string>> {
  const groups = await nextConfig.headers!();
  const all = groups.flatMap((g) => g.headers);
  return Object.fromEntries(all.map((h) => [h.key.toLowerCase(), h.value]));
}

describe('security headers', () => {
  it('applies to every path, including static assets the proxy skips', async () => {
    const groups = await nextConfig.headers!();
    expect(groups).toHaveLength(1);
    expect(groups[0].source).toBe('/(.*)');
  });

  it('sets each header the checklist requires', async () => {
    const headers = await headerMap();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['permissions-policy']).toContain('geolocation=()');
  });

  it('never advertises the framework version', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  describe('the content security policy', () => {
    /** The directives that hold even though `script-src` allows inline. */
    it('blocks the exploitation primitives outright', async () => {
      const csp = (await headerMap())['content-security-policy'];
      // An injected <base> repoints every relative URL on the page, form posts
      // included. Most often the one left out.
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain('upgrade-insecure-requests');
    });

    /**
     * Exfiltration needs somewhere to send the data. This is the directive
     * doing the real work here, because a client's PAN, GSTIN and registered
     * address can only be posted to us and to Clerk.
     */
    it('confines where data can be sent', async () => {
      const csp = (await headerMap())['content-security-policy'];
      expect(csp).toMatch(/connect-src 'self'/);
      expect(csp).toMatch(/form-action 'self'/);
      expect(csp).not.toContain('connect-src *');
    });

    it('has a default-src to catch anything not named', async () => {
      const csp = (await headerMap())['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
    });

    /**
     * `'unsafe-eval'` re-enables dynamic code execution, and unlike
     * `'unsafe-inline'` (present for the reason documented in the config)
     * nothing on this stack needs it in a build that ships. React's *dev*
     * build does, which is why the config widens the directive under
     * `NODE_ENV === 'development'` and only there.
     *
     * Jest runs as `test`, so the config this reads is the shipping one. The
     * second half proves the widening is genuinely conditional rather than a
     * line that happens to be commented out.
     */
    it('never allows eval outside development', async () => {
      const csp = (await headerMap())['content-security-policy'];
      expect(csp).not.toContain('unsafe-eval');
    });

    it('allows it in development, so the policy itself stays on locally', async () => {
      const previous = process.env.NODE_ENV;
      // Writable only via defineProperty: Next's types declare it readonly.
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });
      jest.resetModules();
      try {
        const dev = (await import('../../next.config')).default;
        const headers = (await dev.headers!())[0].headers;
        const csp = headers.find((h) => h.key === 'Content-Security-Policy')!.value;
        expect(csp).toContain("'unsafe-eval'");
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', { value: previous, configurable: true });
        jest.resetModules();
      }
    });

    it('still lets Clerk load, or nobody can sign in', async () => {
      const csp = (await headerMap())['content-security-policy'];
      expect(csp).toContain('https://*.clerk.accounts.dev');
    });
  });
});
