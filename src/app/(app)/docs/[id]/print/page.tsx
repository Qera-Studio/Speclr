import { notFound, redirect } from 'next/navigation';
import { legacyDocProfile } from '../../../_routes/legacyDocs';

// Looks a document up, so it can never be static.
export const dynamic = 'force-dynamic';

/** Pre-split `/docs/<id>/print` — forwarded to whichever profile owns it. */
export default async function LegacyPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await legacyDocProfile(id);
  if (!profile) notFound();
  redirect(`/${profile}/docs/${id}/print`);
}
