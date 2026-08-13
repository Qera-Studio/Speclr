import type { Metadata } from 'next';
import NavIndexRoute from '../../_routes/NavIndexRoute';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

/**
 * `/admin/docs` — the admin document types.
 *
 * Sits alongside `docs/[id]`, which serves both a type's list and one document.
 * Next resolves the bare segment here, so the three do not collide.
 */
export default function AdminDocumentsPage() {
  return <NavIndexRoute profile="admin" section="documents" />;
}
