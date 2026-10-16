'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AddButton } from '@/components/ui/add-button';
import { DrawerSheet } from '@/components/ui/drawer-sheet';
import { DrawerToolbar } from '@/components/ui/drawer-toolbar';
import { ArchiveButton } from '../RowActions';
import ItemForm from './ItemForm';
import ItemsTable from './ItemsTable';
import { archiveServiceItem } from '@/server/actions/services';
import type { ContractService } from '@/lib/domain/service';
import type { ServiceItem } from '@/lib/domain/serviceItem';

/**
 * A Service's items: the table, the sheet that edits one, and the archive.
 *
 * **The sheet replaced the editor rail** on 20 September 2026, on request, and
 * the swap is worth stating because it also removed a guard. The rail is
 * non-blocking, so the table stayed live underneath it and a click on another
 * row could throw away what was typed; `useRecordPanel`'s `guardedSelect`
 * existed for exactly that. A sheet is modal, so the case cannot arise: there
 * is no other row to click while it is open, and closing is the cancel. So this
 * holds plain state rather than that hook, and nothing was lost with it.
 *
 * It is the component library's drawer (`DrawerSheet`), which is the house
 * answer for a panel that edits one record, rather than a fourth arrangement of
 * a header, a scrolling body and a footer.
 *
 * Saving still **posts one item, never the list**, which is the part worth
 * reviewing. `saveServiceSection('items', …)` replaces the whole array, so two
 * people editing different items under one Service would each save their own
 * copy of its 52 and the second would silently undo the first.
 */
export default function ItemsManager({ service }: { service: ContractService }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  /*
    Which item the sheet is showing: its id, or `''` for a new one, or null for
    closed. The **id** rather than the item, so a `router.refresh()` after a
    save re-reads the row from the server props instead of leaving the sheet
    holding the copy it opened with.
  */
  const [editingId, setEditingId] = useState<string | null>(null);

  const all = service.items ?? [];
  const archivedCount = all.filter((item) => item.archived).length;
  // Archived items keep their id and stay readable, but leave the list unless
  // asked for: the ordinary reason to open this page is the live catalogue.
  const rows = showArchived ? all : all.filter((item) => !item.archived);

  const editing = editingId ? (all.find((item) => item.id === editingId) ?? null) : null;

  /*
    The groups this service already uses, offered as suggestions in the form.

    **Derived from the items, never a stored list** (`PRINCIPLES.md` rule 3).
    A `groups` column would be a second place for the answer to live and a
    second place for it to go stale: rename the last item out of a heading and
    the heading should stop being offered, which is true by construction here
    and would need maintaining anywhere else.

    Scoped to this service because that is what the data says the set is: all
    43 groups in the live catalogue belong to exactly one service, and the
    services that use none (DNS, HOST, MAIL, ANLY, MNT, SEO, AIOP, AUD, STR)
    correctly offer nothing. Archived items are included, since a retired line
    still tells you what the heading is called.

    **The count rides along** because removing a group is a bulk edit and its
    confirmation has to say how many items it will touch. Counting here rather
    than in the form keeps one pass over the items and one definition of what
    a group's membership is.
  */
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
  const at = editing ? rows.findIndex((item) => item.id === editing.id) : -1;

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
      {/*
        **The count is gone**, on request, and it was genuinely saying the
        figure twice: `RecordTable`'s own footer already prints "1-10 of 52
        items" beside the pager, which is the more useful of the two because it
        also says where in the list you are.

        `-mt-11` lifts this row onto the section heading's line, so "Items" and
        "Add item" read as one row directly above the table. The alternative
        was lifting the button into `ServicePage` and passing it down, which
        would put this component's control in a file that knows nothing about
        items. `h-7` matches the button, so the heading's line box is what sets
        the row's height rather than this box growing it.

        The archived toggle stays, and it has to: it is the only route back to
        an item somebody retired, and the table hides archived rows by default.
      */}
      <div className="-mt-11 flex h-7 items-center justify-end gap-3">
        {archivedCount > 0 ? (
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
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
        <DrawerSheet
          open
          onOpenChange={(next) => {
            if (!next) setEditingId(null);
          }}
          float
          title={editing ? editing.name : 'Add item'}
          toolbar={
            <DrawerToolbar
              onBack={() => setEditingId(null)}
              backLabel="Back to the items"
              /*
                Paging by **position**, never by arithmetic on the id: an id
                that is never reissued leaves gaps (`WEB` has 52 items and an
                `itemSeq` of 55), so `I4` + 1 pages into nothing. Offered only
                while editing an existing row, since a new item has no place in
                the list to step from.
              */
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
              /*
                **Archiving lives here now**, and only here. The row offers Edit
                alone, so this is the one way to retire an item, which is the
                point rather than a side effect: the row's actions are a
                hover-revealed target beside forty-nine others, and a control
                that removes a line from the catalogue should not sit there. In
                the sheet the item is already open and named in the header, so
                there is no question which one is being archived.

                No confirmation, matching `ClientRowMenu`: archiving takes
                nothing away and this same button offers the way back. An item's
                id is cited by a client record and a quotation line and is never
                reissued, so there is no delete to guard in the first place.
              */
              actions={
                editing ? (
                  <ArchiveButton
                    label={
                      editing.archived
                        ? `Restore ${editing.name}`
                        : `Archive ${editing.name}`
                    }
                    archived={editing.archived}
                    onClick={() => onArchive(editing, !editing.archived)}
                  />
                ) : undefined
              }
            />
          }
        >
          {/* `key` remounts the form so react-hook-form re-reads defaultValues:
              without it, paging to the next item would show the previous
              one's values. */}
          <ItemForm
            key={editing?.id ?? 'new'}
            code={service.code}
            item={editing}
            groups={groups}
            onDone={() => setEditingId(null)}
          />
        </DrawerSheet>
      ) : null}

      {/* The archive runs in a transition, so the table is briefly stale. */}
      <span aria-live="polite" className="sr-only">
        {pending ? 'Saving' : ''}
      </span>
    </div>
  );
}
