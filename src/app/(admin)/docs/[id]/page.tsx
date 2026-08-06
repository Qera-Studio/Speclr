import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import {
  getDocument,
  getLatestFinalizedInvoice,
  getStudioSettings,
  listClients,
  listDocumentsByType,
  listEmployees,
  listServices,
} from '@/db/store';
import { DOC_TYPES, DOC_TYPE_BY_SLUG } from '@/lib/domain/registry';
import type { AdminDocument, LetterDocument } from '@/lib/domain/types';
import DocumentEditor from '@/components/docs/editors/DocumentEditor';
import ContractEditor from '@/components/docs/editors/ContractEditor';
import LetterEditor from '@/components/docs/editors/LetterEditor';
import StipendEditor from '@/components/docs/editors/StipendEditor';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import { contractBlocks, COVER_CLASSNAME } from '@/components/docs/sheets/ContractSheet';
import { letterBlocks, LETTER_COVER_CLASSNAME } from '@/components/docs/sheets/LetterSheet';
import { LETTER_PADDING, LETTER_PADDING_Y } from '@/components/docs/sheets/frame';
import StipendSheet from '@/components/docs/sheets/StipendSheet';
import DocumentTypeList from '@/components/admin/DocumentTypeList';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';
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

  // `/docs/invoice` is the invoice *list*; `/docs/<uuid>` is one document.
  // Sharing the segment keeps both URLs clean, and they can never collide —
  // document ids are UUIDs, and a doc-type slug is never one.
  const listSpec = DOC_TYPE_BY_SLUG[id];
  if (listSpec) {
    // The contract list hosts the services section, so it needs the templates.
    const [documents, latestInvoice, services] = await Promise.all([
      listDocumentsByType(listSpec.code),
      listSpec.code === 'REC' ? getLatestFinalizedInvoice() : Promise.resolve(null),
      listSpec.code === 'CON' ? listServices() : Promise.resolve(null),
    ]);
    return (
      <DocumentTypeList
        spec={listSpec}
        documents={documents}
        latestInvoice={latestInvoice}
        services={services ?? undefined}
      />
    );
  }

  const doc = await getDocument(id);
  if (!doc) notFound();

  const spec = DOC_TYPES[doc.type];
  const heading =
    doc.status === 'draft'
      ? `Edit ${spec.label.toLowerCase()} draft`
      : `${spec.label} ${doc.number ?? ''}`.trim();

  // ── Draft → editor ──────────────────────────────────────────────
  // The editors own the full-height workspace layout; the route adds no wrapper.
  if (doc.status === 'draft') {
    // Drafts have no frozen studio snapshot yet, so the preview reads the live
    // settings — same values the document would print if finalized now.
    const studio = await getStudioSettings();
    if (doc.type === 'STP') {
      const employees = await listEmployees();
      return <StipendEditor employees={employees} doc={doc} studio={studio} title={heading} />;
    }
    if (isLetter(doc)) {
      const employees = await listEmployees();
      return (
        <LetterEditor
          type={doc.type}
          employees={employees}
          doc={doc}
          studio={studio}
          title={heading}
        />
      );
    }
    const clients = await listClients();
    if (doc.type === 'CON') {
      const services = await listServices();
      return (
        <ContractEditor
          clients={clients}
          services={services}
          doc={doc}
          studio={studio}
          title={heading}
        />
      );
    }
    return (
      <DocumentEditor
        typeCode={doc.type}
        clients={clients}
        doc={doc}
        studio={studio}
        title={heading}
      />
    );
  }

  // ── Finalized → read-only sheet + actions (immutable — no edit/delete) ──
  // Same workspace as the editors, but the rail holds actions rather than a
  // form: a finalized document has nothing editable by design.
  const shell = (
    preview: React.ReactNode,
    opts?: {
      coverFirst?: boolean;
      firstPageClassName?: string;
      selfPaddedSheet?: boolean;
      pagePadding?: string;
      pagePaddingY?: number;
    },
  ) => (
    <DocumentWorkspace title={heading} preview={preview} {...opts}>
      <FinalizedActions docId={doc.id} />
    </DocumentWorkspace>
  );

  // Sequential returns so each branch narrows `doc`.
  if (doc.type === 'STP') return shell(<StipendSheet doc={doc} />);
  // Letters feed their block list too, for the same reason as the contract: the
  // monolithic sheet arrives as one over-tall block, gets a single page, and
  // everything past 1123px is clipped — a finalized offer letter previewed as
  // its cover and nothing else. The draft editor was fixed for this; the
  // finalized path was not.
  if (isLetter(doc))
    return shell(letterBlocks(doc), {
      coverFirst: doc.type === 'OFR',
      firstPageClassName: doc.type === 'OFR' ? LETTER_COVER_CLASSNAME : undefined,
      selfPaddedSheet: false,
      // All three letters print the same roomier page. The pair must agree —
      // `pagePaddingY` is the height pagination reserves.
      pagePadding: LETTER_PADDING,
      pagePaddingY: LETTER_PADDING_Y,
    });
  // Contracts feed their flat block list in so the preview can paginate them,
  // with the black cover pinned as its own full-bleed first page.
  if (doc.type === 'CON')
    return shell(contractBlocks(doc), { coverFirst: true, firstPageClassName: COVER_CLASSNAME });
  return shell(<DocumentSheet doc={doc} />);
}
