'use client';

import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import SidebarResizeHandle, { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH } from './SidebarResizeHandle';
import type { UserCardUser } from './UserCard';

/**
 * Client shell wrapping the sidebar layout so the sidebar width can be
 * drag-resized live (clamped to the min/max). Width is session-only — it resets
 * to the default on reload (no persistence).
 */
export default function AdminShell({ user, children }: { user: UserCardUser; children: React.ReactNode }) {
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': `${width}px`,
          '--sidebar-width-icon': '2.5rem',
        } as React.CSSProperties
      }
    >
      <AdminSidebar user={user} />
      <SidebarResizeHandle width={width} onWidthChange={setWidth} />
      <SidebarInset id="main-content">
        <AdminHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

export { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH };
