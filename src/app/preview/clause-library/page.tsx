import { notFound } from 'next/navigation';
import { MSA_CLAUSES, MSA_CLAUSE_SUMMARIES } from '@/lib/domain/contract/msa';
import ClauseLibrary from '@/components/admin/clauses/ClauseLibrary';
import { PageBody } from '@/components/admin/Page';

/**
 * `/preview/clause-library` — the clause table and its drawer, with no session
 * and no database.
 *
 * The same reason the sheet fixtures next door exist: `e2e/clause-library.spec.ts`
 * measures real boxes, and two of the bugs it guards are invisible to jsdom (a
 * click that misses the row's target, and a textarea that pushes the drawer's
 * footer off the bottom). Reaching the real page would mean a Clerk session and
 * whatever happens to be in Neon; the component is a pure function of its
 * props, so it renders just as well from the code copy.
 *
 * **It does not exist in production**, like its siblings. The clauses here are
 * `MSA_CLAUSES`, which is public contract boilerplate, not anybody's data.
 */
export const metadata = {
  title: 'Preview — speclr',
  robots: { index: false, follow: false },
};

export default function ClauseLibraryPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <PageBody>
      <ClauseLibrary
        // Clause 1 first, because its definitions are the longest text the
        // drawer ever holds and therefore the measurement that matters. One
        // archived row, so the restore action is on screen too.
        // Summaries too, from the same seed the database takes them from, or
        // the Description column would measure as empty on every row.
        clauses={MSA_CLAUSES.slice(0, 6).map((clause, i) => ({
          ...clause,
          summary: MSA_CLAUSE_SUMMARIES[clause.number],
          archived: i === 2,
        }))}
        stored
      />
    </PageBody>
  );
}
