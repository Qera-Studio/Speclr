'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
        onChange={setRows}
        options={options}
        hiddenFields={hiddenFields}
        partyLabel={partyLabel}
      />

      <p className="sr-only" role="status">
        {visible.length} of {documents.length} documents shown
      </p>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">No documents match these filters</p>
          <p className="text-xs text-muted-foreground">
            {documents.length} document{documents.length === 1 ? ' is' : 's are'} hidden by the
            current filters.
          </p>
          <Button type="button" variant="outline" onClick={() => setRows([])}>
            Clear filters
          </Button>
        </div>
      ) : (
        <DocumentsTable documents={visible} sort={sort} onSortChange={onSortChange} />
      )}
    </div>
  );
}
