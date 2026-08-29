import 'server-only';

import type { Browser } from 'puppeteer-core';

/**
 * The PDF renderer, and the one seam behind it.
 *
 * **Why a real browser, and not a PDF library.** A contract and a quotation
 * paginate by *measuring boxes after hydration* (`usePagination`), so where a
 * page breaks is decided by a layout engine at runtime, not by anything that
 * can be read off the markup. `renderToStaticMarkup` would hand back the
 * un-paginated flow, which is what `PrintPages` says in its own docstring. A
 * code-based PDF library (jsPDF, @react-pdf/renderer) would be a *second*
 * renderer with a second layout engine, which is two artifacts for one legal
 * document that will eventually disagree. The sheets are pixel-faithful and
 * the e2e suite measures the HTML rendering, so the PDF has to be that same
 * rendering.
 *
 * **Why here rather than at download.** A finalized document is immutable
 * (`CONTEXT.md` §4) and retained 72 months (CGST s.36). Rendering on every
 * click means a Tailwind bump in 2028 quietly produces a different-looking
 * PDF of the same record. So finalize renders once and stores the bytes, and
 * the download serves them. That also keeps Chromium off the hot path: a cold
 * start costs seconds, and it is spent where nobody is waiting.
 *
 * **The swap.** `renderPdf` is the whole surface. Moving to a self-hosted
 * Gotenberg (or anything else) means reimplementing this one function; nothing
 * upstream knows how the bytes were made.
 */

/** A4 at 96dpi, matching `sheets/frame.ts` and `print.css`. */
const A4 = { width: '210mm', height: '297mm' };

/**
 * Launch a browser.
 *
 * Two environments, deliberately different. On Vercel the binary comes from
 * `@sparticuz/chromium`, a stripped and Brotli-compressed build that unpacks
 * into the function's `/tmp` — the only shape that fits under the 250MB
 * function limit. Locally there is no such binary, so we drive whatever Chrome
 * is already installed; the import is dynamic so the serverless bundle never
 * pulls in the dev path and vice versa.
 */
async function launch(): Promise<Browser> {
  const puppeteer = await import('puppeteer-core');

  // `CHROME_PATH` lets a developer point at their own binary; otherwise the
  // conventional install locations per platform.
  const local = process.env.CHROME_PATH ?? localChromePath();
  if (local) {
    return puppeteer.launch({
      executablePath: local,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
  }

  const chromium = (await import('@sparticuz/chromium')).default;
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

/** The conventional Chrome location for this platform, or undefined. */
function localChromePath(): string | undefined {
  // Vercel sets this; there is no system Chrome there, so fall through to the
  // bundled binary rather than probing paths that cannot exist.
  if (process.env.VERCEL) return undefined;
  if (process.platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  if (process.platform === 'linux') return '/usr/bin/google-chrome';
  return undefined;
}

/**
 * Render one URL to PDF bytes.
 *
 * `cookie` is forwarded verbatim onto the request: the print route is behind
 * `requireAuthorizedUser` like every other page, and the browser is a separate
 * HTTP client with no session of its own. Forwarding the caller's own cookie
 * means the renderer sees exactly what that caller may see, and nothing is
 * made publicly fetchable to accommodate it.
 *
 * Throws on any failure. Callers decide what a failure means; at finalize it
 * must never fail the finalize, because the serial is already claimed.
 */
export async function renderPdf(url: string, cookie: string): Promise<Buffer> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    // The cookie header rather than `setCookie`: we are passing through
    // whatever the caller had, without parsing or reshaping it.
    await page.setExtraHTTPHeaders({ cookie });
    // `networkidle0` rather than `load`: fonts arrive after the document does,
    // and a slip rendered in a fallback font wraps differently from the one the
    // e2e suite measured.
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });
    // Pagination runs in a layout effect after hydration. Waiting for the
    // packer's own signal rather than a fixed delay, so a long contract is not
    // cut short and a short invoice is not made to wait.
    await page
      .waitForSelector('[data-paginated="ready"]', { timeout: 15_000 })
      // A sheet that never paginates (invoice, receipt, slip, letter) renders
      // no such marker and is ready as soon as it loaded.
      .catch(() => undefined);

    const bytes = await page.pdf({
      ...A4,
      printBackground: true,
      // The sheets paint their own A4 margins; a second set from the printer
      // would shrink every page.
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    });
    return Buffer.from(bytes);
  } finally {
    // Always: a leaked browser process holds ~1GB and outlives the request.
    await browser.close().catch(() => undefined);
  }
}
