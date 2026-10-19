import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import DocumentRowActions from './DocumentRowActions';
import { DocumentTotal } from './DocumentTotal';
import { formatDisplayDate } from '@/lib/domain/dates';
import { DOC_TYPES } from '@/lib/domain/registry';
import { openDocHref } from '@/lib/profile';
import { partyName } from '@/lib/domain/party';
import type { AdminDocument } from '@/lib/domain/types';
import { NIL } from '@/lib/utils';

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

/**
 * One document as a card.
 *
 * Its own export because the board (`DocumentsKanban`) stacks the same card in
 * columns. Two views drawing a document two ways is the drift `StatusBadge` and
 * `DateCell` exist to stop, one level up (`CONTEXT.md` §5e).
 *
 * The stretched link is the whole reason this is one anchor and not a click
 * handler: middle-click, ⌘-click and "copy link" all work, and the actions
 * block is positioned and later in DOM order so it paints above the overlay and
 * keeps its own hit area.
 */
export function DocumentCard({ doc }: { doc: AdminDocument }) {
  return (
    // `hover:bg-hover`, not the `hover:bg-muted/40` a table row uses. On the
    // board this card sits in a `bg-muted` column, and 40% of the column's own
    // fill over a card that is one step lighter lands within a hair of the
    // column: the hover read as the card *disappearing* into the well. See the
    // token's note in `globals.css`.
    <Card size="sm" className="group/row relative h-full gap-2 transition-colors hover:bg-hover">
      <CardContent className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            href={openDocHref(doc)}
            className="truncate font-medium underline underline-offset-4 after:absolute after:inset-0 after:content-['']"
          >
            {doc.number ?? 'Draft'}
          </Link>
          <span className="truncate text-muted-foreground">
            {DOC_TYPES[doc.type].label}
          </span>
        </div>
        <Badge status={doc.status} />
      </CardContent>

      <CardContent className="flex flex-col gap-0.5">
        <span className="truncate">{partyName(doc) || NIL}</span>
        <span className="text-muted-foreground">
          {formatDisplayDate(doc.issueDate)}
        </span>
      </CardContent>

      <CardContent className="relative mt-auto flex items-center justify-between gap-2">
        <span className="font-medium">
          <DocumentTotal doc={doc} />
        </span>
        <DocumentRowActions doc={doc} />
      </CardContent>
    </Card>
  );
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
      {documents.map((doc) => (
        <li key={doc.id}>
          <DocumentCard doc={doc} />
        </li>
      ))}
    </ul>
  );
}
