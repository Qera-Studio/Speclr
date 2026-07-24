import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { getDocument } from '@/db/store';
import { DOC_TYPES } from '@/lib/domain/registry';
import type { AdminDocument, LetterDocument } from '@/lib/domain/types';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import ContractSheet from '@/components/docs/sheets/ContractSheet';
import LetterSheet from '@/components/docs/sheets/LetterSheet';
import StipendSheet from '@/components/docs/sheets/StipendSheet';
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
  const doc = await getDocument(id);
  if (!doc) notFound();

  const spec = DOC_TYPES[doc.type];

  const shell = (sheet: React.ReactNode, fileName: string) => (
    <main id="main-content" className="doc-print-page">
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
  if (doc.type === 'STP') {
    return shell(
      <StipendSheet doc={doc} />,
      doc.number ?? `Stipend-${slug(doc.employeeSnapshot.name)}-${doc.issueDate}`,
    );
  }
  if (isLetter(doc)) {
    return shell(
      <LetterSheet doc={doc} />,
      `${slug(spec.label)}-${slug(doc.employeeSnapshot.name)}-${doc.issueDate}`,
    );
  }
  if (doc.type === 'CON') {
    return shell(
      <ContractSheet doc={doc} />,
      `Contract-${slug(doc.clientSnapshot.name)}-${doc.issueDate}`,
    );
  }
  return shell(<DocumentSheet doc={doc} />, doc.number ?? `${spec.code}-draft`);
}
