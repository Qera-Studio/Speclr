'use client';

import { useCallback, useRef } from 'react';

export const SIDEBAR_MIN_WIDTH = 192;
export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MAX_WIDTH = 360;

/** Clamp a proposed sidebar width (px) into the allowed range. */
export function clampWidth(px: number, min = SIDEBAR_MIN_WIDTH, max = SIDEBAR_MAX_WIDTH): number {
  return Math.min(max, Math.max(min, px));
}

interface SidebarResizeHandleProps {
  width: number;
  onWidthChange: (next: number) => void;
  /**
   * Which sidebar edge this handle belongs to. On a right-hand sidebar the drag
   * axis is inverted (dragging left widens) and the handle pins to the sidebar's
   * left edge instead of its right.
   */
  side?: 'left' | 'right';
  min?: number;
  max?: number;
  label?: string;
}

/**
 * A thin drag handle on a sidebar's inner edge. Dragging resizes the sidebar
 * live within [min, max]; arrow keys nudge it for keyboard users. Session-only —
 * the width isn't persisted. Hidden when the sidebar is collapsed to the rail.
 */
export default function SidebarResizeHandle({
  width,
  onWidthChange,
  side = 'left',
  min = SIDEBAR_MIN_WIDTH,
  max = SIDEBAR_MAX_WIDTH,
  label = 'Resize sidebar',
}: SidebarResizeHandleProps) {
  const startX = useRef(0);
  const startWidth = useRef(width);
  // A right-hand sidebar grows as the pointer moves *left*, so invert the delta.
  const direction = side === 'right' ? -1 : 1;

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const delta = (e.clientX - startX.current) * direction;
      onWidthChange(clampWidth(startWidth.current + delta, min, max));
    },
    [onWidthChange, direction, min, max],
  );

  const onPointerUp = useCallback(() => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }, [onPointerMove]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onWidthChange(clampWidth(width - 16 * direction, min, max));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onWidthChange(clampWidth(width + 16 * direction, min, max));
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className={
        side === 'right'
          ? 'absolute inset-y-0 right-(--sidebar-width) z-20 hidden w-1.5 translate-x-1/2 cursor-col-resize focus-visible:outline-none md:block peer-data-[state=collapsed]:hidden'
          : 'absolute inset-y-0 left-(--sidebar-width) z-20 hidden w-1.5 -translate-x-1/2 cursor-col-resize focus-visible:outline-none md:block peer-data-[state=collapsed]:hidden'
      }
    />
  );
}
