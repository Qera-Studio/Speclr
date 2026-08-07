import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { getStudioSettings, listClients, listEmployees, listClientInputs, listExclusions, listServices } from '@/db/store';
import { DOC_TYPE_BY_SLUG } from '@/lib/domain/registry';
import DocumentEditor from '@/components/docs/editors/DocumentEditor';
import ContractEditor from '@/components/docs/editors/ContractEditor';
import LetterEditor from '@/components/docs/editors/LetterEditor';
import SlipEditor from '@/components/docs/editors/SlipEditor';

export const metadata: Metadata = {
  title: 'New document — speclr',
  robots: { index: false, follow: false },
};

// Session cookie + live lists must be read on every request.
export const dynamic = 'force-dynamic';

export default async function NewDocumentPage({ params }: { params: Promise<{ type: string }> }) {
  try {
    await requireAuthorizedUser();
  } catch (err) {
    const reason = err instanceof Error ? err.message : '';
    redirect(reason === 'UNAUTHORIZED' ? '/no-access' : '/sign-in');
  }

  const { type } = await params;
  const spec = DOC_TYPE_BY_SLUG[type];
  if (!spec) notFound();

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
  const clients = await listClients();
  if (spec.code === 'CON') {
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
        studio={studio}
        title={title}
      />
    );
  }

  return <DocumentEditor typeCode={spec.code} clients={clients} studio={studio} title={title} />;
}
