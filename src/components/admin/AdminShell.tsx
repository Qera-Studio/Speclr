"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
// Parked: the left nav is fixed-width for now. Kept wired up (and tested) so
// drag-resize can be revived by restoring the width state and the handle below.
// import SidebarResizeHandle from './SidebarResizeHandle';
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
} from "./SidebarResizeHandle";
import { EditorPanelProvider } from "./EditorPanel";
import EditorSidebar from "./EditorSidebar";
import { NewDocumentProvider } from "./NewDocumentCommand";
import type { UserCardUser } from "./UserCard";

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
/**
 * The nav has two widths and toggles between them: this one, and
 * `--sidebar-width-icon` when collapsed.
 *
 * It is a constant on purpose. Sizing the rail from its own content needs a
 * measure-and-write pass, and the panel is `position: fixed` while the space it
 * occupies comes from an empty spacer div — so the two are only ever in step
 * one frame late. Every version of that fought the 200ms collapse transition,
 * which flips `data-collapsible` at once but animates width. A number wide
 * enough for the longest row ("Experience letter", plus the `variant="inset"`
 * gutter) has none of those failure modes. Widen it if a longer label lands.
 *
 * It is deliberately narrower than `EDITOR_RAIL_WIDTH`. Matching the two was
 * tried and reverted: the editor rail holds two-column form fields and needs
 * its width, while this one holds a list of short labels and only looked
 * oversized at the same number. They are not peers — one is navigation, the
 * other is the document being worked on.
 */
const NAV_WIDTH = 224;

export default function AdminShell({
  user,
  children,
}: {
  user: UserCardUser;
  children: React.ReactNode;
}) {
  return (
    <EditorPanelProvider>
      {/* Outside the sidebar so ⌘D and the ⌥ shortcuts work on every admin
          page, including from inside the editor rail. */}
      <NewDocumentProvider>
        <SidebarProvider
          // Lock the whole shell to the viewport height so the page body never
          // scrolls — the rails and the inset frame stay fixed; only the content
          // area inside the inset scrolls.
          className="h-svh min-h-svh overflow-hidden"
          style={
            {
              "--sidebar-width": `${NAV_WIDTH}px`,
              "--sidebar-width-icon": "2.5rem",
            } as React.CSSProperties
          }
        >
          <AdminSidebar user={user} />
          {/* <SidebarResizeHandle width={width} onWidthChange={setWidth} /> */}
          <SidebarInset
            id="main-content"
            insetRight
            className="min-h-0 overflow-hidden"
          >
            <AdminHeader />
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </SidebarInset>
          <EditorSidebar />
        </SidebarProvider>
      </NewDocumentProvider>
    </EditorPanelProvider>
  );
}

export { NAV_WIDTH, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, SIDEBAR_DEFAULT_WIDTH };
