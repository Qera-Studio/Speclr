'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { NIL } from '@/lib/utils';
import { hasTotal, type SortColumn, type SortState } from '@/lib/domain/documentQuery';
import RecordTable, { type RecordTableProps } from './RecordTable';
import type { BulkSelection } from './BulkSelect';
import { CopyCell } from './CopyCell';
import { DateCell } from './Page';
import DocumentRowActions from './DocumentRowActions';
import { computeTotals, formatINR } from '@/lib/domain/money';
import { DOC_TYPES } from '@/lib/domain/registry';
import { openDocHref } from '@/lib/profile';
import { partyName } from '@/lib/domain/party';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * The documents list, and the reference for every other one.
 *
 * A `RecordTable`, like every list of records (`docs/design.md` §2.3). What is
 * left here is what is particular to a document: its six columns, the money
 * rule below, and the actions.
 *
 * Sorting and paging are the browser's, not this component's: it sorts through
 * `documentQuery` over a filtered set, and the `SortToggle` eye hides the
 * controls while keeping the order (`externalSort`). The selection is the
 * browser's too, because the same ticks serve the table view, the cards view
 * and the bar under both.
 */
export interface DocumentsTableProps {
  documents: AdminDocument[];
  /** Empty-state copy. Defaults suit the all-documents dashboard. */
  emptyTitle?: string;
  emptyDescription?: string;
  sort?: SortState | null;
  onSortChange?: (column: SortColumn) => void;
  /** Paging, owned by the browser, which is what filters the list. */
  paging?: RecordTableProps<AdminDocument>['paging'];
  selection?: BulkSelection<AdminDocument>;
}

export default function DocumentsTable({
  documents,
  emptyTitle = 'No documents yet',
  emptyDescription = 'Create your first invoice, receipt, contract, or letter to get started.',
  sort,
  onSortChange,
  paging,
  selection,
}: DocumentsTableProps) {
  return (
    <RecordTable
      rows={documents}
      id={(doc) => doc.id}
      noun="document"
      caption="All documents, newest first"
      open={(doc) => ({ href: openDocHref(doc) })}
      rowLabel={(doc) => doc.number ?? 'Draft'}
      sort={sort}
      onSortChange={onSortChange as ((column: string) => void) | undefined}
      // The browser sorts whether or not the controls are on screen.
      externalSort
      paging={paging}
      selection={selection}
      columns={[
        {
          key: 'number',
          label: 'Number',
          ownCell: true,
          // The anchor is inside the `CopyCell` below, not beside it.
          ownOpener: true,
          sortValue: (doc) => doc.number ?? '',
          cell: (doc) => (
            <CopyCell
              value={doc.number}
              label="Copy document number"
              iconOnly
              className="tabular-nums"
              display={
                /*
                  The whole row opens the document, via one stretched link
                  rather than a row `onClick`: it stays a real anchor
                  (middle-click, cmd-click, keyboard, "copy link"). The
                  `relative` that overlay resolves against is on the row, put
                  there by `RecordTable`, and it is load-bearing: a `relative`
                  on any cell in between shrinks the hit area to that column,
                  which `CopyCell` used to cause, and none at all lets it cover
                  every row at once.
                */
                <Link
                  href={openDocHref(doc)}
                  className="after:absolute after:inset-0 after:content-['']"
                >
                  {doc.number ?? 'Draft'}
                </Link>
              }
            />
          ),
        },
        { key: 'type', label: 'Type', cell: (doc) => DOC_TYPES[doc.type].label },
        { key: 'party', label: 'Client', trunc: true, cell: (doc) => partyName(doc) },
        {
          key: 'date',
          label: 'Date',
          ownCell: true,
          sortValue: (doc) => doc.issueDate,
          cell: (doc) => <DateCell value={doc.issueDate} />,
        },
        {
          /*
            Right-aligned, which reverses an earlier call here. Money is read by
            comparing digit positions down the column, and that only works if
            the units column is the same column on every row, which is also why
            every figure here is `tabular-nums`. One money column is still a
            money column.
          */
          key: 'total',
          label: 'Total',
          right: true,
          sortValue: (doc) =>
            hasTotal(doc) ? computeTotals(doc.lineItems, doc.gstRatePercent, doc).totalPaise : 0,
          cell: (doc) =>
            // Letters carry no line items, and a zero total would mislead.
            hasTotal(doc)
              ? formatINR(computeTotals(doc.lineItems, doc.gstRatePercent, doc).totalPaise)
              : NIL,
        },
        {
          key: 'status',
          label: 'Status',
          sortValue: (doc) => doc.status,
          cell: (doc) => <StatusBadge status={doc.status} />,
        },
      ]}
      actions={(doc) => <DocumentRowActions doc={doc} />}
      empty={{ icon: <FileText />, title: emptyTitle, description: emptyDescription }}
    />
  );
}
