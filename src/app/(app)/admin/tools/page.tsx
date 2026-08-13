import type { Metadata } from 'next';
import NavIndexRoute from '../../_routes/NavIndexRoute';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

/**
 * `/admin/tools` — the studio's own instruments.
 *
 * Lists more than lives under this path: Icon spec and UI Kit sit at
 * `/admin/spec` and `/admin/kit`. That is why the rail row carries `covers` —
 * without it the row would go dark on two of the four pages it just offered.
 */
export default function AdminToolsPage() {
  return <NavIndexRoute profile="admin" section="Tools" />;
}
