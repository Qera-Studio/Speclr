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
  return `${proto}://${host}${docHref(doc, '/print')}`;
}
