'use client';

import { startTransition, useCallback, useMemo, useOptimistic, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Archive, Calendar, CircleDashed, Globe, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty';
// Only the hook: this list hands its paging down to `RecordTable` through
// `ClientsTable`, and that is what renders the pager. `Pagination` and
// `rowCountLabel` were imported here and never used.
import { usePagedRows } from '@/components/ui/pagination';
import { AddLink } from '@/components/patterns/AddAction';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ClientsTable, { CLIENT_COLUMNS, DEFAULT_CLIENT_COLUMNS } from './ClientsTable';
import ColumnsMenu, { useStoredKeys } from '@/components/patterns/ColumnsMenu';
import { BulkBar, useBulkSelect } from '@/components/patterns/BulkSelect';
import FilterBar from '@/components/patterns/FilterBar';
import SortToggle, { useShowSort } from '@/components/patterns/SortToggle';
import {
  CLIENT_FILTER_FIELDS,
  ONBOARDING_STATES,
  clientCountry,
  matchesClientFilters,
  sortClients,
  type ClientFilterField,
  type ClientFilterRow,
  type ClientSortColumn,
  type ClientSortState,
} from './clientQuery';
import { countryName } from '@/lib/domain/countries';
import { deleteClientAction, setClientArchivedAction } from '@/server/actions/clients';
import type { DayRates } from '@/lib/domain/currency';
import type { ContractService } from '@/lib/domain/service';
import type { ClientRecord } from '@/lib/domain/types';
import type { StudioMember } from '@/lib/profile';
import { PageHeader } from '@/components/patterns/Page';

/**
 * The clients list.
 *
 * Adding and editing both go to `/client/clients/[id]`, the seven-step
 * onboarding surface, rather than to a form in the editor rail. The rail form
 * was deleted with it — a 384px rail cannot hold tax registration, four
 * contacts, commercial terms and a file list, and keeping a short version
 * beside the long one means a quick edit silently ignores every section it
 * doesn't know about.
 *
 * A link rather than a button, because these are now real URLs: onboarding a
 * client is a task people get interrupted during, and a page you can bookmark
 * and come back to is the point.
 */
/** An icon per filter field. Lucide is UI, so it stays out of `clientQuery`. */
const FIELD_ICONS: Record<ClientFilterField, typeof Globe> = {
  country: Globe,
  onboarding: CircleDashed,
  added: Calendar,
};

export default function ClientManager({
  clients,
  people,
  catalogue,
  rates,
}: {
  clients: ClientRecord[];
  /** For the lead and team columns. Narrowed by the page, see `lib/profile.ts`. */
  people?: StudioMember[];
  /** For the amount column: an engaged item's list price where none was agreed. */
  catalogue?: ContractService[];
  /** For the amount column's currency toggle. Null when today's could not be fetched. */
  rates?: DayRates | null;
}) {
  const router = useRouter();
  /**
   * Which list you are looking at. Component state, not the URL: it is a
   * two-way toggle on one page rather than a place, and archived clients are
   * not a view anybody links to.
   */
  const [showArchived, setShowArchived] = useState(false);

  // Filtering and sorting run in memory over the list the page already
  // fetched, exactly as the documents list does: this is an internal tool
  // holding tens of clients, so a round trip per keystroke would buy nothing.
  const [filters, setFilters] = useState<ClientFilterRow[]>([]);
  const [sort, setSort] = useState<ClientSortState | null>(null);
  const [showSort, toggleShowSort] = useShowSort();
  /*
    Stored as the columns *shown*, not hidden, so a column added later arrives
    switched off for everybody rather than switched on for whoever had once
    hidden something. Never chosen means the defaults.
  */
  const [shownColumns, setShownColumns] = useStoredKeys('speclr:client-columns-shown');
  const [columnOrder, setColumnOrder] = useStoredKeys('speclr:client-column-order');
  const shownKeys = shownColumns ?? DEFAULT_CLIENT_COLUMNS;
  const hiddenColumns = CLIENT_COLUMNS.map((c) => c.key).filter((key) => !shownKeys.includes(key));
  const setHiddenColumns = (hidden: string[]) =>
    setShownColumns(CLIENT_COLUMNS.map((c) => c.key).filter((key) => !hidden.includes(key)));

  /**
   * The list as it will be once the write lands, shown at once.
   *
   * Archiving and deleting both take a row out of the list you are looking at,
   * and the round trip to Neon is long enough that the row sits there looking
   * ignored. React reverts this by itself the moment the transition ends, so a
   * refusal needs no rollback code: the row simply comes back, and the reason
   * is in the toast that follows.
   */
  const [rows, applyOptimistic] = useOptimistic(
    clients,
    (state: ClientRecord[], change: { id: string; archived?: boolean; deleted?: boolean }) =>
      change.deleted
        ? state.filter((c) => c.id !== change.id)
        : state.map((c) => (c.id === change.id ? { ...c, archived: change.archived } : c)),
  );

  // Derived, not a second fetch. The page loads every client anyway, and one
  // query with a filter applied here cannot disagree with itself about the
  // count in the button.
  const archived = rows.filter((c) => c.archived);
  const listed = showArchived ? archived : rows.filter((c) => !c.archived);

  // Choices come from what is actually on screen — a filter value that can only
  // ever return nothing is a click wasted.
  const options = useMemo(() => {
    const codes = [...new Set(listed.map(clientCountry))].sort((a, b) =>
      countryName(a).localeCompare(countryName(b)),
    );
    return {
      country: codes.map((code) => ({ value: code, label: countryName(code) })),
      onboarding: ONBOARDING_STATES,
    };
  }, [listed]);

  const shown = useMemo(
    () => sortClients(listed.filter((c) => matchesClientFilters(c, filters)), sort),
    [listed, filters, sort],
  );

  const { page, pageCount, visible, setPage, start } = usePagedRows(shown);

  /*
    Every row gets a checkbox, because this list genuinely cannot tell which
    clients are deletable: a client that has ever been on a document is refused
    server-side and nothing here knows what has been issued (`CONTEXT.md` §5d).
    That is the same shape the per-row `RemoveButton` already has, and the
    honest one — the alternative is a checkbox missing for reasons the row
    cannot explain.
  */

  /*
    One call per client rather than a batch action, for the reason above: the
    refusal is per client and `deleteClientAction` is where it is decided. It
    also erases the attachments blob-first (DPDP Act 2023 erasure), which a
    batch path would have to reimplement.
  */
  const onBulkDelete = async (chosen: ClientRecord[]) => {
    const results = await Promise.all(
      chosen.map((client) => deleteClientAction(client.id)),
    );
    const refused = results.filter((r) => !r.success).length;
    if (refused > 0) {
      toast.error(
        `${refused} of ${chosen.length} could not be deleted. A client that has been on a document can't be removed.`,
        { duration: 10000 },
      );
    }
    router.refresh();
  };

  // A new filter set is a new list; page 3 of the old one means nothing, and
  // neither does a tick on a row it no longer contains.
  const onFiltersChange = (next: ClientFilterRow[]) => {
    setFilters(next);
    setPage(0);
  };

  // asc → desc → unsorted, so a column can always be put back.
  const onSortChange = (column: ClientSortColumn) =>
    setSort((prev) => {
      if (prev?.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });

  /**
   * The row's `RemoveButton` has already confirmed by the time this runs — but
   * confirming is not the same as being allowed. A client that has ever been on
   * a document is refused server-side, so the refusal has to land somewhere the
   * operator can read it rather than disappearing into a resolved promise.
   *
   * No toast on success: the row leaving the list *is* the confirmation, and a
   * toast repeating it would be one more thing to dismiss. No undo either:
   * deleting erases the attachments as well as the row (DPDP Act 2023), so
   * there is nothing to put back.
   */
  const onDelete = (client: ClientRecord) =>
    startTransition(async () => {
      applyOptimistic({ id: client.id, deleted: true });
      const result = await deleteClientAction(client.id);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete client.', { duration: 10000 });
        return;
      }
      router.refresh();
    });

  /**
   * Offboarding, and the way back. Reversible and refused by nothing, so unlike
   * deleting there is no state to check first — the only failure it can report
   * is the server saying no.
   *
   * This one does toast, and the toast is the undo. The row vanishes out of the
   * list you were reading, so the confirmation has to carry the way back with
   * it; the alternative is finding the archive toggle and hunting for the row.
   */
  const onArchive = (client: ClientRecord, next: boolean) =>
    startTransition(async () => {
      applyOptimistic({ id: client.id, archived: next });
      const result = await setClientArchivedAction(client.id, next);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to update client.', { duration: 10000 });
        return;
      }
      router.refresh();
      toast(`${client.name} ${next ? 'archived' : 'restored'}`, {
        action: {
          label: 'Undo',
          onClick: () => onArchive(client, !next),
        },
      });
    });

  /**
   * The page's own actions, sitting at the right end of the toolbar row rather
   * than up beside the title: they belong to the list, and one row of controls
   * reads as one row of controls.
   *
   * They render whether or not the list is empty — a control that moves
   * depending on state is a control you have to look for.
   */
  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      {/*
        Outline, not filled. The rail's "New document" is the app's one blue
        and it is on screen on every page; a second filled blue here would
        make the viewport argue with itself about which action matters.
      */}
      <AddLink href="/client/clients/new" variant="secondary">
        Add client
      </AddLink>
      {/*
        The way back to the offboarded. Icon only and to the right of the
        create action, because it is somewhere you go rarely and it must not
        read as a second thing to do.
      */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="secondary"
              size="sm" icon
              aria-pressed={showArchived}
              aria-label={showArchived ? 'Show active clients' : 'Show archived clients'}
              onClick={() => setShowArchived((v) => !v)}
            />
          }
        >
          {showArchived ? <Users className="size-4" /> : <Archive className="size-4" />}
        </TooltipTrigger>
        <TooltipContent>
          {showArchived ? 'Active clients' : `Archived (${archived.length})`}
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Clients" />

      {/* The controls sit 8px over the table they act on, closer than the
          title's 16px, so they read as the table's own toolbar. */}
      <div className="flex flex-col gap-2">
        {/* Nothing to filter yet — the table's own empty state says what to do
            instead, and a filter bar over no rows is a control with no subject.
            The actions stay put either way. */}
        {listed.length > 0 ? (
          <FilterBar<ClientFilterField>
            rows={filters}
            onChange={onFiltersChange}
            fields={CLIENT_FILTER_FIELDS}
            icons={FIELD_ICONS}
            options={options}
            leading={
              <>
                {/* What the table shows, then how it is ordered: both are
                    about the view, so they sit together at the left. */}
                <ColumnsMenu
                  columns={CLIENT_COLUMNS}
                  hidden={hiddenColumns}
                  order={columnOrder ?? []}
                  onHiddenChange={setHiddenColumns}
                  onOrderChange={setColumnOrder}
                />
                <SortToggle showSort={showSort} onToggle={toggleShowSort} />
              </>
            }
            trailing={actions}
          />
        ) : (
          <div className="flex justify-end">{actions}</div>
        )}

        <p className="sr-only" role="status">
          {shown.length} of {listed.length} clients shown
        </p>

        {listed.length > 0 && shown.length === 0 ? (
          <EmptyState
            preset="no-matches"
            noun="client"
            className="border py-8"
            description={`${listed.length} client${listed.length === 1 ? ' is' : 's are'} hidden by the current filters.`}
            action={
              <Button type="button" variant="secondary" onClick={() => onFiltersChange([])}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <ClientsTable
            clients={visible}
            people={people}
            catalogue={catalogue}
            rates={rates}
            onBulkDelete={onBulkDelete}
            onDelete={onDelete}
            onArchive={onArchive}
            archived={showArchived}
            sort={sort}
            // Omitted while the toggle is off: the headings then render as plain
            // text, which is `ClientsTable`'s existing unsortable mode.
            onSortChange={showSort ? onSortChange : undefined}
            paging={{ page, pageCount, onPageChange: setPage, start, total: shown.length }}
            hidden={hiddenColumns}
            order={columnOrder ?? []}
          />
        )}
      </div>
    </div>
  );
}
