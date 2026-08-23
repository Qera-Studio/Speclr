import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import SitemapChart from '@/components/tools/SitemapChart';
import { PageBody, PageHeader } from '@/components/admin/Page';

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
    <PageBody>
      <PageHeader
        title="Sitemap chart"
        description={
          <>
            Reads a site&rsquo;s own <code>sitemap.xml</code> and draws the structure its URLs
            describe, which is useful for sizing a build or seeing what a client already has. It
            does not crawl: a site that publishes no sitemap gets no chart.
          </>
        }
      />
      <SitemapChart />
    </PageBody>
  );
}
