'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Copy, Download, Pencil, Printer, Trash2 } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { RowMenu } from '@/components/patterns/RowMenu';
import {
  copySlipForNextMonth,
  deleteDraftAction,
  duplicateDocument,
} from '@/server/actions/documents';
import { DELETE_DRAFT_CONSEQUENCE, DOC_TYPES, isSlip } from '@/lib/domain/registry';
import { DEV_UNLIMITED } from '@/lib/devMode';
import { useDownloadPdf } from '@/lib/useDownloadPdf';
import { docHref } from '@/lib/profile';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * Per-row actions on the documents list, behind one menu (`RowMenu`).
 *
 * A draft can be edited or thrown away; a finalized document can be
 * downloaded, printed or duplicated. It is immutable by design, so there is
 * deliberately no edit here. (`Delete` on a finalized document is the
 * pre-launch escape hatch only; `DEV_UNLIMITED` is inlined at build time, so it
 * is not in the production bundle.)
 *
 * Download and Print are two different jobs and both stay. Download saves the
 * PDF rendered at finalize, with no dialog and under the document's own
 * number, which is what filing one needs. Print opens the browser's dialog,
 * which is what putting one on paper needs.
 *
 * Edit and Print are real links inside the menu rather than pushes, so
 * middle-click and "copy link" keep working from a menu item. The delete
 * confirm is hoisted beside the menu rather than inside an item, for the
 * reason `RowMenu` gives: a dialog inside an item unmounts with the menu.
 */
export default function DocumentRowActions({ doc }: { doc: AdminDocument }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { download: onDownload, downloading } = useDownloadPdf(doc.id, doc.number);

  const onDuplicate = async () => {
    setBusy(true);
    const result = await duplicateDocument(doc.id);
    setBusy(false);
    if (result.success && result.id) router.push(docHref({ ...doc, id: result.id }));
  };

  // Slips only, and deliberately separate from Duplicate above: this one moves
  // the wage month on, which is next month's slip; Duplicate keeps it, which is
  // how a mistake in an issued one gets corrected.
  const onCopyNextMonth = async () => {
    setBusy(true);
    const result = await copySlipForNextMonth(doc.id);
    setBusy(false);
    if (result.success && result.id) router.push(docHref({ ...doc, id: result.id }));
  };

  // Refreshed either way: if the delete was refused, the row stays, which is
  // the honest outcome, and better than a row that vanishes optimistically.
  const onDelete = async () => {
    await deleteDraftAction(doc.id);
    router.refresh();
  };

  const isDraft = doc.status === 'draft';
  // Names the row for a screen reader: the number where there is one, else
  // what kind of draft this is, since "draft" alone is every unnumbered row.
  const name = doc.number ?? `draft ${DOC_TYPES[doc.type].label.toLowerCase()}`;

  return (
    <>
      <RowMenu label={`More actions for ${name}`}>
        {isDraft ? (
          <DropdownMenuItem render={<Link href={docHref(doc)} />}>
            <Pencil aria-hidden />
            Edit draft
          </DropdownMenuItem>
        ) : (
          <>
            {/*
              Download comes first: it is the ordinary action on an issued
              document, and unlike Print it needs nothing from the reader.

              Fetched rather than a plain `<a download>`, and that is a bug fix.
              A `download` anchor hands the response to the browser whatever it
              is, so a failure was saved to disk as a file named after the last
              path segment: `pdf.txt`, containing an error, looking for all the
              world like a corrupt document. There is no event for it either, so
              nothing could report it. Reading the response here means a failure
              is a message the operator can act on, and a success is still the
              same one-click save under the document's own number.
            */}
            <DropdownMenuItem disabled={downloading} onClick={onDownload}>
              <Download aria-hidden />
              Download PDF
            </DropdownMenuItem>
            {/* `auto=1` prints on arrival: from a list row, Print means print.
                The row itself is the way to preview. */}
            <DropdownMenuItem render={<Link href={docHref(doc, '/print?auto=1')} />}>
              <Printer aria-hidden />
              Print
            </DropdownMenuItem>
            {isSlip(doc) ? (
              <DropdownMenuItem disabled={busy} onClick={onCopyNextMonth}>
                <CalendarPlus aria-hidden />
                Copy for next month
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem disabled={busy} onClick={onDuplicate}>
              <Copy aria-hidden />
              Duplicate as new draft
            </DropdownMenuItem>
          </>
        )}
        {isDraft || DEV_UNLIMITED ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden />
              {isDraft ? 'Delete draft' : 'Delete (dev only)'}
            </DropdownMenuItem>
          </>
        ) : null}
      </RowMenu>

      {/* `AlertDialog`, not `Dialog`: a destructive confirmation, which is the
          house rule (AGENTS.md) and also what puts focus on the cancel and
          traps it until a choice is made. */}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={isDraft ? 'Delete draft' : 'Delete finalized document'}
        consequence={
          isDraft
            ? DELETE_DRAFT_CONSEQUENCE
            : 'Testing escape hatch: finalized documents are permanent in production. This cannot be undone.'
        }
        confirmLabel={isDraft ? 'Delete draft' : 'Delete document'}
        destructive
        onConfirm={onDelete}
      />
    </>
  );
}
