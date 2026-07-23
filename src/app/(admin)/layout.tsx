import type { Metadata } from 'next';
import { currentUser } from '@clerk/nextjs/server';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: 'speclr',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Nav visibility only — each page and Server Action still enforces auth itself.
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';

  if (!user) {
    // Not signed in: no shell. The page's own requireAuthorizedUser() redirects.
    return <main id="main-content">{children}</main>;
  }

  return (
    <SidebarProvider>
      <AdminSidebar email={email} />
      <SidebarInset id="main-content">
        <div className="flex items-center gap-2 border-b border-border p-2 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-medium">speclr</span>
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
