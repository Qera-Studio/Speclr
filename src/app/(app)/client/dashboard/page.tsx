import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { LayoutDashboard } from 'lucide-react';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { PageBody, PageHeader } from '@/components/admin/Page';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { NAV_BY_PROFILE } from '@/components/admin/nav';

export const metadata: Metadata = {
  title: 'Dashboard — speclr',
  robots: { index: false, follow: false },
};

// The session cookie must be read on every request. Nothing else here is
// dynamic yet: the page reads no table until there is something to summarise.
export const dynamic = 'force-dynamic';

/**
 * The client dashboard — the slot, named and reachable, with nothing in it.
 *
 * It was a tab over the documents list, which had one page answering to two
 * names. A rail row is what it actually is, so it is a route like every other
 * destination on that rail.
 *
 * Authorization is enforced AT THE RESOURCE like every other page here, even
 * though this one shows nothing: the rule is the boundary, not the payload, and
 * an exception made while a page is empty is an exception still standing the
 * day it fills up.
 */
export default async function DashboardPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    <PageBody>
      {/* The rail's own label, so the page name and the row that leads here
          cannot drift. `?? 'Dashboard'` rather than an assertion: `dashboard`
          is optional on `ProfileNav` because the admin side has none. */}
      <PageHeader title={NAV_BY_PROFILE.client.dashboard?.label ?? 'Dashboard'} />
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutDashboard />
          </EmptyMedia>
          <EmptyTitle>The dashboard is not built yet</EmptyTitle>
          <EmptyDescription>
            It arrives when there is enough issued to summarise. Until then the
            Documents page is the whole picture.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </PageBody>
  );
}
