import 'server-only';

import { headers } from 'next/headers';
import { docHref } from '@/lib/profile';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * The absolute print URL a headless browser should fetch for one document.
 *
 * Absolute because the renderer is a separate HTTP client with no notion of
 * "this site"; the profile-correct path itself comes from `docHref`, so the
 * PDF cannot be rendered from a URL the app would not serve.
 *
 * The origin is read from the incoming request rather than from a configured
 * base URL, so preview deployments render themselves rather than production.
 * `VERCEL_PROJECT_PRODUCTION_URL` is the fallback for a context with no
 * request headers.
 */
export async function printUrlFor(doc: AdminDocument): Promise<string> {
  const h = await headers();
  const host = h.get('host') ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!host) throw new Error('No host to render from');
  // A local dev server is plain http; everything else is https. `x-forwarded-proto`
  // is what Vercel sets, and is trusted here only to choose a scheme for a
  // request we are making to ourselves.
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const url = new URL(`${proto}://${host}${docHref(doc, '/print')}`);

  /**
   * Preview deployments sit behind Vercel's own SSO wall, which intercepts
   * *before* Next runs. The renderer is a second HTTP client carrying the
   * caller's Clerk cookie and nothing else, so on a preview it was served
   * `302 -> vercel.com/sso-api` and rendered a login page.
   *
   * `VERCEL_AUTOMATION_BYPASS_SECRET` is Vercel's answer for exactly this: a
   * per-project token that lets a machine through the protection. It is set
   * automatically on protected deployments and absent in production and locally,
   * where there is no wall to get past, so this appends nothing there.
   *
   * The query parameter form is used rather than the header, because the bypass
   * must survive the redirect chain Chrome follows, and `setExtraHTTPHeaders`
   * would also leak the secret to any third-party resource the page requests.
   */
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) {
    url.searchParams.set('x-vercel-protection-bypass', bypass);
    url.searchParams.set('x-vercel-set-bypass-cookie', 'true');
  }

  return url.toString();
}
