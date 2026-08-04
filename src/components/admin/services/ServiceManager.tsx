'use client';

import { useRouter } from 'next/navigation';
import { AddButton } from '@/components/ui/add-button';
import RecordPanel from '../RecordPanel';
import { useRecordPanel } from '../useRecordPanel';
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
  // The row's `RemoveButton` has already confirmed by the time this runs.
  const onDelete = async (service: ServiceTemplate) => {
    await deleteServiceAction(service.id);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* The create CTA lives here whether or not the list is empty — a control
          that moves depending on state is a control you have to look for. */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Services</h1>
        <AddButton onClick={() => guardedSelect(null)}>Add service</AddButton>
      </div>

      <ServicesTable
        services={services}
        onEdit={(service) => guardedSelect(service)}
        onDelete={onDelete}
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
    </div>
  );
}
