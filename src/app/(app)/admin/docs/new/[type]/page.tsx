import type { Metadata } from 'next';
import NewDocumentRoute from '../../../../_routes/NewDocumentRoute';

export const metadata: Metadata = {
  title: 'New document — speclr',
  robots: { index: false, follow: false },
};

// Session cookie + live lists must be read on every request.
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ type: string }> }) {
  return NewDocumentRoute({ params, profile: 'admin' });
}
