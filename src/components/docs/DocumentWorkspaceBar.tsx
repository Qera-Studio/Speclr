'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PreviewZoom } from './DocumentPreview';

/**
 * The top edge of the document card: title on the left, view controls on the
 * right. Deliberately *not* a separate floating panel — it shares the card's
 * background and sits above the scrolling preview as one surface (the same
 * relationship `AdminHeader` has to the admin inset).
 *
 * Purely presentational: page/zoom state lives in `DocumentWorkspace`.
 */
export default function DocumentWorkspaceBar({
  title,
  zoom,
  onZoomChange,
  currentPage,
  pageCount,
  onPrev,
  onNext,
}: {
  title: string;
  zoom: PreviewZoom;
  onZoomChange: (zoom: PreviewZoom) => void;
  currentPage: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const atFirst = currentPage <= 0;
  const atLast = currentPage >= pageCount - 1;

  return (
    <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
      <h1 className="truncate text-sm font-medium">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1" role="group" aria-label="Preview zoom">
          <ZoomButton pressed={zoom === 'fit'} onClick={() => onZoomChange('fit')}>
            Fit
          </ZoomButton>
          <ZoomButton pressed={zoom === 'full'} onClick={() => onZoomChange('full')}>
            100%
          </ZoomButton>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onPrev}
            disabled={atFirst}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span
            className="min-w-[76px] text-center text-xs text-muted-foreground [font-variant-numeric:tabular-nums]"
            aria-live="polite"
          >
            Page {currentPage + 1} / {pageCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onNext}
            disabled={atLast}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ZoomButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(pressed && 'bg-muted text-foreground')}
    >
      {children}
    </Button>
  );
}
