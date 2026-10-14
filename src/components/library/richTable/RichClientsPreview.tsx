'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ClientRowMenu } from '@/components/admin/clients/ClientRowMenu';
import type { DayRates } from '@/lib/domain/currency';
import type { ClientRecord } from '@/lib/domain/types';
import { deleteClientAction, setClientArchivedAction } from '@/server/actions/clients';
import RichClientTable from './RichClientTable';
import type { RichClientRow } from './rows';

/**
 * The temporary preview page's table, with the real row menu.
 *
 * `ClientRowMenu` and the two server actions are the clients list's own, with
 * the same failure toasts and the same Undo on archive (`ClientManager`), so
 * the column at the right end does exactly what it does there. What it leaves
 * out is the optimistic update: this page lists tens of rows and simply
 * re-reads after a write.
 */
export default function RichClientsPreview({
  clients,
  rows,
  rates,
}: {
  clients: ClientRecord[];
  rows: RichClientRow[];
  rates: DayRates | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const recordOf = new Map(clients.map((client) => [client.id, client]));

  const onDelete = (client: ClientRecord) =>
    startTransition(async () => {
      const result = await deleteClientAction(client.id);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete client.', { duration: 10000 });
        return;
      }
      router.refresh();
    });

  const onArchive = (client: ClientRecord, next: boolean) =>
    startTransition(async () => {
      const result = await setClientArchivedAction(client.id, next);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to update client.', { duration: 10000 });
        return;
      }
      router.refresh();
      toast(`${client.name} ${next ? 'archived' : 'restored'}`, {
        action: { label: 'Undo', onClick: () => onArchive(client, !next) },
      });
    });

  return (
    <RichClientTable
      rows={rows}
      rates={rates}
      actions={(row) => {
        const client = recordOf.get(row.id);
        return client ? (
          <ClientRowMenu
            client={client}
            archived={client.archived ?? false}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ) : null;
      }}
    />
  );
}
