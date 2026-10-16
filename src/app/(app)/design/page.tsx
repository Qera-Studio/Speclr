import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import DesignPage from '@/components/design/DesignPage';

export const metadata: Metadata = {
  title: 'Design — speclr',
  robots: { index: false, follow: false },
};

// The session cookie must be read on every request. Nothing else here is
// dynamic: the page reads no table and belongs to no profile.
export const dynamic = 'force-dynamic';

/**
 * The design system: every token, atom, pattern, template and state, live,
 * with the decisions behind them. Profile-neutral, like settings: it is
 * about the app rather than about a client or an employee.
 *
 * Authorization is enforced at the resource like every other page here, even
 * though this one holds no data (`AGENTS.md`, auth rules). **No `PageBody`**:
 * its left rail is a full-height column against the inset card's own edge.
 */
export default async function DesignRoute() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    <Suspense fallback={<div className="h-full w-full" />}>
      <DesignPage />
    </Suspense>
  );
}
