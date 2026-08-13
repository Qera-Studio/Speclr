import type { Metadata } from 'next';
import HomeRoute from '../_routes/HomeRoute';

export const metadata: Metadata = {
  title: 'Client — speclr',
  robots: { index: false, follow: false },
};

// Session cookie must be read on every request; document list is live data.
export const dynamic = 'force-dynamic';

export default function Page() {
  return HomeRoute({ profile: 'client' });
}
