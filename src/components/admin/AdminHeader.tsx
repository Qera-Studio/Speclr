"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import { breadcrumbForPath, isPrimaryPath, parentHref } from "./breadcrumb";
import { usePageHeaderSlot } from "./PageHeaderSlot";

/**
 * One row across the top of the content panel: back, where you are, and
 * whatever the page puts beside it.
 *
 * It was two rows and part of a third. The breadcrumbs were here; the document
 * title and its pager were a second bar inside the page (`DocumentWorkspaceBar`,
 * now gone); the back arrow was a third, in the editor rail's own header a
 * column to the right. Three bands stacked down the top of one screen, each
 * saying a different part of "which document is this and where did it come
 * from". They are one line now, read left to right: back, the trail, the pager.
 *
 * The title is not here: it names what the rail is editing, so it prints on the
 * rail's own row (`EditorSidebar`), which is the column it belongs to. What
 * arrives by portal through `PageHeaderSlot` is the autosave line and the pager,
 * because the page owns that state and the header does not know what a document
 * is.
 *
 * `h-12`, the nav header's height. The shell's three columns each carry one row
 * across the top and they are levelled against the nav, which is where every
 * other measurement up here already comes from.
 *
 * Still not a bar: no border, no background, no blur. `TopPanel` draws the only
 * horizontal rule up here, and a second one 36px under it was what made this
 * read as chrome stacked on chrome.
 */
export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const slot = usePageHeaderSlot();
  const primary = isPrimaryPath(pathname);

  // A page the nav links to directly has nothing to say here: the rail is
  // already showing where you are, and there is nowhere above it to go back to.
  // The portal host goes with it, which is safe because a document is always a
  // secondary route — every one of them is reached through its type's list.
  if (primary) return null;

  const crumbs = breadcrumbForPath(pathname);

  return (
    <header
      data-print-hidden
      // `h-12`, the nav header's height, so the three columns' top rows are one
      // band across the shell. `px-2` for the same reason: the nav's header and
      // its rows both sit in 8px, so the back button's box starts where the nav
      // rows' boxes start rather than a pixel column of its own.
      className="z-30 flex h-12 shrink-0 items-center gap-2 px-2"
    >
      {/*
        Back leaves the page, and a draft's unsaved edits live in the form
        rather than on the server, so it asks first. This is the rail's old
        arrow, moved: same confirmation, same destination, now at the head of
        the row it belongs to rather than in a column to the right of it.

        It carries its label as text. An arrow alone is the most easily
        mistaken control in the app: it sat one row above a pager whose own
        arrows move between pages, and the two meant different kinds of "back".
      */}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              // A resting `bg-accent`, not only a hover one. It is the row's
              // one control among breadcrumb text, and a ghost button with no
              // fill reads as another crumb until the pointer finds it.
              className="shrink-0 bg-accent text-muted-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back
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

      <nav aria-label="Breadcrumb" className="min-w-0 shrink">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li
                key={`${crumb.label}-${i}`}
                className="flex items-center gap-1.5"
              >
                {/* A slash, not a chevron. The row now holds three separate
                    arrow glyphs (back, and the pager's two), and a fourth
                    pointing the same way as the trail read as another control
                    rather than as punctuation between two words. */}
                {i > 0 && (
                  <span className="shrink-0 opacity-40" aria-hidden="true">
                    /
                  </span>
                )}
                {isLast ? (
                  <span
                    className="truncate font-medium text-foreground"
                    aria-current="page"
                  >
                    {crumb.label}
                  </span>
                ) : crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="truncate transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate">{crumb.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* The page's own content: the document title, then its pager hard
          against the right edge. Empty on every page that portals nothing,
          where it is an unfilled flex child and draws nothing. */}
      <div
        ref={slot?.setHost}
        data-slot="page-header-host"
        className="flex min-w-0 flex-1 items-center gap-3"
      />
    </header>
  );
}
