import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAuthorizedUser } from '@/lib/auth/session';
import { listClients, listEmployees, listServices } from '@/db/store';
import { DOC_TYPE_BY_SLUG } from '@/lib/domain/registry';
import DocumentEditor from '@/components/docs/editors/DocumentEditor';
import ContractEditor from '@/components/docs/editors/ContractEditor';
import LetterEditor from '@/components/docs/editors/LetterEditor';
import StipendEditor from '@/components/docs/editors/StipendEditor';

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

  // ── HR documents (employee-based) ──────────────────────────────
  if (spec.code === 'STP') {
    const employees = await listEmployees();
    return <StipendEditor employees={employees} title={title} />;
  }
  if (spec.code === 'OFR' || spec.code === 'EXP' || spec.code === 'EXIT') {
    const employees = await listEmployees();
    return <LetterEditor type={spec.code} employees={employees} title={title} />;
  }

  // ── Client-based documents ─────────────────────────────────────
  const clients = await listClients();
  if (spec.code === 'CON') {
    const services = await listServices();
    return <ContractEditor clients={clients} services={services} title={title} />;
  }

  return <DocumentEditor typeCode={spec.code} clients={clients} title={title} />;
}
