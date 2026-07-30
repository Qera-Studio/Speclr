'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddButton } from '@/components/ui/add-button';
import RecordPanel from '../RecordPanel';
import { useRecordPanel } from '../useRecordPanel';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import ServiceForm from './ServiceForm';
import ServicesTable from './ServicesTable';
import { deleteServiceAction } from '@/server/actions/services';
import type { ServiceTemplate } from '@/lib/domain/serviceTemplate';

export default function ServiceManager({ services }: { services: ServiceTemplate[] }) {
  const router = useRouter();
  const {
    editing,
    open,
    guardedSelect,
    onDone,
    dirtyProps,
    pendingDiscard,
    confirmDiscard,
    cancelDiscard,
  } = useRecordPanel<ServiceTemplate>();
  const [deleting, setDeleting] = useState<ServiceTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    await deleteServiceAction(deleting.id);
    setIsDeleting(false);
    setDeleting(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Services</h1>
        {services.length > 0 ? (
          <AddButton onClick={() => guardedSelect(null)}>Add service</AddButton>
        ) : null}
      </div>

      <ServicesTable
        services={services}
        onEdit={(service) => guardedSelect(service)}
        onAdd={() => guardedSelect(null)}
        onDelete={(service) => setDeleting(service)}
      />

      <RecordPanel
        title={editing ? 'Edit service' : 'Add service'}
        open={open}
        dirtyProps={dirtyProps}
        pendingDiscard={pendingDiscard}
        onConfirmDiscard={confirmDiscard}
        onCancelDiscard={cancelDiscard}
      >
        {/* `key` remounts the form so react-hook-form re-reads defaultValues —
            without it, switching records would show the previous one's values. */}
        <ServiceForm key={editing?.id ?? 'new'} service={editing} onDone={onDone} />
      </RecordPanel>

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleting?.name ?? 'this service'}. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
