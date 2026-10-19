'use client';

import { useState } from 'react';
import { Download, Lock, Printer } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  copySlipForNextMonth,
  deleteDraftAction,
  duplicateDocument,
} from '@/server/actions/documents';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/patterns/ConfirmAction';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DEV_UNLIMITED } from '@/lib/devMode';
import { useProfile } from '@/lib/useProfile';

/**
 * Action row for finalized (immutable) documents: print, or copy as a new draft.
 *
 * A slip gets a second copy action. The two are not the same thing and must not
 * be one button: **Duplicate** keeps the wage month, which is how a mistake in
 * an issued slip gets corrected; **Next month** moves it forward, which is how
 * the following month's slip gets made. A correction that landed silently in
 * the wrong month would be very hard to spot afterwards.
 *
 * It renders in two places, and `onPrint` is what tells them apart. In the
 * editor rail there is a print view to go *to*, so the row offers a link to it.
 * On the print view itself that link would point at the page it is already on,
 * so the caller passes its own print handler and a download instead, and this
 * component prints those in the same row as everything else. The sealed card,
 * Duplicate and the dev-only Delete are identical either way: they are facts
 * about the document, not about which page is showing it.
 */
export default function FinalizedActions({
  docId,
  isSlip = false,
  onPrint,
  onDownload,
  downloading = false,
  onDownloadSupplierCopy,
  downloadingSupplierCopy = false,
  actionsOnly = false,
  sealedCard,
}: {
  docId: string;
  /** Slips cover a month, so only they can be copied forward into the next one. */
  isSlip?: boolean;
  /**
   * Supplied by the print view. Its presence is what swaps the "Open print
   * view" link for Print and Download, because it means this row is already on
   * that view.
   */
  onPrint?: () => void;
  onDownload?: () => void;
  downloading?: boolean;
  /**
   * An issued invoice's duplicate, marked for the supplier (Rule 48(1)). The
   * stored PDF stays the recipient's original; this is rendered on request.
   */
  onDownloadSupplierCopy?: () => void;
  downloadingSupplierCopy?: boolean;
  /**
   * Render the buttons without the sealed card, for a caller that places the
   * two in different parts of the page.
   *
   * The print view does: its actions belong up on the app header's row beside
   * the pager, and the card belongs across the top of the document underneath.
   * They stay one component because they are one set of facts about one
   * document, and the alternative — a second row of buttons written out in the
   * print toolbar — is how the two came to disagree in the first place.
   */
  actionsOnly?: boolean;
  /** The card alone, for the same caller, rendered where it belongs. */
  sealedCard?: boolean;
}) {
  const router = useRouter();
  const profile = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [copying, setCopying] = useState(false);

  const onCopyNextMonth = async () => {
    setError(null);
    setCopying(true);
    const result = await copySlipForNextMonth(docId);
    setCopying(false);
    if (!result.success || !result.id) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    router.push(`/${profile}/docs/${result.id}`);
  };

  // Pre-launch only: sample finalizes need clearing out. `DEV_UNLIMITED` is
  // inlined at build time, so this button is not in the production bundle.
  const onDelete = async () => {
    setError(null);
    const result = await deleteDraftAction(docId);
    if (!result.success) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    router.push(`/${profile}`);
  };

  const onDuplicate = async () => {
    setError(null);
    setDuplicating(true);
    const result = await duplicateDocument(docId);
    setDuplicating(false);
    if (!result.success || !result.id) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    router.push(`/${profile}/docs/${result.id}`);
  };

  /*
    Immutability, said out loud.
    The rail on a finalized document is the same rail as a draft's with the
    editing taken out, and absence is not a message: a missing form reads as
    "still loading" or "this build is broken" as readily as "this is
    sealed". CGST s.36 keeps this record unaltered for 72 months, and the
    way a correction is made (a fresh draft, not an edit) is the sentence
    that has to be on screen before somebody goes looking for an edit
    button that will never be there.
  */
  const card = (
    <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-meta text-muted-foreground">
      <Lock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-medium text-foreground">Finalized and sealed.</span> This document is
        a permanent record and cannot be edited or deleted. Correct it by duplicating it as a new
        draft.
      </p>
    </div>
  );

  // The card on its own, for a caller placing it away from the buttons. It
  // carries no error slot because it triggers nothing that can fail.
  if (sealedCard) return card;

  return (
    <div className={actionsOnly ? 'contents' : 'flex flex-col gap-3'}>
      {actionsOnly ? null : card}
      <div className="flex flex-wrap items-center gap-2">
        {onPrint ? (
          <>
            {/* Download leads and is the only blue in the row: it is the
                ordinary action on an issued document and needs nothing from the
                reader, while Print opens a dialog somebody then has to answer.
                Print and Duplicate are solid too, in ink rather than blue, so
                the row reads as one primary among three solid actions instead
                of three competing ones. */}
            {onDownload ? (
              <Button variant="primary" type="button" onClick={onDownload} pending={downloading}>
                <Download aria-hidden="true" />
                Download PDF
              </Button>
            ) : null}
            {onDownloadSupplierCopy ? (
              <Button
                type="button"
                variant="secondary"
                onClick={onDownloadSupplierCopy}
                pending={downloadingSupplierCopy}
              >
                <Download aria-hidden="true" />
                Supplier&apos;s copy
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={onPrint}>
              <Printer aria-hidden="true" />
              Print
            </Button>
          </>
        ) : (
          <Link
            href={`/${profile}/docs/${docId}/print`}
            className={buttonVariants({ variant: 'secondary' })}
          >
            Open print view
          </Link>
        )}
        {/* The primary action on a slip is next month's slip — correcting an
            issued one is the rarer case. */}
        {isSlip ? (
          <Button variant="primary" type="button" onClick={onCopyNextMonth} pending={copying}>
            Copy for next month
          </Button>
        ) : null}
        {/*
          Duplicate is the primary action only where nothing outranks it. In the
          editor rail it is the one thing you can do to a sealed document, so it
          is blue. On the print view Download is that action, so this steps all
          the way down to an outline: it is the rarest of the three (a
          correction, not an ordinary read of an issued document), and three
          solid buttons in a row is three things asking to be pressed.
        */}
        <Button
          type="button"
          variant={isSlip || onPrint ? 'secondary' : 'primary'}
          onClick={onDuplicate}
          pending={duplicating}
        >
          Duplicate as new draft
        </Button>
        {DEV_UNLIMITED ? (
          <ConfirmActionButton
            label="Delete (dev only)"
            title="Delete this finalized document?"
            description="Testing escape hatch — finalized documents are permanent in production. This deletes the record entirely and cannot be undone."
            confirmLabel="Delete"
            variant="destructive"
            confirmVariant="destructive"
            onConfirm={onDelete}
          />
        ) : null}
      </div>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
