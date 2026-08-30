/**
 * The renderer must refuse a page that is not the document.
 *
 * This exists because of a real failure: on a preview deployment Vercel's SSO
 * wall answered `302 -> vercel.com/sso-api` before Next ran, and the renderer
 * turned the login screen into a valid PDF. Stored, that becomes a legal
 * document showing a sign-in form, and nothing anywhere reports a problem.
 *
 * A PDF of the wrong page is worse than no PDF: finalize deliberately swallows
 * a render failure (the serial is already claimed) and the download route
 * retries, so throwing is recoverable. Silently storing the wrong bytes is not.
 */

const mockGoto = jest.fn();
const mockPageUrl = jest.fn();
const mockPdf = jest.fn(() => Buffer.from('%PDF-1.4 fake'));
// The real `close()` returns a promise the renderer calls `.catch()` on.
const mockClose = jest.fn(() => Promise.resolve());

const mockSetCookie = jest.fn(() => Promise.resolve());

jest.mock('puppeteer-core', () => ({
  launch: async () => ({
    newPage: async () => ({
      setExtraHTTPHeaders: jest.fn(),
      goto: mockGoto,
      url: mockPageUrl,
      waitForSelector: jest.fn().mockRejectedValue(new Error('no marker')),
      pdf: mockPdf,
    }),
    setCookie: mockSetCookie,
    close: mockClose,
  }),
}));

const WANTED = 'https://speclr.example/client/docs/abc/print';

describe('renderPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // A developer machine drives a real Chrome; the path only has to be truthy.
    process.env.CHROME_PATH = '/fake/chrome';
    delete process.env.VERCEL;
  });

  const load = async () => (await import('../render')).renderPdf;

  it('renders when the page it wanted is the page it got', async () => {
    mockGoto.mockResolvedValue({ status: () => 200 });
    mockPageUrl.mockReturnValue(WANTED);
    const renderPdf = await load();

    const bytes = await renderPdf(WANTED, 'session=x');
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('refuses a redirect to a sign-in wall instead of rendering it', async () => {
    // Vercel's SSO answers 200 from its own origin after the redirect, which is
    // why a status check alone would not have caught this.
    mockGoto.mockResolvedValue({ status: () => 200 });
    mockPageUrl.mockReturnValue('https://vercel.com/sso-api?url=whatever');
    const renderPdf = await load();

    await expect(renderPdf(WANTED, 'session=x')).rejects.toThrow('redirected to');
    expect(mockPdf).not.toHaveBeenCalled();
  });

  it('refuses an error page', async () => {
    mockGoto.mockResolvedValue({ status: () => 404 });
    mockPageUrl.mockReturnValue(WANTED);
    const renderPdf = await load();

    await expect(renderPdf(WANTED, 'session=x')).rejects.toThrow('returned 404');
    expect(mockPdf).not.toHaveBeenCalled();
  });

  /**
   * The session goes into the browser's cookie jar, not onto a header.
   *
   * A header set via `setExtraHTTPHeaders` stops being what identifies the
   * request as soon as anything issues a `Set-Cookie` on a redirect, which
   * Vercel's protection bypass does by design. The symptom was the print page
   * redirecting to `/sign-in`, because Clerk saw no session.
   */
  it('puts the caller session in the cookie jar, scoped to the deployment', async () => {
    mockGoto.mockResolvedValue({ status: () => 200 });
    mockPageUrl.mockReturnValue(WANTED);
    const renderPdf = await load();

    await renderPdf(WANTED, '__session=abc; __client_uat=123');

    expect(mockSetCookie).toHaveBeenCalledWith(
      { name: '__session', value: 'abc', domain: 'speclr.example', path: '/' },
      { name: '__client_uat', value: '123', domain: 'speclr.example', path: '/' },
    );
  });

  it('survives a cookie value containing an equals sign', async () => {
    mockGoto.mockResolvedValue({ status: () => 200 });
    mockPageUrl.mockReturnValue(WANTED);
    const renderPdf = await load();

    // Base64 session values routinely end in padding, and splitting on every
    // '=' rather than the first would truncate the session.
    await renderPdf(WANTED, '__session=aGVsbG8=');

    expect(mockSetCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: '__session', value: 'aGVsbG8=' }),
    );
  });

  it('closes the browser even when it refuses', async () => {
    mockGoto.mockResolvedValue({ status: () => 403 });
    mockPageUrl.mockReturnValue(WANTED);
    const renderPdf = await load();

    await expect(renderPdf(WANTED, 'session=x')).rejects.toThrow();
    // A leaked browser process holds ~1GB and outlives the request.
    expect(mockClose).toHaveBeenCalled();
  });
});
