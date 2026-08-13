import { notFound, redirect } from 'next/navigation';
import { DOC_TYPE_BY_SLUG } from '@/lib/domain/registry';
import { profileOfDocType } from '@/lib/profile';

/** Pre-split `/docs/new/<slug>` — forwarded to whichever profile owns the type. */
export default async function LegacyNewDocumentPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const spec = DOC_TYPE_BY_SLUG[type];
  if (!spec) notFound();
  redirect(`/${profileOfDocType(spec.code)}/docs/new/${type}`);
}
