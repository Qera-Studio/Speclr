import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import SitemapChart from '@/components/tools/SitemapChart';

export const metadata: Metadata = {
  title: 'Sitemap chart — speclr',
  robots: { index: false, follow: false },
};

// The session cookie must be read on every request. The page itself holds no
// state and touches no table — the reading happens in `/api/sitemap`.
export const dynamic = 'force-dynamic';

/**
 * A site address → its published sitemap, drawn as a tree.
 *
 * Authorization is enforced AT THE RESOURCE like every other page here. It
 * writes nothing, but it does make our server fetch a URL someone typed, and
 * that is not a capability to leave open to a signed-out visitor.
 */
export default async function SitemapPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Sitemap chart</h1>
        <p className="text-sm text-muted-foreground">
          Reads a site&rsquo;s own <code>sitemap.xml</code> and draws the structure its URLs
          describe — useful for sizing a build or seeing what a client already has. It does not
          crawl: a site that publishes no sitemap gets no chart.
        </p>
      </div>
      <SitemapChart />
    </div>
  );
}
