import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { NIL, cn } from '@/lib/utils';
import { hasTotal, type SortColumn, type SortState } from '@/lib/domain/documentQuery';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DateCell, TableCard, TruncCell } from './Page';
import { CopyCell } from './CopyCell';
import DocumentRowActions from './DocumentRowActions';
import { computeTotals, formatINR } from '@/lib/domain/money';
import { DOC_TYPES } from '@/lib/domain/registry';
import { docHref } from '@/lib/profile';
import { partyName } from '@/lib/domain/party';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * Dashboard table of all documents, newest first. Pure props: the rows are
 * server-renderable, and the only client JS in them is the copy button, which
 * is its own island.
 */
export interface DocumentsTableProps {
  documents: AdminDocument[];
  /** Empty-state copy. Defaults suit the all-documents dashboard. */
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * Sorting is opt-in: pass both and the headers become buttons, omit them and
   * they stay plain text. That keeps the table renderable without client state.
   */
  sort?: SortState | null;
  onSortChange?: (column: SortColumn) => void;
  /** Card footer: the row count on the left, the pager on the right. */
  count?: React.ReactNode;
  pagination?: React.ReactNode;
}

// Total is right-aligned, which reverses an earlier call here. Money is read by
// comparing digit positions down the column, and that only works if the units
// column is the same column on every row — which is also why every figure in
// this table is `tabular-nums`. One money column is still a money column.
const COLUMNS: { column: SortColumn; label: string; right?: boolean }[] = [
  { column: 'number', label: 'Number' },
  { column: 'type', label: 'Type' },
  { column: 'party', label: 'Client' },
  { column: 'date', label: 'Date' },
  { column: 'total', label: 'Total', right: true },
  { column: 'status', label: 'Status' },
];

export default function DocumentsTable({
  documents,
  emptyTitle = 'No documents yet',
  emptyDescription = 'Create your first invoice, receipt, contract, or letter to get started.',
  sort,
  onSortChange,
  count,
  pagination,
}: DocumentsTableProps) {
  if (documents.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <TableCard count={count} pagination={pagination}>
      <Table>
        <TableCaption className="sr-only">All documents, newest first</TableCaption>
        <TableHeader>
          <TableRow>
            {COLUMNS.map(({ column, label, right }) => {
              const active = sort?.column === column;
              const SortIcon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
              return (
                <TableHead
                  key={column}
                  className={cn(right && 'text-right')}
                  // Announced only for the column actually sorted; the rest are
                  // 'none', which is what tells a screen reader they're sortable.
                  aria-sort={
                    !onSortChange
                      ? undefined
                      : active
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                  }
                >
                  {/*
                    Both branches lay out identically: label, gap, then a 3.5
                    arrow slot that is merely `invisible` when sorting is off.
                    Dropping the arrow instead would change the header's width,
                    and with `table-auto` that re-measures every column: toggling
                    the control shifted the whole table sideways.

                    They share `text-muted-foreground` for the same reason:
                    `TableHead` defaults to `text-foreground`, so leaving the
                    unsortable branch to that default darkened every heading the
                    moment sorting was switched off.
                  */}
                  {onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column)}
                      className={cn(
                        'group/sort inline-flex items-center gap-1 transition-colors hover:text-foreground',
                        right && 'flex-row-reverse',
                        !active && 'text-muted-foreground',
                      )}
                    >
                      {label}
                      {/*
                        The arrow is permanent on the column actually sorted and
                        appears on hover or keyboard focus on the others. Six
                        standing arrows are six invitations of equal weight, and
                        none of them is the answer to "how is this sorted".
                        `opacity`, not conditional rendering, so the slot keeps
                        its width and the columns do not re-measure.
                      */}
                      <SortIcon
                        className={cn(
                          'size-3.5 transition-opacity',
                          !active &&
                            'opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-muted-foreground',
                        right && 'flex-row-reverse',
                      )}
                    >
                      {label}
                      <SortIcon className="invisible size-3.5" aria-hidden="true" />
                    </span>
                  )}
                </TableHead>
              );
            })}
            <TableHead className="w-0 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            // Letters carry no line items, and a ₹0 total would mislead.
            const hasMoney = hasTotal(doc);
            const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
            /*
              The whole row opens the document, via one stretched link rather than
              a row `onClick`: it stays a real anchor (middle-click, ⌘-click,
              keyboard, "copy link"), and the table stays server-rendered with no
              client JS.

              The overlay stops short of the actions cell — that cell is
              positioned, so being later in DOM order it paints above the `after`
              layer and its buttons keep their own hit area.
            */
            return (
              <TableRow key={doc.id} className="group/row relative cursor-pointer">
                <CopyCell
                  value={doc.number}
                  label="Copy document number"
                  iconOnly
                  className="tabular-nums"
                  display={
                    <Link
                      href={docHref(doc)}
                      className="after:absolute after:inset-0 after:content-['']"
                    >
                      {doc.number ?? 'Draft'}
                    </Link>
                  }
                />
                <TableCell>{DOC_TYPES[doc.type].label}</TableCell>
                <TruncCell value={partyName(doc)} />
                <DateCell value={doc.issueDate} />
                <TableCell className="text-right tabular-nums">
                  {hasMoney ? formatINR(totals.totalPaise) : NIL}
                </TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} />
                </TableCell>
                <TableCell className="relative py-0 text-right">
                  <DocumentRowActions doc={doc} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableCard>
  );
}
