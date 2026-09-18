import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import ComponentLibrary from '@/components/library/ComponentLibrary';

export const metadata: Metadata = {
  title: 'Components — speclr',
  robots: { index: false, follow: false },
};

// The session cookie must be read on every request. Nothing else here is
// dynamic: the library reads no table and belongs to no client.
export const dynamic = 'force-dynamic';

/**
 * The component library: every component the app uses, with every variant, live.
 *
 * Authorization is enforced at the resource like every other page here, even
 * though this one holds no data. It is internal tooling on an internal tool, and
 * the floor is that a page verifies the session itself rather than trusting a
 * layout to have done it (`AGENTS.md`, auth rules).
 *
 * **No `PageBody`.** Every other page in the shell sits in that 36px inset,
 * and this one deliberately does not: its left rail is a full-height column
 * against the inset card's own edge, the way the nav is against the frame. An
 * inset here would draw a second border a few pixels inside the card's and
 * float the rail in the middle of nothing.
 */
export default async function LibraryPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  return (
    // `useSearchParams` needs a boundary, and the fallback is the empty frame
    // rather than a spinner: the rail and the pane are laid out before anything
    // is known, so a skeleton would be a second layout to keep in step.
    <Suspense fallback={<div className="h-full w-full" />}>
      <ComponentLibrary />
    </Suspense>
  );
}
