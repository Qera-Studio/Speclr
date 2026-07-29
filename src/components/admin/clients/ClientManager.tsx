'use client';

import { Button } from '@/components/ui/button';
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
      <div className="flex justify-end">
        <Button onClick={() => guardedSelect(null)}>Add client</Button>
      </div>

      <ClientsTable clients={clients} onEdit={(client) => guardedSelect(client)} />

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
