'use client';

import type { ReactNode } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { IconAction } from '@/components/patterns/IconAction';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * A fork of the drawer, for trying a new design on.
 *
 * **This is a copy, on purpose, and nothing in the app imports it.** It is
 * `ui/drawer-sheet.tsx` and `ui/drawer-toolbar.tsx` folded into one file, taken
 * on 5 October 2026 so the drawer's design can be changed here without the
 * services page, the clause library and every other drawer moving with it. The
 * library's usual rule is that it imports the real primitive and never holds a
 * copy; an experiment is the one case where a copy is the point.
 *
 * It ends one of two ways. A design that wins is written back into the two
 * `ui/` files and this file is deleted; one that loses is deleted. Either way
 * it does not stay as a second drawer.
 */
export function ExperimentDrawer({
  open,
  onOpenChange,
  title,
  description,
  titleAside,
  toolbar,
  footer,
  quietFooter,
  children,
  size = 'md',
  side = 'right',
  float,
  showCloseButton,
  headerBorder,
  overlayClassName,
  className,
  headerClassName,
  bodyClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  titleAside?: ReactNode;
  toolbar?: ReactNode;
  footer?: ReactNode;
  quietFooter?: boolean;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  side?: 'top' | 'right' | 'bottom' | 'left';
  float?: boolean;
  showCloseButton?: boolean;
  headerBorder?: boolean;
  overlayClassName?: string;
  className?: string;
  /** Overrides the header's padding and layout. */
  headerClassName?: string;
  bodyClassName?: string;
}) {
  const closeButton = showCloseButton ?? !toolbar;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        size={size}
        float={float}
        showCloseButton={closeButton}
        overlayClassName={overlayClassName}
        className={cn('gap-0 p-0', className)}
      >
        {toolbar}

        <SheetHeader
          className={cn('gap-1 p-4', closeButton && 'pr-16', headerBorder && 'border-b', headerClassName)}
        >
          {titleAside ? (
            <div className="flex items-start justify-between gap-3">
              <SheetTitle className="text-section">{title}</SheetTitle>
              <span className="flex shrink-0 items-center gap-2">{titleAside}</span>
            </div>
          ) : (
            <SheetTitle className="text-section">{title}</SheetTitle>
          )}
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>

        <div className={cn('min-h-0 flex-1 overflow-y-auto p-4', bodyClassName)}>{children}</div>

        {footer ? (
          quietFooter ? (
            <div className="flex flex-row items-center justify-end gap-2">{footer}</div>
          ) : (
            <SheetFooter className="mt-0 flex-row items-center gap-2 border-t p-4">
              {footer}
            </SheetFooter>
          )
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/** The fork of `DrawerToolbar`: back, expand, the pager, then the record's actions. */
export function ExperimentDrawerToolbar({
  onBack,
  backLabel = 'Back to the list',
  expanded,
  onExpandedChange,
  expandLabel = 'this record',
  paging,
  actions,
  className,
  'data-testid': testId,
}: {
  onBack?: () => void;
  backLabel?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  expandLabel?: string;
  paging?: ExperimentDrawerPaging;
  actions?: ReactNode;
  /** Overrides the row's padding. */
  className?: string;
  'data-testid'?: string;
}) {
  const canExpand = expanded !== undefined && onExpandedChange !== undefined;

  return (
    <div
      data-testid={testId}
      className={cn('relative flex items-center gap-1 px-2 py-1.5', className)}
    >
      {onBack ? (
        <IconAction icon={ArrowLeft} label={backLabel} tooltip="Back" onClick={onBack} />
      ) : null}

      {canExpand ? (
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

export interface ExperimentDrawerPaging {
  onPage: (by: -1 | 1) => void;
  hasPrevious: boolean;
  hasNext: boolean;
  position: ReactNode;
  disabled?: boolean;
  previousLabel?: string;
  nextLabel?: string;
}

function Pager({
  onPage,
  hasPrevious,
  hasNext,
  position,
  disabled,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: ExperimentDrawerPaging) {
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
        {position ? (
          <span className="min-w-20 text-center text-meta text-muted-foreground tabular-nums">
            {position}
          </span>
        ) : null}
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
