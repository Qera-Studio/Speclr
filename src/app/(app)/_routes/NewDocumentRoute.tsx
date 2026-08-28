import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { profileOfDocType, type Profile } from '@/lib/profile';
import {
  getStudioSettings,
  listClauses,
  listClients,
  listEmployees,
  listClientInputs,
  listExclusions,
  listServices,
} from '@/db/store';
import { MSA_CLAUSES } from '@/lib/domain/contract/msa';
import { DOC_TYPE_BY_SLUG } from '@/lib/domain/registry';
import DocumentEditor from '@/components/docs/editors/DocumentEditor';
import ContractEditor from '@/components/docs/editors/ContractEditor';
import LetterEditor from '@/components/docs/editors/LetterEditor';
import SlipEditor from '@/components/docs/editors/SlipEditor';
import QuotationEditor from '@/components/docs/editors/QuotationEditor';

/**
 * `/<profile>/docs/new/<slug>` — a blank editor for one document type.
 *
 * Shared by both profiles' route files; see `DocumentRoute` for why there are
 * two of those and one of this.
 */

export default async function NewDocumentRoute({
  params,
  profile,
}: {
  params: Promise<{ type: string }>;
  profile: Profile;
}) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const { type } = await params;
  const spec = DOC_TYPE_BY_SLUG[type];
  // Unknown slug, or a type belonging to the other profile — `/client/docs/new/
  // pay-slip` names nothing. Nothing has been written at this point, so there
  // is no draft to forward to.
  if (!spec || profileOfDocType(spec.code) !== profile) notFound();

  // The editors own the full-height workspace layout (preview card + edit
  // rail), so the route adds no wrapper or heading — the title goes into the
  // workspace bar instead.
  const title = `New ${spec.label.toLowerCase()}`;

  // The studio's own details as they stand right now, so the preview shows what
  // the document would actually print. They are frozen onto the document only at
  // finalize — see `studioSnapshot` in types.ts.
  const studio = await getStudioSettings();

  // ── HR documents (employee-based) ──────────────────────────────
  if (spec.code === 'STP' || spec.code === 'PAY') {
    const employees = await listEmployees();
    return (
      <SlipEditor type={spec.code} employees={employees} studio={studio} title={title} />
    );
  }
  if (spec.code === 'OFR' || spec.code === 'EXP' || spec.code === 'EXIT') {
    const employees = await listEmployees();
    return <LetterEditor type={spec.code} employees={employees} studio={studio} title={title} />;
  }

  // ── Client-based documents ─────────────────────────────────────
  //
  // Archived clients are offboarded, so they are not offered on a *new*
  // document. `DocumentRoute` deliberately does not filter: an open draft whose
  // client was archived afterwards must still find them in its own picker, or
  // the next save silently loses the client the draft was written for. Same
  // rule as a saved registration type staying on offer (`CONTEXT.md` §5d-ii).
  const clients = (await listClients()).filter((c) => !c.archived);
  if (spec.code === 'QTN') {
    // A quotation is deliberately not tied to a client record (it is routinely
    // sent pre-onboarding) — `clients` is passed only for the optional
    // "fill from an existing client" autofill, never as a required recipient.
    return (
      <QuotationEditor
        clients={clients}
        services={await listServices()}
        studio={studio}
        title={title}
      />
    );
  }
  if (spec.code === 'CON') {
    const [services, exclusions, clientInputs, clauses] = await Promise.all([
      listServices(),
      listExclusions(),
      listClientInputs(),
      listClauses(),
    ]);
    return (
      <ContractEditor
        clients={clients}
        services={services}
        exclusions={exclusions}
        clientInputs={clientInputs}
        // Passed here and *only* here. A new contract copies the library onto
        // itself; `DocumentRoute` deliberately does not pass it, because an
        // existing document already carries its own copy and handing it a fresh
        // one would rewrite words that may already be relied upon.
        //
        // Falls back to the constant before the table has been seeded — same
        // strategy as `getStudioSettings`, so a fresh database still produces a
        // complete contract.
        clauseLibrary={clauses.length > 0 ? clauses : MSA_CLAUSES}
        studio={studio}
        title={title}
      />
    );
  }

  // The catalogue seeds the retainer lines and fills the add-line menu. Passed
  // to `DocumentRoute` as well, unlike the clause library above: see the note on
  // `DocumentEditorProps.services` for why the two go opposite ways.
  return (
    <DocumentEditor
      typeCode={spec.code}
      clients={clients}
      services={await listServices()}
      studio={studio}
      title={title}
    />
  );
}
