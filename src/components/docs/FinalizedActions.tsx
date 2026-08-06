'use client';

import { useState } from 'react';
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
    router.push(`/docs/${result.id}`);
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
    router.push('/');
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
    router.push(`/docs/${result.id}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/docs/${docId}/print`} className={buttonVariants({ variant: 'outline' })}>
          Open print view
        </Link>
        {/* The primary action on a slip is next month's slip — correcting an
            issued one is the rarer case. */}
        {isSlip ? (
          <Button type="button" onClick={onCopyNextMonth} disabled={copying}>
            {copying ? 'Copying…' : 'Copy for next month'}
          </Button>
        ) : null}
        <Button
          type="button"
          variant={isSlip ? 'outline' : 'default'}
          onClick={onDuplicate}
          disabled={duplicating}
        >
          {duplicating ? 'Duplicating…' : 'Duplicate as new draft'}
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
