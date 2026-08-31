import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { profileOfDocType, type Profile } from '@/lib/profile';
import {
  getDocument,
  getLatestFinalizedInvoice,
  getStudioSettings,
  listClients,
  listDocumentsByType,
  listEmployees,
  listClientInputs, listExclusions, listServices,
} from '@/db/store';
import { DOC_TYPES, DOC_TYPE_BY_SLUG, isSlip } from '@/lib/domain/registry';
import type { AdminDocument, LetterDocument } from '@/lib/domain/types';
import DocumentEditor from '@/components/docs/editors/DocumentEditor';
import ContractEditor from '@/components/docs/editors/ContractEditor';
import LetterEditor from '@/components/docs/editors/LetterEditor';
import SlipEditor from '@/components/docs/editors/SlipEditor';
import QuotationEditor from '@/components/docs/editors/QuotationEditor';
import DocumentSheet from '@/components/docs/sheets/DocumentSheet';
import { ContractWorkspace } from '@/components/docs/ContractPages';
import { QuotationWorkspace } from '@/components/docs/QuotationPages';
import { letterBlocks, LETTER_COVER_CLASSNAME } from '@/components/docs/sheets/LetterSheet';
import { LETTER_PADDING, LETTER_PADDING_Y } from '@/components/docs/sheets/frame';
import SlipSheet from '@/components/docs/sheets/SlipSheet';
import DocumentTypeList from '@/components/admin/DocumentTypeList';
import DocumentWorkspace from '@/components/docs/DocumentWorkspace';
import FinalizedActions from '@/components/docs/FinalizedActions';

/**
 * `/<profile>/docs/<id>` — one document, or a document type's list.
 *
 * Shared by both profiles' route files, which differ only in the `profile` they
 * pass. The two copies exist so the router can 404 a wrong-profile URL without
 * a guard of our own; everything that actually renders lives here, once.
 */

function isLetter(doc: AdminDocument): doc is LetterDocument {
  return doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT';
}

export default async function DocumentRoute({
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

  // `/client/docs/invoice` is the invoice *list*; `/client/docs/<uuid>` is one
  // document. Sharing the segment keeps both URLs clean, and they can never
  // collide — document ids are UUIDs, and a doc-type slug is never one.
  const listSpec = DOC_TYPE_BY_SLUG[id];
  if (listSpec) {
    // A type belongs to exactly one profile, so `/client/docs/pay-slip` names
    // nothing. 404 rather than redirect: unlike a document id, a slug under the
    // wrong prefix is a typo or a stale link, not a thing that moved.
    if (profileOfDocType(listSpec.code) !== profile) notFound();
    const [documents, latestInvoice] = await Promise.all([
      listDocumentsByType(listSpec.code),
      listSpec.code === 'REC' ? getLatestFinalizedInvoice() : Promise.resolve(null),
    ]);
    return (
      <DocumentTypeList
        spec={listSpec}
        documents={documents}
        latestInvoice={latestInvoice}
      />
    );
  }

  const doc = await getDocument(id);
  if (!doc) notFound();

  // A real document asked for under the wrong prefix is forwarded, not 404'd.
  // These links get emailed and bookmarked, and a dead link to an issued
  // invoice is a worse answer than a redirect.
  const docProfile = profileOfDocType(doc.type);
  if (docProfile !== profile) redirect(`/${docProfile}/docs/${doc.id}`);

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
    if (isSlip(doc)) {
      const employees = await listEmployees();
      return (
        <SlipEditor
          type={doc.type}
          employees={employees}
          doc={doc}
          studio={studio}
          title={heading}
        />
      );
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
    if (doc.type === 'SQ') {
      return (
        <QuotationEditor
          clients={clients}
          services={await listServices()}
          doc={doc}
          studio={studio}
          title={heading}
        />
      );
    }
    if (doc.type === 'CON') {
      const [services, exclusions, clientInputs] = await Promise.all([
        listServices(),
        listExclusions(),
        listClientInputs(),
      ]);
      return (
        <ContractEditor
          clients={clients}
          services={services}
          exclusions={exclusions}
          clientInputs={clientInputs}
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
        services={await listServices()}
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
      <FinalizedActions docId={doc.id} isSlip={isSlip(doc)} />
    </DocumentWorkspace>
  );

  // Sequential returns so each branch narrows `doc`.
  if (isSlip(doc)) return shell(<SlipSheet doc={doc} />);
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
  // The quotation is dark on every page, not just a cover, so it goes through
  // its own client component too — see `QuotationPages`.
  if (doc.type === 'SQ')
    return (
      <QuotationWorkspace doc={doc} title={heading}>
        <FinalizedActions docId={doc.id} isSlip={false} />
      </QuotationWorkspace>
    );
  // The contract carries a running header and footer, so its chrome has to be
  // built inside a client component — see `ContractPages`. Same workspace, same
  // actions rail.
  if (doc.type === 'CON')
    return (
      <ContractWorkspace doc={doc} title={heading}>
        <FinalizedActions docId={doc.id} isSlip={false} />
      </ContractWorkspace>
    );
  return shell(<DocumentSheet doc={doc} />);
}
