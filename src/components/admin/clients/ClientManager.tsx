'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ClientForm from './ClientForm';
import ClientsTable from './ClientsTable';
import type { ClientRecord } from '@/lib/domain/types';

export default function ClientManager({ clients }: { clients: ClientRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRecord | null>(null);

  const onDone = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add client
        </Button>
      </div>

      <ClientsTable
        clients={clients}
        onEdit={(client) => {
          setEditing(client);
          setOpen(true);
        }}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit client' : 'Add client'}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ClientForm key={editing?.id ?? 'new'} client={editing} onDone={onDone} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
