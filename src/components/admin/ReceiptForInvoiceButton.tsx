'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReceiptIndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createReceiptForInvoice } from '@/server/actions/documents';
import { useProfile } from '@/lib/useProfile';

/**
 * One click from the last invoice issued to a receipt that settles it.
 *
 * Receipting the invoice just raised is the common case, and doing it by hand
 * means re-picking the client and re-typing every line. The draft it opens is
 * fully editable — a receipt may settle only part of an invoice.
 */
export default function ReceiptForInvoiceButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string;
  invoiceNumber: string;
}) {
  const router = useRouter();
  const profile = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const onClick = async () => {
    setError(null);
    setCreating(true);
    const result = await createReceiptForInvoice(invoiceId);
    setCreating(false);
    if (!result.success || !result.id) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    router.push(`/${profile}/docs/${result.id}`);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button type="button" variant="outline" onClick={onClick} pending={creating}>
        <ReceiptIndianRupee aria-hidden="true" />
        {`Receipt for ${invoiceNumber}`}
      </Button>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
