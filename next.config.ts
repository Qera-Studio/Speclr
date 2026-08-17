import type { NextConfig } from "next";

/**
 * Pre-split URLs, kept alive.
 *
 * speclr used to be one flat app; it is now two profiles with the profile in
 * the path (`src/lib/profile.ts`). These are the old paths, forwarded — this
 * app issues legal documents, and a bookmarked or emailed link to one must not
 * die because the nav was reorganised.
 *
 * Declarative rather than eleven redirect route files: these are pure
 * source → destination with nothing to look up. The three that *do* need a
 * lookup — `/docs/<uuid>` and friends, where only the database knows which
 * profile a document belongs to — stay as route files under `(app)/docs/`.
 *
 * `permanent: false` (307) on purpose. A 301 is cached by the browser
 * indefinitely, so a wrong guess here would be unfixable without asking every
 * user to clear their cache.
 */
const LEGACY_REDIRECTS = [
  { source: "/clients", destination: "/client/clients" },
  { source: "/employees", destination: "/admin/employees" },
  { source: "/settings", destination: "/admin/settings" },
  { source: "/spec", destination: "/admin/spec" },
  { source: "/kit", destination: "/admin/kit" },
  { source: "/tools/ctc", destination: "/admin/tools/ctc" },
  { source: "/tools/sitemap", destination: "/admin/tools/sitemap" },
  // `/services` pointed at the contract list only because the catalogue lived
  // as a section of it. Now that the catalogue has its own page, this forwards
  // to what the URL always meant.
  { source: "/services", destination: "/client/services" },
];

/** The origins Clerk serves from. Dev keys resolve to `*.clerk.accounts.dev`;
 *  a production instance is a subdomain of our own domain, which `'self'` does
 *  not cover. */
const CLERK = "https://*.clerk.accounts.dev https://*.clerk.com https://clerk.speclr.qera.studio";

/**
 * Content-Security-Policy.
 *
 * ## Why there is no nonce, which is the interesting part
 *
 * The textbook policy for Next is `script-src 'nonce-{x}' 'strict-dynamic'`,
 * built in the proxy because a nonce is per-request. That was built, deployed
 * locally and measured. It does not work on this stack, for two reasons found
 * in the served HTML rather than guessed at:
 *
 * 1. **Clerk's script tag carries no nonce.** It is emitted by Clerk, not by
 *    Next's renderer, so Next never stamps it. Under `'strict-dynamic'` a host
 *    allowlist is *ignored by specification*, so `https://*.clerk.accounts.dev`
 *    would not save it: the script is blocked and authentication is gone.
 * 2. **`next-themes` emits an un-nonced inline script** to set the theme class
 *    before paint. Same outcome, plus a flash of the wrong theme.
 *
 * A nonce also cannot coexist with `'unsafe-inline'`: when a browser sees a
 * nonce it ignores `'unsafe-inline'` entirely. So it is one or the other, and
 * the nonce is the one that breaks sign-in.
 *
 * ## What this policy is worth, stated honestly
 *
 * `'unsafe-inline'` on `script-src` means this does not stop injected inline
 * script. **Nothing in this app can inject one** — React escapes every
 * interpolation and no raw-HTML escape hatch is used anywhere in `src/` — so
 * the primitive this gives up is one that is already unreachable. What it does
 * buy is real and is the part worth having:
 *
 * - **A host allowlist for script.** A payload that did somehow land cannot
 *   pull its second stage from an attacker's domain.
 * - **`connect-src`** — and this is the one that matters most here. Exfiltration
 *   needs somewhere to send the data. A client's PAN, GSTIN and registered
 *   address cannot be POSTed anywhere but us and Clerk.
 * - **`base-uri 'self'`** — an injected `<base>` silently repoints every
 *   relative URL on the page, form posts included. Most often omitted, and it
 *   is what turns a small injection into a credential redirect.
 * - **`form-action`**, **`frame-ancestors 'none'`**, **`object-src 'none'`**.
 *
 * `style-src` keeps `'unsafe-inline'` because the Paginator sets measured A4
 * page geometry as inline style attributes, which no nonce can cover.
 *
 * **Verify in a browser after changing this.** jsdom cannot see a blocked
 * script. The pass is: sign in, open a document editor, print preview, the icon
 * tool, and an attachment download, with the console open.
 */
/**
 * `'unsafe-eval'` in development only, and never in a build that ships.
 *
 * React's development build uses dynamic code evaluation to reconstruct a
 * callstack from another environment, which is what the console error under a
 * policy without it is reporting. Turning the whole header off locally would
 * mean the CSP is only ever exercised in production, which is the one place a
 * mistake in it is expensive; keeping the policy and widening this single
 * directive means every other line below is still tested every time the app is
 * opened. React never reaches for it in a production build.
 *
 * `NODE_ENV` is set by Next itself (`development` for `next dev`, `production`
 * for `next build`), so this cannot be widened by an env var someone sets.
 */
const DEV_ONLY = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

