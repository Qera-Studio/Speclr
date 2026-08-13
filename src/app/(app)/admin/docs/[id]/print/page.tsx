import type { Metadata } from 'next';
import PrintRoute from '../../../../_routes/PrintRoute';

export const metadata: Metadata = {
  title: 'Print — speclr',
  robots: { index: false, follow: false },
};

// Session cookie + live document must be read on every request.
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return PrintRoute({ params, profile: 'admin' });
}
