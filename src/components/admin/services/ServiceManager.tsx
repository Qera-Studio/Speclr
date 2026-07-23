'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceTemplate | null>(null);
  const [deleting, setDeleting] = useState<ServiceTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDone = () => {
    setOpen(false);
    router.refresh();
  };

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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add service
        </Button>
      </div>

      <ServicesTable
        services={services}
        onEdit={(service) => {
          setEditing(service);
          setOpen(true);
        }}
        onDelete={(service) => setDeleting(service)}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit service' : 'Add service'}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <ServiceForm key={editing?.id ?? 'new'} service={editing} onDone={onDone} />
          </div>
        </SheetContent>
      </Sheet>

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
