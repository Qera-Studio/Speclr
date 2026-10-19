'use client';

import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Banknote,
  Building2,
  CalendarDays,
  CircleDashed,
  FileText,
  Hash,
  Layers,
  Package,
} from 'lucide-react';
import { accentBadge, accentSwatch } from '@/lib/accent';
import { NIL } from '@/lib/utils';
import { totalPaiseOf, type SortColumn, type SortState } from '@/lib/domain/documentQuery';
import { documentSchedules } from '@/lib/domain/documentSchedules';
import type { ContractService } from '@/lib/domain/service';
import RecordTable, { type RecordTableProps } from '@/components/patterns/RecordTable';
import type { BulkSelection } from '@/components/patterns/BulkSelect';
import { CopyValue } from '@/components/patterns/CopyCell';
import { DateValue } from '@/components/patterns/Page';
import DocumentRowActions from './DocumentRowActions';
import { DocumentTotal } from './DocumentTotal';
import { DOC_TYPES } from '@/lib/domain/registry';
import { openDocHref } from '@/lib/profile';
import { partyName } from '@/lib/domain/party';
import type { AdminDocument, DocTypeCode } from '@/lib/domain/types';

/**
 * The documents list, and the reference for every other one.
 *
 * A `RecordTable`, like every list of records (`docs/design.md` §2.3), in the
 * wide-table arrangement the clients list settled on: the row number and the
 * Title frozen at the left and the actions at the right, hairline dividers,
 * resizable columns, and one menu per row in place of the hover-revealed
 * icons. What is left here is what is particular to a document: its columns,
 * the money rule below, and the actions.
 *
 * **The row's link lives in the Title cell, and the row number draws none.**
 * A frozen cell is positioned, so it paints above the stretched link that
 * makes the rest of the row clickable; the Title cell therefore wraps its own
 * number in the anchor (`ownOpener`), which is what a reader clicks anyway.
 * The row-number column is frozen beside it and would be handed that anchor
 * by default, being first, so it opts out too: two links to one place is a
 * duplicate tab stop with one accessible name. Every unfrozen cell opens the
 * row through the overlay, and `e2e/documents-row.spec.ts` hit-tests that.
 *
 * **Title, holding the number.** A document has no title field; its number is
 * how it is filed and referred to, and a draft has none yet, so a draft shows
 * the gray `StatusBadge` where the number will be. The Status column still
 * says Draft too, and that is deliberate: one is where the identity is, the
 * other is where the state is, and a reader scanning either column gets the
 * answer without turning to the other.
 *
 * **A hue per type**, named in `DOC_TYPES.accent` and drawn as a chip before
 * the type's name. It carries no meaning (`lib/accent.ts`): the word is
 * always beside it, and the colour only lets the eye group a column it is
 * scanning.
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
  /**
   * The services, so the Services column can turn a line's `serviceCode`
   * into a Schedule. A contract needs none: its Parts carry theirs.
   */
  catalogue?: ContractService[];
}

/** The type's hue as a swatch in the same raised box the flag sits in. */
function TypeCell({ type }: { type: DocTypeCode }) {
  const { label, accent } = DOC_TYPES[type];
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span aria-hidden className={accentSwatch(accent)} />
      <span className="truncate">{label}</span>
    </span>
  );
}

/**
 * The Schedules a document runs under, one badge each in canonical order, up
 * to all four: a contract's Parts, or the Services its lines bill
 * (`documentSchedules`). A document whose lines were all typed, or a letter,
 * shows nothing.
 *
 * Badges, not swatches: colour is never the only carrier (WCAG 1.4.1), and a
 * reader scanning the column wants the word.
 */
function ServicesCell({ doc, catalogue }: { doc: AdminDocument; catalogue: ContractService[] }) {
  const schedules = documentSchedules(doc, catalogue);
  if (schedules.length === 0) return NIL;
  return (
    <span className="flex gap-1 overflow-hidden">
      {schedules.map((schedule) => (
        <span key={schedule.key} className={accentBadge(schedule.accent)}>
          {schedule.name}
        </span>
      ))}
    </span>
  );
}

