'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import IconAction from '@/components/ui/icon-action';

/**
 * The control row above a drawer's header.
 *
 * Ordered by what each control acts on, left to right: **leaving** (back),
 * then **the panel** (expand); in the centre, **which record is open**; then,
 * at the right end, **the record itself**, which the caller supplies in rising
 * order of consequence.
 *
 * There is deliberately no separate close X. Back does that job, and the
 * sheet's own button is turned off whenever a toolbar is present
 * (`DrawerSheet`), because two controls doing one job in one corner is what
 * this row exists to avoid — and left on, it overlapped the last action.
 *
 * Every part is optional. A drawer that only wants a back arrow passes
 * `onBack` and nothing else.
 */
export function DrawerToolbar({
  onBack,
  backLabel = 'Back to the list',
  expanded,
  onExpandedChange,
  expandLabel = 'this record',
  paging,
  actions,
  'data-testid': testId,
}: {
  /** Omitted, no back arrow is drawn. */
  onBack?: () => void;
  backLabel?: string;
  /** Pass both to offer the expand toggle. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Named in the expand control's accessible label: "Expand this clause". */
  expandLabel?: string;
  paging?: DrawerPaging;
  /** The record's own actions, at the right end. */
  actions?: ReactNode;
  'data-testid'?: string;
}) {
  const canExpand = expanded !== undefined && onExpandedChange !== undefined;

  return (
    <div data-testid={testId} className="relative flex items-center gap-1 px-2 py-1.5">
      {onBack ? (
        <IconAction icon={ArrowLeft} label={backLabel} tooltip="Back" onClick={onBack} />
      ) : null}

      {canExpand ? (
        // One button rather than two: whichever icon is not the current state
        // is the action, so there is never an inert control.
        <IconAction
          icon={expanded ? Minimize : Maximize}
          label={expanded ? 'Collapse to the side panel' : `Expand ${expandLabel}`}
          tooltip={expanded ? 'Collapse' : 'Expand'}
          onClick={() => onExpandedChange(!expanded)}
        />
      ) : null}

      {paging ? <Pager {...paging} /> : null}

      {actions ? <div className="ml-auto flex items-center gap-1">{actions}</div> : null}
    </div>
  );
}

export interface DrawerPaging {
  /** Called with -1 or 1. Disabled where the corresponding neighbour is absent. */
  onPage: (by: -1 | 1) => void;
  hasPrevious: boolean;
  hasNext: boolean;
  /** What is open, e.g. "Clause 3". Shown between the arrows. */
  position: ReactNode;
  disabled?: boolean;
  previousLabel?: string;
  nextLabel?: string;
}

/**
 * Previous and next, with what is open between them.
 *
 * **By position in the list, never by arithmetic on an identifier.** A clause
 * number is never reissued, so a deleted one leaves a gap and `number + 1`
 * pages into nothing (`CONTEXT.md` §5c). The caller resolves the neighbours and
 * passes whether they exist; this only draws the control.
 *
 * The ends stop rather than wrap. These lists have an order that means
 * something (an agreement's clause order), and a list that runs off the end
 * and back to the start has lost it.
 *
 * `absolute`, so the position is centred on the *row* rather than on whatever
 * space the icon groups leave. Those groups are different widths and change
 * width as an action's label changes, so a flex centre would sit the number
 * off-centre and then move it.
 */
function Pager({
  onPage,
  hasPrevious,
  hasNext,
  position,
  disabled,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: DrawerPaging) {
  return (
    <div className="pointer-events-none absolute inset-x-0 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1">
        <IconAction
          icon={ChevronLeft}
          label={previousLabel}
          tooltip="Previous"
          disabled={!hasPrevious || disabled}
          onClick={() => onPage(-1)}
        />
        <span className="min-w-20 text-center text-xs text-muted-foreground tabular-nums">
          {position}
        </span>
        <IconAction
          icon={ChevronRight}
          label={nextLabel}
          tooltip="Next"
          disabled={!hasNext || disabled}
          onClick={() => onPage(1)}
        />
      </div>
    </div>
  );
}
