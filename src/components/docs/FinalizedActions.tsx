'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  copySlipForNextMonth,
  deleteDraftAction,
  duplicateDocument,
} from '@/server/actions/documents';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
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
 */
export default function FinalizedActions({
  docId,
  isSlip = false,
}: {
  docId: string;
  /** Slips cover a month, so only they can be copied forward into the next one. */
  isSlip?: boolean;
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

  return (
    <div className="flex flex-col gap-3">
      {/*
        Immutability, said out loud.
        The rail on a finalized document is the same rail as a draft's with the
        editing taken out, and absence is not a message: a missing form reads as
        "still loading" or "this build is broken" as readily as "this is
        sealed". CGST s.36 keeps this record unaltered for 72 months, and the
        way a correction is made (a fresh draft, not an edit) is the sentence
        that has to be on screen before somebody goes looking for an edit
        button that will never be there.
      */}
      <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        <Lock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-medium text-foreground">Finalized and sealed.</span> This document
          is a permanent record and cannot be edited or deleted. Correct it by duplicating it as a
          new draft.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/${profile}/docs/${docId}/print`} className={buttonVariants({ variant: 'outline' })}>
          Open print view
        </Link>
        {/* The primary action on a slip is next month's slip — correcting an
            issued one is the rarer case. */}
        {isSlip ? (
          <Button type="button" onClick={onCopyNextMonth} pending={copying}>
            Copy for next month
          </Button>
        ) : null}
        <Button
          type="button"
          variant={isSlip ? 'outline' : 'default'}
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
