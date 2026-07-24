import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { getDocument, listClients, listEmployees, listServices } from '@/db/store';
import { DOC_TYPES } from '@/lib/domain/registry';
import type { AdminDocument, LetterDocument } from '@/lib/domain/types';
import DocumentEditor from '@/components/docs/editors/DocumentEditor';
import ContractEditor from '@/components/docs/editors/ContractEditor';
import LetterEditor from '@/components/docs/editors/LetterEditor';
import StipendEditor from '@/components/docs/editors/StipendEditor';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import ContractSheet from '@/components/docs/sheets/ContractSheet';
import LetterSheet from '@/components/docs/sheets/LetterSheet';
import StipendSheet from '@/components/docs/sheets/StipendSheet';
import SheetPreview from '@/components/docs/SheetPreview';
import FinalizedActions from '@/components/docs/FinalizedActions';

export const metadata: Metadata = {
  title: 'Document — speclr',
  robots: { index: false, follow: false },
};

// Session cookie + live document must be read on every request.
export const dynamic = 'force-dynamic';

function isLetter(doc: AdminDocument): doc is LetterDocument {
  return doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT';
}

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
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
  const heading =
    doc.status === 'draft'
      ? `Edit ${spec.label.toLowerCase()} draft`
      : `${spec.label} ${doc.number ?? ''}`.trim();

  const page = (body: React.ReactNode) => (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{heading}</h1>
      {body}
    </div>
  );

  // ── Draft → editor ──────────────────────────────────────────────
  if (doc.status === 'draft') {
    if (doc.type === 'STP') {
      const employees = await listEmployees();
      return page(<StipendEditor employees={employees} doc={doc} />);
    }
    if (isLetter(doc)) {
      const employees = await listEmployees();
      return page(<LetterEditor type={doc.type} employees={employees} doc={doc} />);
    }
    const clients = await listClients();
    if (doc.type === 'CON') {
      const services = await listServices();
      return page(<ContractEditor clients={clients} services={services} doc={doc} />);
    }
    return page(<DocumentEditor typeCode={doc.type} clients={clients} doc={doc} />);
  }

  // ── Finalized → read-only sheet + actions (immutable — no edit/delete) ──
  const shell = (sheet: React.ReactNode) =>
    page(
      <>
        <FinalizedActions docId={doc.id} />
        <div>{sheet}</div>
      </>,
    );

  // Sequential returns so each branch narrows `doc`.
  if (doc.type === 'STP') return shell(<SheetPreview><StipendSheet doc={doc} /></SheetPreview>);
  if (isLetter(doc)) return shell(<SheetPreview><LetterSheet doc={doc} /></SheetPreview>);
  // The contract paginates itself into a page carousel (own zoom) — not wrapped.
  if (doc.type === 'CON') return shell(<ContractSheet doc={doc} variant="paged" />);
  return shell(<SheetPreview><DocumentSheet doc={doc} /></SheetPreview>);
}
