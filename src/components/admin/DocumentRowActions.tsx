'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarPlus, Copy, Download, Pencil, Printer } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { RemoveButton } from '@/components/ui/remove-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  copySlipForNextMonth,
  deleteDraftAction,
  duplicateDocument,
} from '@/server/actions/documents';
import { DELETE_DRAFT_CONSEQUENCE, isSlip } from '@/lib/domain/registry';
import { DEV_UNLIMITED } from '@/lib/devMode';
import { docHref } from '@/lib/profile';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * Per-row actions on the documents list, revealed on hover.
 *
 * A draft can be edited or thrown away; a finalized document can be
 * downloaded, printed or duplicated — it is immutable by design, so there is
 * deliberately no edit here. (`Delete` on a finalized document is the
 * pre-launch escape hatch only; `DEV_UNLIMITED` is inlined at build time, so it
 * is not in the production bundle.)
 *
 * Download and Print are two different jobs and both stay. Download saves the
 * PDF rendered at finalize, with no dialog and under the document's own
 * number, which is what filing one needs. Print opens the browser's dialog,
 * which is what putting one on paper needs.
 *
 * The buttons fade in on hover but are never `display:none` — they stay in the
 * tab order, and `focus-within` on the row reveals them for keyboard users.
 */
export default function DocumentRowActions({ doc }: { doc: AdminDocument }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  /**
   * Fetch the PDF, then hand the bytes to the browser to save.
   *
   * The object URL is revoked immediately after the click: the blob is a
   * client's tax document held in memory, and an un-revoked URL keeps it alive
   * for the life of the tab.
   */
  const onDownload = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/docs/${doc.id}/pdf`);
      if (!response.ok) {
        // The route sends a plain-text reason on a render failure, and 'Not
        // found' on anything else. Either is more use than a saved file.
        toast.error('Could not download the PDF', {
          description: (await response.text()).trim() || `Request failed (${response.status}).`,
        });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // The server's Content-Disposition already names the file; this is what
      // names it when the bytes come from an object URL, which has no headers.
      link.download = `${doc.number ?? doc.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not download the PDF', {
        description: err instanceof Error ? err.message : 'The request did not complete.',
      });
    } finally {
      setBusy(false);
    }
  };

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

  // Refreshed either way: if the delete was refused, the row stays — which is
  // the honest outcome, and better than a row that vanishes optimistically.
  const onDelete = async () => {
    await deleteDraftAction(doc.id);
    router.refresh();
  };

  // `label` is the accessible name (specific); `tooltip` is the on-screen hint
  // (short) — the row already says which document this is.
  const iconLink = (href: string, label: string, tooltip: string, Icon: typeof Printer) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={label}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'icon' }),
              'text-muted-foreground transition-colors hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </Link>
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );

  const isDraft = doc.status === 'draft';

  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
      {isDraft ? (
        iconLink(docHref(doc), 'Edit draft', 'Edit', Pencil)
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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={onDownload}
                  aria-label="Download PDF"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Download aria-hidden="true" className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Download</TooltipContent>
          </Tooltip>
          {/* `auto=1` prints on arrival — from a list row, Print means print.
              The document number in the first column is the way to preview. */}
          {iconLink(docHref(doc, '/print?auto=1'), 'Print', 'Print', Printer)}
          {isSlip(doc) ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    onClick={onCopyNextMonth}
                    aria-label="Copy for next month"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CalendarPlus aria-hidden="true" className="size-4" />
                  </Button>
                }
              />
              <TooltipContent>Copy for next month</TooltipContent>
            </Tooltip>
          ) : null}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy}
                  onClick={onDuplicate}
                  aria-label="Duplicate as new draft"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Copy aria-hidden="true" className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>
        </>
      )}

      {isDraft ? (
        <RemoveButton
          label="Delete draft"
          tooltip="Delete"
          confirmTitle="Delete this draft?"
          confirmDescription={DELETE_DRAFT_CONSEQUENCE}
          onConfirm={onDelete}
        />
      ) : DEV_UNLIMITED ? (
        <RemoveButton
          label="Delete (dev only)"
          tooltip="Delete"
          confirmTitle="Delete this finalized document?"
          confirmDescription="Testing escape hatch — finalized documents are permanent in production. This cannot be undone."
          onConfirm={onDelete}
        />
      ) : null}
    </div>
  );
}
