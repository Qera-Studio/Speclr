import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
      <Card className="items-center px-6 py-10 text-center">
        <p className="text-muted-foreground">
          No documents yet. Start with{' '}
          <Link href="/docs/new/invoice" className="text-primary underline underline-offset-4">
            a new invoice
          </Link>
          .
        </p>
      </Card>
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
