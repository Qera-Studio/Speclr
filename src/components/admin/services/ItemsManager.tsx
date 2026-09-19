'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AddButton } from '@/components/ui/add-button';
import RecordPanel from '../RecordPanel';
import { useRecordPanel } from '../useRecordPanel';
import ItemForm from './ItemForm';
import ItemsTable from './ItemsTable';
import { archiveServiceItem } from '@/server/actions/services';
import type { ContractService } from '@/lib/domain/service';
import type { ServiceItem } from '@/lib/domain/serviceItem';

/**
 * A Service's items: the table, the panel that edits one, and the archive.
 *
 * The same arrangement as `EmployeeManager`, and for the same reason. The rail
 * is **non-blocking**, so the table stays readable while an item is open and a
 * reader can go straight from one row to the next; `guardedSelect` is what
 * stops that convenience throwing away what was typed.
 *
 * This replaced `ItemsEditor`, a stack of fieldsets that posted all 52 items on
 * every save. Two things were wrong with it: nothing could be scanned, because
 * every row was three inputs tall whether or not anybody was editing it, and
 * saving one rate rewrote the whole list, so two people editing different items
 * would each overwrite the other. `saveServiceItem` posts one item.
 */
export default function ItemsManager({ service }: { service: ContractService }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  const {
    editing,
    open,
    guardedSelect,
    onDone,
    dirtyProps,
    pendingDiscard,
    confirmDiscard,
    cancelDiscard,
  } = useRecordPanel<ServiceItem & { id: string }>();

  const all = service.items ?? [];
  const archivedCount = all.filter((item) => item.archived).length;
  // Archived items keep their id and stay readable, but leave the list unless
  // asked for: the ordinary reason to open this page is the live catalogue.
  const rows = showArchived ? all : all.filter((item) => !item.archived);

  const onArchive = (item: ServiceItem, archived: boolean) =>
    startTransition(async () => {
      const result = await archiveServiceItem(service.code, item.id, archived);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to archive the item.');
        return;
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p aria-label="Item count" className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
          {archivedCount > 0 ? (
            <>
              {', '}
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="underline underline-offset-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                {showArchived ? 'hide' : 'show'} {archivedCount} archived
              </button>
            </>
          ) : null}
        </p>
        <AddButton variant="outline" onClick={() => guardedSelect(null)}>
          Add item
        </AddButton>
      </div>

      <ItemsTable
        items={rows}
        onEdit={(item) => guardedSelect(item as ServiceItem & { id: string })}
        onArchive={onArchive}
        isActive={(item) => item.id === editing?.id}
      />

      <RecordPanel
        title={editing ? editing.name : 'Add item'}
        open={open}
        dirtyProps={dirtyProps}
        pendingDiscard={pendingDiscard}
        onConfirmDiscard={confirmDiscard}
        onCancelDiscard={cancelDiscard}
      >
        {/* `key` remounts the form so react-hook-form re-reads defaultValues:
            without it, switching items would show the previous one's values. */}
        <ItemForm
          key={editing?.id ?? 'new'}
          code={service.code}
          item={editing}
          onDone={onDone}
        />
      </RecordPanel>

      {/* The archive runs in a transition, so the table is briefly stale. */}
      <span aria-live="polite" className="sr-only">
        {pending ? 'Saving' : ''}
      </span>
    </div>
  );
}
