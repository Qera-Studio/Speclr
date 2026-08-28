import Link from 'next/link';
import { FileText } from 'lucide-react';
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
import { DateCell, SortableHead, TableCard, TruncCell } from './Page';
import type { BulkSelection } from './BulkSelect';
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
  /**
   * Row selection, opt-in exactly as sorting is: pass it and the checkbox
   * column appears, omit it and the table is unchanged. The browser owns the
   * state because it also owns the paging and filtering the selection has to
   * survive.
   */
  selection?: BulkSelection<AdminDocument>;
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
  selection,
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
            {selection?.head}
            {COLUMNS.map((col) => (
              <SortableHead
                key={col.column}
                {...col}
                sort={sort}
                onSortChange={onSortChange}
              />
            ))}
            <TableHead className="w-0 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            // Letters carry no line items, and a ₹0 total would mislead.
            const hasMoney = hasTotal(doc);
            const totals = computeTotals(doc.lineItems, doc.gstRatePercent, doc);
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
                {selection?.cell(doc)}
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
