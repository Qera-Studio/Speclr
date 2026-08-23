import { notFound } from 'next/navigation';
import { isSlip } from '@/lib/domain/registry';
import type { AdminDocument, LetterDocument } from '@/lib/domain/types';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import SlipSheet from '@/components/docs/sheets/SlipSheet';
import LetterSheet from '@/components/docs/sheets/LetterSheet';
import { ContractPrint } from '@/components/docs/ContractPages';
import { FIXTURES, isFixture } from './fixtures';
import '@/styles/print.css';

/**
 * `/preview/<fixture>` — a sheet on paper, with no session and no database.
 *
 * This exists because jsdom cannot see a page break or a clipped row, and the
 * pay slip shipped exactly that bug through a green suite (`CONTEXT.md` §6a).
 * The browser tests in `e2e/` measure real boxes, and to do that they need a
 * document on screen. Reaching one the ordinary way would mean a Clerk session
 * and whatever records happen to be in Neon, which is both awkward and
 * non-deterministic; the sheets are pure `data → markup`, so they render just
 * as well from a fixture.
 *
 * **It does not exist in production.** `notFound()` fires before anything is
 * read, so the deployed app has no unauthenticated document route. The data is
 * fabricated in any case: no client, no employee and no studio detail here
 * belongs to a real person.
 */
export const metadata = {
  title: 'Preview — speclr',
  robots: { index: false, follow: false },
};

/** As in `PrintRoute`: a predicate, because a `||` chain does not narrow here. */
const isLetter = (doc: AdminDocument): doc is LetterDocument =>
  doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT';

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ fixture: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();

  const { fixture } = await params;
  if (!isFixture(fixture)) notFound();

  const doc = FIXTURES[fixture]();

  // The same dispatch `PrintRoute` performs, in the same order, so a fixture
  // renders through exactly the component the real print view would reach for.
  const sheet = isSlip(doc) ? (
    <SlipSheet doc={doc} />
  ) : isLetter(doc) ? (
    <LetterSheet doc={doc} />
  ) : doc.type === 'CON' ? (
    <ContractPrint doc={doc} />
  ) : (
    <DocumentSheet doc={doc} />
  );

  return (
    <main className="doc-print-page">
      <div className="doc-sheet-wrap">{sheet}</div>
    </main>
  );
}
