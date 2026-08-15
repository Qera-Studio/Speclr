'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, Plus } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import ClientsTable from './ClientsTable';
import { deleteClientAction } from '@/server/actions/clients';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * The clients list.
 *
 * Adding and editing both go to `/client/clients/[id]`, the seven-step
 * onboarding surface, rather than to a form in the editor rail. The rail form
 * was deleted with it — a 384px rail cannot hold tax registration, four
 * contacts, commercial terms and a file list, and keeping a short version
 * beside the long one means a quick edit silently ignores every section it
 * doesn't know about.
 *
 * A link rather than a button, because these are now real URLs: onboarding a
 * client is a task people get interrupted during, and a page you can bookmark
 * and come back to is the point.
 */
export default function ClientManager({ clients }: { clients: ClientRecord[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  /**
   * The row's `RemoveButton` has already confirmed by the time this runs — but
   * confirming is not the same as being allowed. A client that has ever been on
   * a document is refused server-side, so the refusal has to land somewhere the
   * operator can read it rather than disappearing into a resolved promise.
   */
  const onDelete = async (client: ClientRecord) => {
    setError(null);
    const result = await deleteClientAction(client.id);
    if (!result.success) {
      setError(result.error ?? 'Failed to delete client.');
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* The create CTA lives here whether or not the list is empty — a control
          that moves depending on state is a control you have to look for. */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/client/clients/new" className={buttonVariants({ size: 'sm' })}>
          <Plus className="h-4 w-4" aria-hidden />
          Add client
        </Link>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}

      <ClientsTable clients={clients} onDelete={onDelete} />
    </div>
  );
}
