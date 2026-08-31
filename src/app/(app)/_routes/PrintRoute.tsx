import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { profileOfDocType, type Profile } from '@/lib/profile';
import { getDocument, getStudioSettings } from '@/db/store';
import { DOC_TYPES, isSlip } from '@/lib/domain/registry';
import { docFilename } from '@/lib/domain/docFilename';
import type { AdminDocument, LetterDocument } from '@/lib/domain/types';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import { ContractPrint } from '@/components/docs/ContractPages';
import { QuotationPrint } from '@/components/docs/QuotationPages';
import LetterSheet from '@/components/docs/sheets/LetterSheet';
import SlipSheet from '@/components/docs/sheets/SlipSheet';
import PrintToolbar from '@/components/docs/PrintToolbar';
import '@/styles/print.css';

/**
 * `/<profile>/docs/<id>/print` — the print view.
 *
 * Shared by both profiles' route files; see `DocumentRoute` for why.
 */

function isLetter(doc: AdminDocument): doc is LetterDocument {
  return doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT';
}

export default async function PrintRoute({
  params,
  profile,
}: {
  params: Promise<{ id: string }>;
  profile: Profile;
}) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const { id } = await params;
  const stored = await getDocument(id);
  if (!stored) notFound();

  // Same forwarding rule as the document route — a print link that was mailed
  // out keeps working after the split.
  const docProfile = profileOfDocType(stored.type);
  if (docProfile !== profile) redirect(`/${docProfile}/docs/${stored.id}/print`);

  // A finalized document prints the studio details frozen onto it; a draft has
  // none yet, so it prints the live settings — matching what the editor preview
  // showed. The cast restores the discriminated union that the spread widens;
  // the shape is unchanged, only one optional field is filled in.
  const doc: AdminDocument = stored.studioSnapshot
    ? stored
    : ({ ...stored, studioSnapshot: await getStudioSettings() } as AdminDocument);

  const spec = DOC_TYPES[doc.type];

  // One home for what a document is called, shared with the stored PDF's
  // download header — see `domain/docFilename.ts`.
  const fileName = docFilename(doc);

  const shell = (sheet: React.ReactNode) => (
    <main className="doc-print-page">
      <h1 className="sr-only">
        Print view — {spec.label} {doc.number ?? 'draft'}
      </h1>
      <div data-print-hidden>
        <PrintToolbar backHref={`/${profile}/docs/${doc.id}`} fileName={fileName} />
      </div>
      <div className="doc-sheet-wrap">{sheet}</div>
    </main>
  );

  // Sequential returns so each branch narrows `doc`; HR/contract before the
  // financial fallthrough (which needs `doc` narrowed to Invoice|Receipt).
  if (isSlip(doc)) return shell(<SlipSheet doc={doc} />);
  if (isLetter(doc)) return shell(<LetterSheet doc={doc} />);
  // The contract prints the same packed pages the preview shows — same blocks,
  // same measuring, same packer — so paper and screen cannot break differently.
  if (doc.type === 'CON') return shell(<ContractPrint doc={doc} />);
  if (doc.type === 'SQ') return shell(<QuotationPrint doc={doc} />);
  return shell(<DocumentSheet doc={doc} />);
}
