import Link from 'next/link';
import { Plus } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { DocumentCard } from './DocumentsCards';
import { formatDisplayMonth } from '@/lib/domain/dates';
import { DOC_TYPES } from '@/lib/domain/registry';
import { newDocHref } from '@/lib/profile';
import type { DocumentGroup, GroupBy } from '@/lib/domain/documentQuery';
import type { DocStatus, DocTypeCode } from '@/lib/domain/types';

/**
 * The same documents as the table and the cards, cut into columns.
 *
 * A third reading of one list: the table is read down a column ("which invoice
 * is QS-INV-2627-004?"), a card is read as a unit ("what have I sent
 * Clayora?"), a board is read across ("what is still a draft?"). Same rows,
 * same filters — `DocumentsBrowser` swaps the renderer and nothing else — and
 * the card itself is literally the card view's, so the three cannot drift about
 * what a document looks like.
 *
 * **This is `services/ServiceCards`' board, and every visual decision here is
 * that component's** — the bordered `bg-muted` column, the `px-3 py-2` header
 * with its name and count, the column's own scroll with the heading parked
 * outside it, the cards on their own fill inside. The app has one board and it
 * had already been tuned; a second one drawn from scratch is how a design system
 * becomes a suggestion. Change one of these and change both.
 *
 * The single departure is the axis, and the column count forces it. `ServiceCards`
 * can hardcode a four-column grid because there are exactly four Schedules;
 * there are five document types per profile and any number of months. So the
 * width of four of that grid's columns is written out instead, and the row
 * scrolls past the fourth: a column is the same size on both boards whether it
 * is one of two or one of fourteen, which is what stops the same card being
 * drawn at two widths a page apart.
 *
 * **Nothing here drags, and that is deliberate rather than unfinished.** The
 * gesture a board invites is moving a card between columns, and every column
 * this offers is either impossible to move between (a document's type, its
 * issue month) or catastrophic to move between by accident: dropping a card in
 * "Finalized" would finalize it, which claims a number in the FY series and
 * makes the document immutable and retained for 72 months (`CONTEXT.md` §4).
 * Finalizing is a decision taken in the editor with the document in front of
 * you, never a drop target. If a lawful, reversible column ever exists, this is
 * where the gesture would go.
 *
 * The board shows every row that passed the filters rather than one page of
 * them: a column that silently held back half its cards would misreport the
 * one thing a board is for, which is how much is in each.
 */
export default function DocumentsKanban({
  groups,
  groupBy,
}: {
  groups: DocumentGroup[];
  /** Only to label a column — the grouping itself already happened. */
  groupBy: GroupBy;
}) {
  // Composed rather than `useId`, so this stays what the card view is: pure
  // props, no hooks, server-renderable. One board per page, and the grouped
  // values are unique within it, so the pair is unique on the page.
  //
  // `aria-labelledby` rather than `ServiceCards`' `aria-label`, because a status
  // column is named by a `StatusBadge` and the plain word would be a second
  // place to disagree about what "finalized" is called (`CONTEXT.md` §5e).
  const headingId = (key: string) => `doc-board-${groupBy}-${key}`;

  return (
    // The column width is `ServiceCards`' four-column grid, written out: the
    // page's own width less its three gaps, quartered. `max()` keeps a floor
    // under it on a narrow window, where a quarter of the page is unreadable
    // and scrolling is the better answer.
    <div className="grid min-h-0 flex-1 auto-cols-[max(15rem,calc((100%_-_3rem)/4))] grid-flow-col gap-4 overflow-x-auto pb-1">
      {groups.map((group) => (
        <section
          key={group.key}
          aria-labelledby={headingId(group.key)}
          // `bg-muted` is one step up the ramp from the page, which puts the
          // column between the page and the cards' own fill.
          className="flex min-h-0 flex-col rounded-md border border-border bg-muted"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <h2
              id={headingId(group.key)}
              className="min-w-0 truncate text-sm font-medium"
            >
              {groupBy === 'status' ? (
                <StatusBadge status={group.key as DocStatus} />
              ) : groupBy === 'type' ? (
                DOC_TYPES[group.key as DocTypeCode].label
              ) : (
                formatDisplayMonth(group.key)
              )}
            </h2>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {group.documents.length}
            </span>
          </div>

          {groupBy === 'type' && group.documents.length === 0 ? (
            <NewInColumn code={group.key as DocTypeCode} />
          ) : (
            /* The scroll lives here, not on the page: one busy column should not
               push the others off the bottom, and the heading stays put outside
               it. `flex-1` reaches a real height because the page runs full
               height for this view, exactly as the catalogue's does. */
            <ul className="scrollbar-none flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-1 pb-1">
              {group.documents.map((doc) => (
                <li key={doc.id}>
                  <DocumentCard doc={doc} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/**
 * What an empty *type* column holds instead of nothing.
 *
 * Only the type axis gets this, because it is the only one where the column
 * names something you can create. A month is past and a status is the outcome
 * of finalizing, so "new document in December" and "new finalized document"
 * are both offers the app cannot honour.
 *
 * Deliberately not `AddLink`: that carries `buttonVariants`, whose fixed height
 * would leave the button floating at the top of an otherwise blank column. The
 * whole column body is the target, which is also what makes the empty column
 * read as an invitation rather than an absence.
 */
function NewInColumn({ code }: { code: DocTypeCode }) {
  const spec = DOC_TYPES[code];
  return (
    <Link
      href={newDocHref(code, spec.slug)}
      className="mx-1 mb-1 flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-input text-sm text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Plus className="size-4" aria-hidden="true" />
      New {spec.label.toLowerCase()}
    </Link>
  );
}
