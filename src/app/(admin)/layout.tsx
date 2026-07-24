import type { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

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

  return (
    <SidebarProvider style={{ '--sidebar-width-icon': '2.5rem' } as React.CSSProperties}>
      <AdminSidebar user={cardUser} />
      <SidebarInset id="main-content">
        <AdminHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
