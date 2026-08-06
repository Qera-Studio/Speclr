import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CircleDot,
  FileText,
  FileType,
  Hash,
  IndianRupee,
  User,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import ColumnLabel from './ColumnLabel';
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

// Total is left-aligned like the rest. Right-aligned figures compare better by
// digit position, but with a single money column consistency wins.
const COLUMNS: { column: SortColumn; label: string; icon: LucideIcon }[] = [
  { column: 'number', label: 'Number', icon: Hash },
  { column: 'type', label: 'Type', icon: FileType },
  { column: 'party', label: 'Client', icon: User },
  { column: 'date', label: 'Date', icon: Calendar },
  // Money here is always INR, so the currency mark doubles as the column's icon.
  { column: 'total', label: 'Total', icon: IndianRupee },
  { column: 'status', label: 'Status', icon: CircleDot },
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
          {COLUMNS.map(({ column, label, icon }) => {
            const active = sort?.column === column;
            const SortIcon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
            return (
              <TableHead
                key={column}
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
                  Both branches lay out identically — label, gap, then a 3.5
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
                      'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                      !active && 'text-muted-foreground',
                    )}
                  >
                    <ColumnLabel icon={icon}>{label}</ColumnLabel>
                    <SortIcon className="size-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <ColumnLabel icon={icon}>{label}</ColumnLabel>
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
          // Letters carry no line items — a ₹0 total would mislead, so show —.
          const hasMoney = hasTotal(doc);
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
              <TableCell>{hasMoney ? formatINR(totals.totalPaise) : '—'}</TableCell>
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
