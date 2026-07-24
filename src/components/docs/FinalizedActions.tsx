'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { duplicateDocument } from '@/server/actions/documents';
import { Button, buttonVariants } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** Action row for finalized (immutable) documents: print, or duplicate as a new draft. */
export default function FinalizedActions({ docId }: { docId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);

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
      </div>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
