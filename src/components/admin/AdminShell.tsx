'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
// Parked: the left nav is fixed-width for now. Kept wired up (and tested) so
// drag-resize can be revived by restoring the width state and the handle below.
// import SidebarResizeHandle from './SidebarResizeHandle';
import { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH } from './SidebarResizeHandle';
import { EditorPanelProvider } from './EditorPanel';
import EditorSidebar from './EditorSidebar';
import type { UserCardUser } from './UserCard';

/**
 * The admin layout: nav on the left, one floating content card in the middle,
 * and the shared editor rail on the right.
 *
 * All three live under a single `SidebarProvider`. That provider owns one open
 * state, which the nav uses; the editor rail drives its own via `Sidebar`'s
 * `state` override so the two collapse independently (see `EditorSidebar`).
 *
 * The nav is fixed at the narrow width for now — `SidebarResizeHandle` is
 * parked, not deleted.
 */
export default function AdminShell({ user, children }: { user: UserCardUser; children: React.ReactNode }) {
  return (
    <EditorPanelProvider>
      <SidebarProvider
        // Lock the whole shell to the viewport height so the page body never
        // scrolls — the rails and the inset frame stay fixed; only the content
        // area inside the inset scrolls.
        className="h-svh min-h-svh overflow-hidden"
        style={
          {
            '--sidebar-width': `${SIDEBAR_MIN_WIDTH}px`,
            '--sidebar-width-icon': '2.5rem',
          } as React.CSSProperties
        }
      >
        <AdminSidebar user={user} />
        {/* <SidebarResizeHandle width={width} onWidthChange={setWidth} /> */}
        <SidebarInset id="main-content" insetRight className="min-h-0 overflow-hidden">
          <AdminHeader />
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
        <EditorSidebar />
      </SidebarProvider>
    </EditorPanelProvider>
  );
}

export { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH };
