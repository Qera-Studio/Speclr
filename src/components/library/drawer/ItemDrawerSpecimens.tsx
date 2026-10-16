'use client';

import { useState } from 'react';
import { AddButton } from '@/components/patterns/AddAction';
import { ArchiveButton } from '@/components/patterns/RowActions';
import ItemsTable from '@/components/admin/services/ItemsTable';
import { SERVICES } from '@/lib/domain/seed/services';
import { assignItemIds, type ServiceItem } from '@/lib/domain/serviceItem';
import { Specimen } from '../Specimen';
import type { LibraryEntry } from '../catalogue';
import { ExperimentDrawer, ExperimentDrawerToolbar } from './ExperimentDrawer';
import ExperimentItemForm from './ExperimentItemForm';

/**
 * The service catalogue's item drawer, duplicated for a design experiment.
 *
 * The same arrangement as `admin/services/ItemsManager.tsx`: the items table,
 * "Add item", and the drawer that edits one row with back, paging and archive
 * in its toolbar. The table is the real `ItemsTable`, because the table is not
 * what is being redesigned. The drawer and its form are the forks in this
 * folder.
 *
 * The rows are the seeded Custom Website items, all 52, so the drawer is judged
 * against real names, rates and groups and pages through a list of real
 * length. They live in state only: saving, archiving and removing a group
 * change this page until it is reloaded and nothing else.
 */
export function ItemDrawerSpecimens({ entry }: { entry: LibraryEntry }) {
  const [only] = entry.variants;
  return (
    <Specimen name={only.name} note={only.note} fill>
      <ItemDrawerSpecimen />
    </Specimen>
  );
}

const WEB = SERVICES.find((service) => service.code === 'WEB');

function ItemDrawerSpecimen() {
  const [service, setService] = useState({
    items: WEB?.items ?? [],
    itemSeq: WEB?.itemSeq ?? 0,
  });
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const all = service.items;
  const archivedCount = all.filter((item) => item.archived).length;
  const rows = showArchived ? all : all.filter((item) => !item.archived);
  const editing = editingId ? (all.find((item) => item.id === editingId) ?? null) : null;
  const at = editing ? rows.findIndex((item) => item.id === editing.id) : -1;

  const groups = (() => {
    const counts = new Map<string, number>();
    for (const item of all) {
      if (!item.group) continue;
      counts.set(item.group, (counts.get(item.group) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  })();

  // The real id rule, so a new item gets the id the server would give it.
  const save = (item: ServiceItem) =>
    setService((current) =>
      assignItemIds(
        current,
        item.id
          ? current.items.map((row) => (row.id === item.id ? item : row))
          : [...current.items, item],
      ),
    );

  const archive = (item: ServiceItem) =>
    setService((current) => ({
      ...current,
      items: current.items.map((row) =>
        row.id === item.id ? { ...row, archived: !row.archived } : row,
      ),
    }));

  const removeGroup = (name: string) =>
    setService((current) => ({
      ...current,
      items: current.items.map((row) => {
        if (row.group !== name) return row;
        const { group: _removed, ...rest } = row;
        return rest;
      }),
    }));

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex h-7 items-center justify-end gap-3">
        {archivedCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-body text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus-ring focus-visible:outline-none"
          >
            {showArchived ? 'hide' : 'show'} {archivedCount} archived
          </button>
        ) : null}
        <AddButton variant="secondary" onClick={() => setEditingId('')}>
          Add item
        </AddButton>
      </div>

      <ItemsTable
        items={rows}
        onEdit={(item) => setEditingId(item.id)}
        isActive={(item) => item.id === editingId}
      />

      {editingId !== null ? (
        <ExperimentDrawer
          open
          onOpenChange={(next) => {
            if (!next) setEditingId(null);
          }}
          float
          title={editing ? editing.name : 'Add item'}
          toolbar={
            <ExperimentDrawerToolbar
              onBack={() => setEditingId(null)}
              backLabel="Back to the items"
              paging={
                editing && at !== -1
                  ? {
                      onPage: (delta: -1 | 1) => {
                        const next = rows[at + delta];
                        if (next) setEditingId(next.id);
                      },
                      hasPrevious: at > 0,
                      hasNext: at < rows.length - 1,
                      position: `${at + 1} of ${rows.length}`,
                    }
                  : undefined
              }
              actions={
                editing ? (
                  <ArchiveButton
                    label={
                      editing.archived ? `Restore ${editing.name}` : `Archive ${editing.name}`
                    }
                    archived={editing.archived}
                    onClick={() => archive(editing)}
                  />
                ) : undefined
              }
            />
          }
        >
          <ExperimentItemForm
            key={editing?.id ?? 'new'}
            item={editing}
            groups={groups}
            onDone={() => setEditingId(null)}
            onSave={save}
            onRemoveGroup={removeGroup}
          />
        </ExperimentDrawer>
      ) : null}
    </div>
  );
}
