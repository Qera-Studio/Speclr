'use client';

import { useCallback, useRef } from 'react';

export const SIDEBAR_MIN_WIDTH = 192;
export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MAX_WIDTH = 360;

/** Clamp a proposed sidebar width (px) into the allowed range. */
export function clampWidth(px: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, px));
}

interface SidebarResizeHandleProps {
  width: number;
  onWidthChange: (next: number) => void;
}

/**
 * A thin drag handle on the sidebar's right edge. Dragging resizes the sidebar
 * live within [MIN, MAX]; arrow keys nudge it for keyboard users. Session-only —
 * the width isn't persisted. Hidden when the sidebar is collapsed to the rail.
 */
export default function SidebarResizeHandle({ width, onWidthChange }: SidebarResizeHandleProps) {
  const startX = useRef(0);
  const startWidth = useRef(width);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const delta = e.clientX - startX.current;
      onWidthChange(clampWidth(startWidth.current + delta));
    },
    [onWidthChange],
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
      onWidthChange(clampWidth(width - 16));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onWidthChange(clampWidth(width + 16));
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="absolute inset-y-0 left-(--sidebar-width) z-20 hidden w-1.5 -translate-x-1/2 cursor-col-resize focus-visible:outline-none md:block peer-data-[state=collapsed]:hidden"
    />
  );
}