/**
 * The one path that is legitimately framed.
 *
 * An attachment's preview is the document's own first page, and the browser's
 * built-in PDF viewer is the only thing here that can draw one without shipping
 * pdf.js and a worker. It renders in an `<iframe>`, so this route alone gets
 * `frame-ancestors 'self'` — us, and nobody else. Everything that serves a
 * *page* stays `'none'`: the clickjacking risk is a control being clicked
 * through, and this route streams bytes with no controls on it at all.
 */
const FILE_ROUTE = "/api/clients/:id/files/:fileId";

const CSP = (frameAncestors: string) => [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV_ONLY} ${CLERK}`,
  "style-src 'self' 'unsafe-inline'",
  // `data:` for the icon tool's generated previews and the employee UPI QR,
  // `blob:` for the object URLs that tool creates before a download.
  "img-src 'self' data: blob: https://img.clerk.com",
  "font-src 'self' data:",
  `connect-src 'self' ${CLERK}`,
  // Clerk's bot-protection challenge renders in a Turnstile frame.
  `frame-src 'self' ${CLERK} https://challenges.cloudflare.com`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  `frame-ancestors ${frameAncestors}`,
  `form-action 'self' ${CLERK}`,
  "upgrade-insecure-requests",
].join("; ");

/**
 * Security headers, on every response.
 *
 * speclr had none of these. It is an invite-only internal tool, which lowers
 * the odds of an attack but not the cost of one: the pages behind this header
 * hold a third party's PAN, GSTIN and registered address, and the documents are
 * retained 72 months under CGST s.36.
 */
const SECURITY_HEADERS = (frameAncestors: string, frameOptions: string) => [
  { key: "Content-Security-Policy", value: CSP(frameAncestors) },
  /**
   * Clickjacking. `frame-ancestors` in the CSP is the modern equivalent and is
   * also set; this is the fallback for anything that does not honour it. Only
   * `FILE_ROUTE` is ever legitimately framed, and then only by us.
   */
  { key: "X-Frame-Options", value: frameOptions },
  /**
   * Stops the browser second-guessing a Content-Type. Load-bearing for
   * `/api/clients/[id]/files/[fileId]`, which streams a third party's identity
   * documents: the type there is sniffed from the bytes server-side, and this
   * keeps the browser from overriding that with a guess of its own.
   */
  { key: "X-Content-Type-Options", value: "nosniff" },
  /**
   * A document URL contains its id. Send the full path to ourselves, the origin
   * only to anyone else, and nothing at all over plaintext.
   */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /**
   * Deny the hardware and ambient APIs outright. speclr uses none of them, and
   * an unused permission is only ever a liability.
   */
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "usb=()",
      "xr-spatial-tracking=()",
      // Chrome ships FLoC/Topics on by default. This is an internal tool; its
      // page visits are not advertising signal.
      "browsing-topics=()",
      "interest-cohort=()",
    ].join(", "),
  },
  /**
   * Two years, subdomains included, preload-eligible. Vercel terminates TLS, so
   * this only ever hardens what is already HTTPS. Harmless on localhost, where
   * browsers ignore HSTS from a plaintext origin.
   */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  /**
   * Isolate the browsing context. `same-origin` on the opener kills
   * `window.opener` reach-back; `require-corp` is deliberately NOT set, because
   * it would break Clerk's cross-origin resources for no gain here.
   */
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The version banner is free reconnaissance. Nothing reads it.
  poweredByHeader: false,
  experimental: {
    // Attachments upload through a Server Action, and the default cap is 1 MB,
    // well under the 25 MB `MAX_ATTACHMENT_BYTES` allows, so a real MSA failed
    // at the framework before the size check ever saw it. Set just above that
    // limit, for the multipart envelope and the other form fields riding along.
    // The real check stays server-side in `uploadClientAttachment`.
    //
    // This is the *framework's* limit, not the platform's: Vercel's serverless
    // functions reject a request body over 4.5 MB before Next runs. Uploading
    // a 25 MB file in production needs a client-direct upload to Blob, which
    // `ROADMAP.md` records.
    serverActions: { bodySizeLimit: '26mb' },
    // And the *second* limit, which is the one that actually truncated an MSA.
    // `src/proxy.ts` runs on every request, so Next clones each body for it
    // through `getCloneableBody`, capped at 10 MB by default. Past that it
    // pushes `null` into both streams and logs a warning: the request is not
    // rejected, it is silently cut short, and the action downstream sees a
    // half-finished multipart body ("Unexpected end of form"). Raised to match.
    proxyClientMaxBodySize: '26mb',
  },
  async redirects() {
    return LEGACY_REDIRECTS.map((r) => ({ ...r, permanent: false }));
  },
  async headers() {
    return [
      // Ordered, and the second source excludes the first: two entries matching
      // one path would emit two `X-Frame-Options`, which browsers resolve as
      // the strictest, silently undoing the exception.
      { source: FILE_ROUTE, headers: SECURITY_HEADERS("'self'", "SAMEORIGIN") },
      {
        source: "/((?!api/clients/[^/]+/files/).*)",
        headers: SECURITY_HEADERS("'none'", "DENY"),
      },
    ];
  },
};

export default nextConfig;
