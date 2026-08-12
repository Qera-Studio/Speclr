'use client';

import { ArrowLeft, PanelRight } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { parentHref } from './breadcrumb';
import { useEditorPanel } from './EditorPanel';

/**
 * Wider than the nav (`NAV_WIDTH` in `AdminShell`), because it holds full form
 * fields rather than links. Matching the two was tried and reverted — at the
 * same number the nav looked oversized for a list of short labels.
 *
 * 336 is the floor, and it is arithmetic rather than taste: the rail loses 16px
 * to the inset `p-2` and 32px to `SidebarContent`'s `p-4`, so the `field-group`
 * container is width − 48. `FieldRow` puts two fields side by side at 288px
 * (`@2xs`). Below 336 every paired field in every editor silently stacks — see
 * `field-row.tsx`.
 */
export const EDITOR_RAIL_WIDTH = 352;

/**
 * The app-level edit rail: one right-hand panel shared by every admin page.
 * Document editors fill it with their form; the record pages fill it with the
 * add/edit form that used to open as a screen-darkening modal.
 *
 * It lives under the *same* `SidebarProvider` as the nav but drives its own
 * open state via `Sidebar`'s `state` override, so the two rails collapse
 * independently. For the same reason it must not use `SidebarTrigger` or
 * `SidebarRail` — both toggle the shared nav state through context — hence the
 * plain `Button` below.
 *
 * Collapsed to an icon strip by default. The expand button is disabled when no
 * page content has registered, and says why.
 */
export default function EditorSidebar() {
  const panel = useEditorPanel();
  const router = useRouter();
  const pathname = usePathname();
  if (!panel) return null;

  const { setHost, setFooterHost, count, title, open, setOpen, requestClose } = panel;
  const hasContent = count > 0;
  // A page with nothing editable can't be expanded; collapse if content goes.
  const expanded = open && hasContent;

  return (
    <Sidebar
      side="right"
      variant="inset"
      collapsible="icon"
      state={expanded ? 'expanded' : 'collapsed'}
      style={
        {
          '--sidebar-width': `${EDITOR_RAIL_WIDTH}px`,
          '--sidebar-width-icon': '2.5rem',
        } as React.CSSProperties
      }
    >
      {/*
        The rule matters: a page can put its own back button at the top of the
        panel, and two back arrows stacked with nothing between them read as one
        control that has been drawn twice.
      */}
      <SidebarHeader className="flex-row items-center justify-between gap-2 border-b px-3 py-2 group-data-[collapsible=icon]:border-b-0">
        {/*
          A back arrow, left of the title. There is rarely anywhere to go "back"
          to in a single-page editor, but people reach for one before they reach
          for a collapse icon — the first thing someone shown this rail asked was
          how to go back. It leaves the page, so it confirms first: the draft's
          unsaved edits live in the form, not the server.
        */}
        <div className="flex min-w-0 items-center gap-1 group-data-[collapsible=icon]:hidden">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Go back"
                  className="size-7 shrink-0 text-muted-foreground"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave this page?</AlertDialogTitle>
                <AlertDialogDescription>
                  Anything you have not saved will be lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Stay</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.push(parentHref(pathname))}>
                  Leave
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <span className="truncate text-sm font-semibold">{title ?? 'Edit'}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!hasContent}
          onClick={() => (expanded ? requestClose() : setOpen(true))}
          aria-label={expanded ? 'Collapse edit panel' : 'Expand edit panel'}
          title={hasContent ? undefined : 'No editable content on this page'}
          className="text-muted-foreground"
        >
          <PanelRight className="size-4" />
        </Button>
      </SidebarHeader>

      <SidebarContent className="gap-0 p-4 group-data-[collapsible=icon]:hidden">
        {/* The portal target. Kept mounted so panels can fill it at any time. */}
        <div ref={setHost} data-slot="editor-panel-host" />
      </SidebarContent>

      {/*
        The second target, outside the scroll. `empty:hidden` is what keeps it
        from drawing a bare rule on every page that supplies no footer — the
        node is empty until something is portalled into it, and CSS notices.
      */}
      <div
        ref={setFooterHost}
        data-slot="editor-panel-footer-host"
        className="shrink-0 border-t p-4 empty:hidden group-data-[collapsible=icon]:hidden"
      />
    </Sidebar>
  );
}
