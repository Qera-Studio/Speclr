import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { currentUser } from '@clerk/nextjs/server';
import AdminShell from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Nav visibility only — each page and Server Action still enforces auth itself.
  const user = await currentUser();

  if (!user) {
    // Not signed in: no shell. The page's own requireAuthorizedUser() redirects.
    return <main id="main-content">{children}</main>;
  }

  const email = user.emailAddresses?.[0]?.emailAddress ?? '';
  const cardUser = {
    name: user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(' ') ?? '',
    email,
    imageUrl: user.hasImage ? user.imageUrl : undefined,
  };

  // `SidebarProvider` has always *written* `sidebar_state`; nothing read it, so
  // the rail sprang open again on every full load. Read it here so a collapsed
  // rail is collapsed in the first paint — a client effect would flash.
  const collapsed = (await cookies()).get('sidebar_state')?.value === 'false';

  return (
    <AdminShell user={cardUser} defaultOpen={!collapsed}>
      {children}
    </AdminShell>
  );
}
