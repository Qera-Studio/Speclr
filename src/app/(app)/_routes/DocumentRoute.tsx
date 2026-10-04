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
import ContractFlow from '@/components/contract/flow/ContractFlow';
import LetterEditor from '@/components/docs/editors/LetterEditor';
import SlipEditor from '@/components/docs/editors/SlipEditor';
import QuotationEditor from '@/components/docs/editors/QuotationEditor';
import DocumentTypeList from '@/components/admin/DocumentTypeList';

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
    const [documents, latestInvoice, catalogue] = await Promise.all([
      listDocumentsByType(listSpec.code),
      listSpec.code === 'REC' ? getLatestFinalizedInvoice() : Promise.resolve(null),
      // For the Services column: a line names the Service it bills by code.
      listServices(),
    ]);
    return (
      <DocumentTypeList
        spec={listSpec}
        documents={documents}
        latestInvoice={latestInvoice}
        catalogue={catalogue}
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

  // A finalized document opens on the print view, which is what somebody
  // reaching for an issued document actually wants: the pages as they print,
  // with the sealed card and the download beside them. The read-only workspace
  // this used to render offered the same actions over a one-page-at-a-time
  // carousel of a document nobody can change.
  //
  // Here rather than only on the list's link, so every route in lands the same
  // way: ⌘K, the ⌘D palette, a bookmark, a mailed link, the redirect after a
  // duplicate. A rule enforced in one caller is a rule the next caller misses.
  if (doc.status === 'finalized') redirect(`/${docProfile}/docs/${doc.id}/print`);

  const spec = DOC_TYPES[doc.type];
  const heading = `Edit ${spec.label.toLowerCase()} draft`;

  // ── Draft → editor ──────────────────────────────────────────────
  // The only branch left: a finalized document was redirected to its print view
  // above. The editors own the full-height workspace layout; the route adds no
  // wrapper.
  //
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
    // `true`, because the legal frames a Service names through `partCodes` are
    // the 22 Parts, and seeding the 16 sales Services archived every one of
    // them (`CONTEXT.md` §5h). Archived is how a Part says "not sold", not
    // "not law", so the picker still lists the live rows and `copyPart` reads
    // the frames out of the same array. See `frameOf` in `contract/copy.ts`.
    const [all, exclusions, clientInputs] = await Promise.all([
      listServices(true),
      listExclusions(),
      listClientInputs(),
    ]);
    return (
      <ContractFlow
        clients={clients}
        services={all.filter((service) => !service.archived)}
        frames={all}
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
