import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listClauses } from '@/db/store';
import { MSA_CLAUSES } from '@/lib/domain/contract/msa';
import ClauseLibrary from '@/components/admin/clauses/ClauseLibrary';
import { PageBody } from '@/components/patterns/Page';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; the library is live data.
export const dynamic = 'force-dynamic';

/**
 * The Contract Agreement's clause library.
 *
 * On the client side rather than among the admin tools: these are the words a
 * contract is built from, so they belong beside the contracts.
 *
 * Falls back to `MSA_CLAUSES` when the table is empty — the same seeding
 * strategy `getStudioSettings` uses. The page is readable before
 * `scripts/seed-contract.ts` has been run, and shows exactly what a contract
 * would print today, rather than an empty screen that reads as data loss.
 */
export default async function ClauseLibraryPage() {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  // Archived clauses included, unlike everywhere else that reads this table.
  // A contract must never see one; the library must, or archiving would be a
  // deletion that nothing can undo.
  const stored = await listClauses(true);

  return (
    <PageBody>
      <ClauseLibrary
        clauses={
          stored.length > 0
            ? stored
            : MSA_CLAUSES.map((clause) => ({ ...clause, archived: false }))
        }
        stored={stored.length > 0}
      />
    </PageBody>
  );
}
