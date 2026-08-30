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

jest.mock('puppeteer-core', () => ({
  launch: async () => ({
    newPage: async () => ({
      setExtraHTTPHeaders: jest.fn(),
      goto: mockGoto,
      url: mockPageUrl,
      waitForSelector: jest.fn().mockRejectedValue(new Error('no marker')),
      pdf: mockPdf,
    }),
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

  it('closes the browser even when it refuses', async () => {
    mockGoto.mockResolvedValue({ status: () => 403 });
    mockPageUrl.mockReturnValue(WANTED);
    const renderPdf = await load();

    await expect(renderPdf(WANTED, 'session=x')).rejects.toThrow();
    // A leaked browser process holds ~1GB and outlives the request.
    expect(mockClose).toHaveBeenCalled();
  });
});
