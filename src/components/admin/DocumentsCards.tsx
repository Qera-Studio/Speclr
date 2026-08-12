import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import DocumentRowActions from './DocumentRowActions';
import { hasTotal } from '@/lib/domain/documentQuery';
import { formatDisplayDate } from '@/lib/domain/dates';
import { computeTotals, formatINR } from '@/lib/domain/money';
import { DOC_TYPES } from '@/lib/domain/registry';
import { partyName } from '@/lib/domain/party';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * The same documents as `DocumentsTable`, laid out as cards.
 *
 * Server-renderable, pure props, no client JS — the table's constraints, for
 * the same reason: the list page renders on the server and only the browser
 * chrome around it is interactive.
 *
 * Why two shapes rather than one: a table is read down a column ("which
 * invoice is QS-INV-2627-004?"), a card is read as a unit ("what have I sent
 * Clayora?"). Both are the same rows through the same filters — `DocumentsBrowser`
 * swaps the renderer and nothing else.
 */
export interface DocumentsCardsProps {
  documents: AdminDocument[];
  /** Empty-state copy. Defaults suit the all-documents dashboard. */
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function DocumentsCards({
  documents,
  emptyTitle = 'No documents yet',
  emptyDescription = 'Create your first invoice, receipt, contract, or letter to get started.',
}: DocumentsCardsProps) {
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
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((doc) => {
        // Letters carry no line items — a ₹0 total would mislead, so show —.
        const hasMoney = hasTotal(doc);
        const totals = computeTotals(doc.lineItems, doc.gstRatePercent);
        return (
          <li key={doc.id}>
            {/*
              Same stretched-link pattern as the table row: one real anchor
              covering the card, so middle-click, ⌘-click and "copy link" all
              work and no client-side row handler is needed. The actions block
              is positioned and later in DOM order, so it paints above the
              overlay and keeps its own hit area.
            */}
            <Card size="sm" className="group/row relative h-full gap-2 transition-colors hover:bg-muted/40">
              <CardContent className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/docs/${doc.id}`}
                    className="truncate font-medium underline underline-offset-4 after:absolute after:inset-0 after:content-['']"
                  >
                    {doc.number ?? 'Draft'}
                  </Link>
                  <span className="truncate text-muted-foreground">
                    {DOC_TYPES[doc.type].label}
                  </span>
                </div>
                <Badge variant={doc.status === 'finalized' ? 'default' : 'secondary'}>
                  {doc.status === 'finalized' ? 'Finalized' : 'Draft'}
                </Badge>
              </CardContent>

              <CardContent className="flex flex-col gap-0.5">
                <span className="truncate">{partyName(doc) || '—'}</span>
                <span className="text-muted-foreground">
                  {formatDisplayDate(doc.issueDate)}
                </span>
              </CardContent>

              <CardContent className="relative mt-auto flex items-center justify-between gap-2">
                <span className="font-medium">
                  {hasMoney ? formatINR(totals.totalPaise) : '—'}
                </span>
                <DocumentRowActions doc={doc} />
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
