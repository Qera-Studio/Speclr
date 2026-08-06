'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Pagination, usePagedRows } from '@/components/ui/pagination';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import DocumentFilters, { type FilterOption } from './DocumentFilters';
import DocumentsTable from './DocumentsTable';
import {
  hasTotal,
  matchesFilters,
  sortDocuments,
  type FilterField,
  type FilterRow,
  type SortColumn,
  type SortState,
} from '@/lib/domain/documentQuery';
import { partyName } from '@/lib/domain/party';
import { DOC_TYPE_LIST, DOC_TYPES } from '@/lib/domain/registry';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * The documents list, with its filters and column sorting.
 *
 * Filtering and sorting run in memory over the list the page already fetched.
 * This is an internal tool holding tens of documents, so a round trip per
 * keystroke would buy nothing; if the list ever reaches thousands this moves
 * into SQL behind the same component boundary.
 *
 * Note the two distinct empty outcomes: "nothing has been created yet" is the
 * table's own empty state, while "nothing matches your filters" is handled here
 * — conflating them would make an over-narrow filter look like data loss.
 */
/**
 * Where the "show sorting" preference is remembered. Off by default: sorting is
 * an occasional need, and an arrow on all six headers competes with the column
 * names for anyone who never sorts. Whoever does sort turns it on once.
 */
const SHOW_SORT_KEY = 'speclr:show-sort';

export default function DocumentsBrowser({
  documents,
  emptyTitle,
  emptyDescription,
  /** Hidden on a per-type list, where every row is already the same type. */
  hideTypeFilter = false,
  /** What the party column holds here: "Client", "Employee", or both. */
  partyLabel = 'Client / employee',
}: {
  documents: AdminDocument[];
  emptyTitle?: string;
  emptyDescription?: string;
  hideTypeFilter?: boolean;
  partyLabel?: string;
}) {
  const [rows, setRows] = useState<FilterRow[]>([]);
  const [sort, setSort] = useState<SortState | null>(null);
  const [showSort, setShowSort] = useState(false);

  // Read on mount, not in a lazy initializer: this component server-renders,
  // and reading localStorage during the first render would mismatch hydration.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(SHOW_SORT_KEY) === '1') setShowSort(true);
    } catch {
      // Private browsing / storage disabled — the default holds for the session.
    }
  }, []);

  const toggleShowSort = () => {
    const next = !showSort;
    setShowSort(next);
    // Turning the controls off drops any sort they applied. Leaving it would
    // reorder the table with nothing on screen explaining why, and no way back.
    if (!next) setSort(null);
    try {
      localStorage.setItem(SHOW_SORT_KEY, next ? '1' : '0');
    } catch {
      // As above — the toggle still works, it just won't survive a reload.
    }
  };

  // An eye, open or shut: this shows and hides a control, it does not sort
  // anything itself — an ArrowUpDown here would read as "sort by this".
  //
  // The word carries the meaning and the eye carries the state, so the button's
  // accessible name is just "Sort" and `aria-pressed` says which way it is set.
  // An aria-label restating the state would fight the visible text (WCAG 2.5.3,
  // Label in Name) and leave voice control with nothing to say.
  const sortToggle = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            onClick={toggleShowSort}
            aria-pressed={showSort}
            className={cn(
              'shrink-0 whitespace-nowrap transition-colors',
              showSort ? 'text-foreground' : 'text-muted-foreground',
            )}
          />
        }
      >
        Sort
        {showSort ? (
          <Eye className="size-3.5" aria-hidden="true" />
        ) : (
          <EyeOff className="size-3.5" aria-hidden="true" />
        )}
      </TooltipTrigger>
      <TooltipContent>{showSort ? 'Hide sorting' : 'Show sorting'}</TooltipContent>
    </Tooltip>
  );

  // Choices come from what is actually on screen — a filter value that can only
  // ever return nothing is a click wasted.
  const options = useMemo(() => {
    const types = new Set(documents.map((d) => d.type));
    const parties = [...new Set(documents.map(partyName).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );
    const statuses = new Set(documents.map((d) => d.status));

    return {
      type: DOC_TYPE_LIST.filter((spec) => types.has(spec.code)).map((spec) => ({
        value: spec.code,
        label: spec.label,
      })),
      party: parties.map((name) => ({ value: name, label: name })),
      status: (['draft', 'finalized'] as const)
        .filter((s) => statuses.has(s))
        .map((s) => ({ value: s, label: s === 'draft' ? 'Draft' : 'Finalized' })),
    } satisfies Record<'type' | 'party' | 'status', FilterOption[]>;
  }, [documents]);

  const hiddenFields = useMemo(() => {
    const hidden: FilterField[] = [];
    if (hideTypeFilter) hidden.push('type');
    if (options.party.length === 0) hidden.push('party');
    // Letters and contracts have no line items; offering a total filter here
    // would only ever empty the list.
    if (!documents.some(hasTotal)) hidden.push('total');
    return hidden;
  }, [hideTypeFilter, options.party.length, documents]);

  const visible = useMemo(() => {
    const kept = rows.length ? documents.filter((doc) => matchesFilters(doc, rows)) : documents;
    return sortDocuments(kept, sort);
  }, [documents, rows, sort]);

  // Paged so a long list cannot push whatever follows it off the page — on the
  // contract list, that is the services section.
  const { page, pageCount, visible: pageRows, setPage } = usePagedRows(visible);

  // A new filter set is a new list; page 3 of the old one means nothing.
  const onFiltersChange = (next: FilterRow[]) => {
    setRows(next);
    setPage(0);
  };

  // asc → desc → unsorted, so a column can always be put back.
  const onSortChange = (column: SortColumn) =>
    setSort((prev) => {
      if (prev?.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return null;
    });

  // Nothing to filter yet — the table's empty state says what to do instead.
  if (documents.length === 0) {
    return (
      <DocumentsTable
        documents={documents}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DocumentFilters
        rows={rows}
        onChange={onFiltersChange}
        options={options}
        hiddenFields={hiddenFields}
        partyLabel={partyLabel}
        leading={sortToggle}
      />

      <p className="sr-only" role="status">
        {visible.length} of {documents.length} documents shown
      </p>

      {visible.length === 0 ? (
        <Empty className="border py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilterX />
            </EmptyMedia>
            <EmptyTitle>No documents match these filters</EmptyTitle>
            <EmptyDescription>
              {documents.length} document{documents.length === 1 ? ' is' : 's are'} hidden by the
              current filters.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button type="button" variant="outline" onClick={() => onFiltersChange([])}>
              Clear filters
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <DocumentsTable
            documents={pageRows}
            sort={sort}
            // Omitted while the toggle is off — the headers then render as plain
            // text, which is `DocumentsTable`'s existing unsortable mode.
            onSortChange={showSort ? onSortChange : undefined}
          />
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            label="documents"
          />
        </>
      )}
    </div>
  );
}
