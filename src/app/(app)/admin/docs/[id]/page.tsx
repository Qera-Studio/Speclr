import type { Metadata } from 'next';
import DocumentRoute from '../../../_routes/DocumentRoute';

export const metadata: Metadata = {
  title: 'Document — speclr',
  robots: { index: false, follow: false },
};

// Session cookie + live document must be read on every request.
export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return DocumentRoute({ params, profile: 'admin' });
}
