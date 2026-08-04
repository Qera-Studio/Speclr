import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SortColumn, SortState } from '@/lib/domain/documentQuery';
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
import DocumentRowActions from './DocumentRowActions';
import { formatDisplayDate } from '@/lib/domain/dates';
import { computeTotals, formatINR } from '@/lib/domain/money';
import { DOC_TYPES } from '@/lib/domain/registry';
import { partyName } from '@/lib/domain/party';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * Dashboard table of all documents, newest first. Server-renderable —
 * pure props, no client JS.
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
}

const COLUMNS: { column: SortColumn; label: string; align?: 'right' }[] = [
  { column: 'number', label: 'Number' },
  { column: 'type', label: 'Type' },
  { column: 'party', label: 'Client' },
  { column: 'date', label: 'Date' },
  { column: 'total', label: 'Total', align: 'right' },
  { column: 'status', label: 'Status' },
];

export default function DocumentsTable({
  documents,
  emptyTitle = 'No documents yet',
  emptyDescription = 'Create your first invoice, receipt, contract, or letter to get started.',
  sort,
  onSortChange,
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
    <Table>
      <TableCaption className="sr-only">All documents, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          {COLUMNS.map(({ column, label, align }) => {
            const active = sort?.column === column;
            const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
            return (
              <TableHead
                key={column}
                className={align === 'right' ? 'text-right' : undefined}
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
                {onSortChange ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(column)}
                    className={cn(
                      'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                      align === 'right' && 'flex-row-reverse',
                      !active && 'text-muted-foreground',
                    )}
                  >
                    {label}
                    <Icon className="size-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  label
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
          // Letters carry no line items — a ₹0 total would mislead, so show —.
          const hasMoney = DOC_TYPES[doc.type].kind !== 'hr-letter' && doc.type !== 'CON';
          const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
          return (
            <TableRow key={doc.id} className="group/row">
              <TableCell>
                <Link href={`/docs/${doc.id}`} className="underline underline-offset-4">
                  {doc.number ?? 'Draft'}
                </Link>
              </TableCell>
              <TableCell>{DOC_TYPES[doc.type].label}</TableCell>
              <TableCell>{partyName(doc) || '—'}</TableCell>
              <TableCell>{formatDisplayDate(doc.issueDate)}</TableCell>
              <TableCell className="text-right">
                {hasMoney ? formatINR(totals.totalPaise) : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={doc.status === 'finalized' ? 'default' : 'secondary'}>
                  {doc.status === 'finalized' ? 'Finalized' : 'Draft'}
                </Badge>
              </TableCell>
              <TableCell className="py-0 text-right">
                <DocumentRowActions doc={doc} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
