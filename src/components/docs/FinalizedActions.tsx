'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteDraftAction, duplicateDocument } from '@/server/actions/documents';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DEV_UNLIMITED } from '@/lib/devMode';

/** Action row for finalized (immutable) documents: print, or duplicate as a new draft. */
export default function FinalizedActions({ docId }: { docId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

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
        <Button type="button" onClick={onDuplicate} disabled={duplicating}>
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
