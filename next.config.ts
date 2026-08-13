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

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return LEGACY_REDIRECTS.map((r) => ({ ...r, permanent: false }));
  },
};

export default nextConfig;