export default function DocumentsTable({
  documents,
  emptyTitle = 'No documents yet',
  emptyDescription = 'Create your first invoice, receipt, contract, or letter to get started.',
  sort,
  onSortChange,
  paging,
  selection,
  catalogue = [],
}: DocumentsTableProps) {
  // The row's place in the whole list, not on this page: page two starts at
  // eleven. `documents` is already the page's slice, so its index is the
  // offset within the page and `paging.start` is the page's own offset.
  const position = (doc: AdminDocument) => (paging?.start ?? 0) + documents.indexOf(doc) + 1;

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
      dividers
      fixed
      // Press a heading and move to drag the column; the order persists per
      // table. The library's template table has it, so this one does.
      reorderable
      actionsSticky
      columns={[
        {
          key: 'index',
          label: 'No.',
          icon: Hash,
          sticky: true,
          // 80, not 64: the heading is an icon and a word, and at 64 the word
          // clipped to "N.".
          size: 80,
          sortable: false,
          // Draws no link: see the note above. The Title beside it does.
          ownOpener: true,
          className: 'tabular-nums text-muted-foreground',
          cell: (doc) => position(doc),
        },
        {
          key: 'number',
          label: 'Title',
          icon: FileText,
          sticky: true,
          size: 190,
          // The anchor is inside the cell, wrapping the number, not beside it.
          ownOpener: true,
          sortValue: (doc) => doc.number ?? '',
          className: 'tabular-nums',
          cell: (doc) => {
            /*
              The whole row opens the document, via one stretched link rather
              than a row `onClick`: it stays a real anchor (middle-click,
              cmd-click, keyboard, "copy link"). The `relative` that overlay
              resolves against is on the row, put there by `RecordTable`, and
              it is load-bearing: a `relative` on any cell in between shrinks
              the hit area to that column, which `CopyCell` used to cause, and
              none at all lets it cover every row at once.
            */
            const link = (
              <Link
                href={openDocHref(doc)}
                className="after:absolute after:inset-0 after:content-['']"
              >
                {doc.number ?? <Badge status="draft" />}
              </Link>
            );
            // A draft has no number to copy, so no copy control either: a
            // button that copies the word "Draft" is a button that lies.
            return doc.number ? (
              <CopyValue value={doc.number} label="Copy document number" iconOnly display={link} />
            ) : (
              link
            );
          },
        },
        {
          key: 'type',
          label: 'Type',
          icon: Layers,
          size: 190,
          sortValue: (doc) => DOC_TYPES[doc.type].label,
          cell: (doc) => <TypeCell type={doc.type} />,
        },
        {
          // Not sortable: a row can carry up to four, and there is no one
          // value to order them by.
          key: 'services',
          label: 'Services',
          icon: Package,
          size: 240,
          sortable: false,
          cell: (doc) => <ServicesCell doc={doc} catalogue={catalogue} />,
        },
        {
          key: 'party',
          label: 'Client',
          icon: Building2,
          size: 220,
          trunc: true,
          cell: (doc) => partyName(doc),
        },
        {
          /*
            `DateValue`, not `DateCell`: under `table-layout: fixed` a cell this
            column did not render is a cell it cannot put a width on.
          */
          key: 'date',
          label: 'Date',
          icon: CalendarDays,
          size: 130,
          sortValue: (doc) => doc.issueDate,
          cell: (doc) => <DateValue value={doc.issueDate} />,
          className: 'tabular-nums',
        },
        {
          /*
            Drawn as the clients list draws an amount: the currency in a raised
            chip, the digits beside it, left-aligned under a heading with an
            icon like every other column. The chip is what lines the figures
            up down the column, and `tabular-nums` keeps the digit positions
            comparable without the right edge doing it.
          */
          key: 'total',
          label: 'Total',
          icon: Banknote,
          size: 170,
          sortValue: (doc) => totalPaiseOf(doc) ?? 0,
          className: 'tabular-nums',
          cell: (doc) => <DocumentTotal doc={doc} />,
        },
        {
          key: 'status',
          label: 'Status',
          icon: CircleDashed,
          size: 120,
          sortValue: (doc) => doc.status,
          cell: (doc) => <Badge status={doc.status} />,
        },
      ]}
      actions={(doc) => <DocumentRowActions doc={doc} />}
      empty={{ icon: <FileText />, title: emptyTitle, description: emptyDescription }}
    />
  );
}
