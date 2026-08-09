import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { getDocument, getStudioSettings } from '@/db/store';
import { DOC_TYPES, isSlip } from '@/lib/domain/registry';
import type { AdminDocument, LetterDocument } from '@/lib/domain/types';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import { ContractPrint } from '@/components/docs/ContractPages';
import LetterSheet from '@/components/docs/sheets/LetterSheet';
import SlipSheet from '@/components/docs/sheets/SlipSheet';
import PrintToolbar from '@/components/docs/PrintToolbar';
import '@/styles/print.css';

export const metadata: Metadata = {
  title: 'Print — speclr',
  robots: { index: false, follow: false },
};

// Session cookie + live document must be read on every request.
export const dynamic = 'force-dynamic';

function isLetter(doc: AdminDocument): doc is LetterDocument {
  return doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT';
}

const slug = (s: string) => s.replace(/\s+/g, '-');

export default async function DocumentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const { id } = await params;
  const stored = await getDocument(id);
  if (!stored) notFound();

  // A finalized document prints the studio details frozen onto it; a draft has
  // none yet, so it prints the live settings — matching what the editor preview
  // showed. The cast restores the discriminated union that the spread widens;
  // the shape is unchanged, only one optional field is filled in.
  const doc: AdminDocument = stored.studioSnapshot
    ? stored
    : ({ ...stored, studioSnapshot: await getStudioSettings() } as AdminDocument);

  const spec = DOC_TYPES[doc.type];

  const shell = (sheet: React.ReactNode, fileName: string) => (
    <main className="doc-print-page">
      <h1 className="sr-only">
        Print view — {spec.label} {doc.number ?? 'draft'}
      </h1>
      <div data-print-hidden>
        <PrintToolbar backHref={`/docs/${doc.id}`} fileName={fileName} />
      </div>
      <div className="doc-sheet-wrap">{sheet}</div>
    </main>
  );

  // Sequential returns so each branch narrows `doc`; HR/contract before the
  // financial fallthrough (which needs `doc` narrowed to Invoice|Receipt).
  if (isSlip(doc)) {
    return shell(
      <SlipSheet doc={doc} />,
      doc.number ?? `${slug(spec.label)}-${slug(doc.employeeSnapshot.name)}-${doc.issueDate}`,
    );
  }
  if (isLetter(doc)) {
    return shell(
      <LetterSheet doc={doc} />,
      `${slug(spec.label)}-${slug(doc.employeeSnapshot.name)}-${doc.issueDate}`,
    );
  }
  // The contract prints the same packed pages the preview shows — same blocks,
  // same measuring, same packer — so paper and screen cannot break differently.
  if (doc.type === 'CON') {
    return shell(
      <ContractPrint doc={doc} />,
      `Contract-${slug(doc.clientSnapshot.name)}-${doc.issueDate}`,
    );
  }
  return shell(<DocumentSheet doc={doc} />, doc.number ?? `${spec.code}-draft`);
}
