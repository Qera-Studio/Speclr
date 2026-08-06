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

/** Wider than the nav — it holds full form fields, not links. */
export const EDITOR_RAIL_WIDTH = 384;

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

  const { setHost, count, title, open, setOpen, requestClose } = panel;
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
      <SidebarHeader className="flex-row items-center justify-between gap-2 px-3 py-2">
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
    </Sidebar>
  );
}
