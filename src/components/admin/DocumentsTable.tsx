import Link from 'next/link';
import { AddLink } from '@/components/ui/add-button';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyContent,
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
import { formatDisplayDate } from '@/lib/domain/dates';
import { computeTotals, formatINR } from '@/lib/domain/money';
import { DOC_TYPES } from '@/lib/domain/registry';
import type { AdminDocument } from '@/lib/domain/types';

/** The party a document concerns: the employee for HR docs, else the client. */
function partyName(doc: AdminDocument): string {
  if (doc.type === 'STP' || doc.type === 'OFR' || doc.type === 'EXP' || doc.type === 'EXIT') {
    return doc.employeeSnapshot?.name || '—';
  }
  return doc.clientSnapshot?.name || '—';
}

/**
 * Dashboard table of all documents, newest first. Server-renderable —
 * pure props, no client JS.
 */
export default function DocumentsTable({ documents }: { documents: AdminDocument[] }) {
  if (documents.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No documents yet</EmptyTitle>
          <EmptyDescription>Create your first invoice, receipt, contract, or letter to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <AddLink href="/docs/new/invoice">New invoice</AddLink>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Table>
      <TableCaption className="sr-only">All documents, newest first</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => {
          // Letters carry no line items — a ₹0 total would mislead, so show —.
          const hasMoney = DOC_TYPES[doc.type].kind !== 'hr-letter' && doc.type !== 'CON';
          const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
          return (
            <TableRow key={doc.id}>
              <TableCell>
                <Link href={`/docs/${doc.id}`} className="underline underline-offset-4">
                  {doc.number ?? 'Draft'}
                </Link>
              </TableCell>
              <TableCell>{DOC_TYPES[doc.type].label}</TableCell>
              <TableCell>{partyName(doc)}</TableCell>
              <TableCell>{formatDisplayDate(doc.issueDate)}</TableCell>
              <TableCell className="text-right">
                {hasMoney ? formatINR(totals.totalPaise) : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={doc.status === 'finalized' ? 'default' : 'secondary'}>
                  {doc.status === 'finalized' ? 'Finalized' : 'Draft'}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
