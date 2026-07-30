'use client';

import { AddButton } from '@/components/ui/add-button';
import RecordPanel from '../RecordPanel';
import { useRecordPanel } from '../useRecordPanel';
import ClientForm from './ClientForm';
import ClientsTable from './ClientsTable';
import type { ClientRecord } from '@/lib/domain/types';

export default function ClientManager({ clients }: { clients: ClientRecord[] }) {
  const {
    editing,
    open,
    guardedSelect,
    onDone,
    dirtyProps,
    pendingDiscard,
    confirmDiscard,
    cancelDiscard,
  } = useRecordPanel<ClientRecord>();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Clients</h1>
        {clients.length > 0 ? (
          <AddButton onClick={() => guardedSelect(null)}>Add client</AddButton>
        ) : null}
      </div>

      <ClientsTable
        clients={clients}
        onEdit={(client) => guardedSelect(client)}
        onAdd={() => guardedSelect(null)}
      />

      <RecordPanel
        title={editing ? 'Edit client' : 'Add client'}
        open={open}
        dirtyProps={dirtyProps}
        pendingDiscard={pendingDiscard}
        onConfirmDiscard={confirmDiscard}
        onCancelDiscard={cancelDiscard}
      >
        {/* `key` remounts the form so react-hook-form re-reads defaultValues —
            without it, switching records would show the previous one's values. */}
        <ClientForm key={editing?.id ?? 'new'} client={editing} onDone={onDone} />
      </RecordPanel>
    </div>
  );
}
