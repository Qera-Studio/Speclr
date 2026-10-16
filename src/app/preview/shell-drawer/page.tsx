import { notFound } from 'next/navigation';
import AdminShell from '@/components/shell/AdminShell';
import ClauseLibrary from '@/components/admin/clauses/ClauseLibrary';
import { PageBody } from '@/components/patterns/Page';
import { MSA_CLAUSES } from '@/lib/domain/contract/msa';

/**
 * `/preview/shell-drawer` — a page-level drawer inside the real shell.
 *
 * Its own route rather than a table added to `/preview/shell`, which was tried
 * first and reverted. Six other specs measure that fixture, and a second table
 * on it made the page heavy enough that first-hit compiles started overrunning
 * the 5s expect timeout under four workers, which turned an unrelated
 * date-picker test red. A fixture shared by seven specs is a fixture nobody can
 * add to.
 *
 * What only this can measure: `AdminShell` publishes its inset card through
 * `InsetProvider`, so a drawer opened from deep inside a page is contained by
 * it without being handed anything (`docs/design.md` §2.11).
 * `/preview/clause-library` has no shell, so it renders the window fallback and
 * would pass whichever way the containment was wired.
 *
 * **Not in production**, like its siblings. The clauses are `MSA_CLAUSES`,
 * public contract boilerplate rather than anybody's data.
 */
export const metadata = {
  title: 'Preview — speclr',
  robots: { index: false, follow: false },
};

export default function ShellDrawerPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }} defaultOpen>
      <PageBody>
        <ClauseLibrary
          clauses={MSA_CLAUSES.slice(0, 6).map((clause, i) => ({
            ...clause,
            archived: i === 2,
          }))}
          stored
        />
      </PageBody>
    </AdminShell>
  );
}
