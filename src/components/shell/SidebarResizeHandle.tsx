'use client';

import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

export const SIDEBAR_MIN_WIDTH = 192;
export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MAX_WIDTH = 360;

/**
 * How far past the minimum a drag has to push before the rail snaps closed,
 * and how far a drag on the closed rail has to pull before it snaps open. One
 * number for both so the gesture is symmetric, and it doubles as the
 * hysteresis band: between `min - SNAP` and `min` nothing changes, so a hand
 * resting near the threshold does not flicker the rail open and closed.
 */
export const SNAP_DISTANCE = 48;

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
  className?: string;
}

/**
 * The drag handle for the nav rail's width. Dragging resizes the rail live
 * within [min, max]; arrow keys nudge it for keyboard users. Session-only:
 * the width is not persisted.
 *
 * **Where it sits is the illusion, and it is deliberate.** It is positioned by
 * its caller on the inset card's left edge, not on the nav's right edge, and
 * it draws nothing of its own: the card's ring darkens under it (see
 * `AdminShell`). What the hand feels it is doing is pulling the card wider or
 * narrower; what actually changes is `--sidebar-width`, and the card follows
 * because it is the flex remainder.
 *
 * **Past the minimum it snaps.** A width is clamped to `min`, but the drag is
 * not: push `SNAP_DISTANCE` further and the rail collapses to its icon strip;
 * pull the collapsed rail `SNAP_DISTANCE` the other way and it opens again at
 * `min` and keeps following the hand. Both go through `setOpen`, so the
 * `sidebar_state` cookie is written exactly as a toggle would. That is why
 * the handle stays mounted while the rail is collapsed, and why it reads
 * `useSidebar`.
 */
export default function SidebarResizeHandle({
  width,
  onWidthChange,
  side = 'left',
  min = SIDEBAR_MIN_WIDTH,
  max = SIDEBAR_MAX_WIDTH,
  label = 'Resize sidebar',
  className,
}: SidebarResizeHandleProps) {
  const { open, setOpen } = useSidebar();
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  /**
   * Where along the edge the pointer is, as `--y` on the handle. A direct
   * style write rather than state: it changes on every pointer move and
   * nothing but the glow reads it. Tracked while hovering and, through the
   * document listener, for the whole drag, so the glow rides the hand.
   */
  const trackY = useCallback((clientY: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--y', `${clientY - el.getBoundingClientRect().top}px`);
  }, []);
  const startWidth = useRef(width);
  // `open` as the drag saw it last, so a snap mid-drag is applied once and
  // the next move reasons from the new state rather than the render's.
  const openRef = useRef(open);
  openRef.current = open;
  // A right-hand sidebar grows as the pointer moves *left*, so invert the delta.
  const direction = side === 'right' ? -1 : 1;

  /**
   * One rule for every move, stated on the *virtual* width the drag has
   * reached (start plus travel, unclamped):
   *
   * - below `min - SNAP`: collapsed
   * - at or above `min`: expanded, at the clamped width
   * - between: the rail stays whichever it is; if open, it holds at `min`
   *
   * A drag that starts on the collapsed rail begins at `min - SNAP`, so
   * pulling `SNAP` px crosses `min` and opens it, symmetric with the push that
   * closed it.
   */
  const applyVirtual = useCallback(
    (virtual: number) => {
      if (virtual < min - SNAP_DISTANCE) {
        if (openRef.current) {
          openRef.current = false;
          setOpen(false);
        }
        return;
      }
      if (virtual >= min && !openRef.current) {
        openRef.current = true;
        setOpen(true);
      }
      if (openRef.current) onWidthChange(clampWidth(virtual, min, max));
    },
    [min, max, setOpen, onWidthChange],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      trackY(e.clientY);
      const delta = (e.clientX - startX.current) * direction;
      applyVirtual(startWidth.current + delta);
    },
    [applyVirtual, direction, trackY],
  );

  const onPointerUp = useCallback(() => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.body.style.removeProperty('user-select');
    delete document.body.dataset.resizing;
  }, [onPointerMove]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = open ? width : min - SNAP_DISTANCE;
    // The cursor for the drag's duration is `body[data-resizing]`'s rule in
    // `globals.css`, the same themed glyph the handle shows at rest; it rides
    // the mark set below rather than being written here as a second string
    // that could drift from the first.
    document.body.style.userSelect = 'none';
    // `ui/sidebar.tsx` animates the rail's width over 200ms, which is right
    // for a collapse and wrong under a hand: every pointer move became a new
    // easing target and the rail trailed the pointer by most of the drag
    // (measured: 80px of travel, 1px moved by the last event). The rail drops
    // its transition while this is set, the same way the cursor above is set
    // for the drag's duration and not a frame longer. The glow below reads it
    // too, to stay lit once the pointer has left the 6px strip mid-drag.
    document.body.dataset.resizing = '';
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  // The same rule the drag uses, one nudge at a time: at `min` a further
  // left collapses, and from collapsed a right opens at `min`.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = (e.key === 'ArrowRight' ? 16 : -16) * direction;
    if (!open) {
      if (step > 0) applyVirtual(min);
      return;
    }
    if (width === min && step < 0) {
      applyVirtual(min - SNAP_DISTANCE - 1);
      return;
    }
    applyVirtual(width + step);
  };

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={open ? width : min}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => trackY(e.clientY)}
      onKeyDown={onKeyDown}
      data-slot="sidebar-resize-handle"
      // A 6px hit strip straddling the edge it is placed on. Its only visual
      // is the glow below, so there is no fill and no outline here.
      className={cn(
        'group/resize absolute inset-y-0 z-20 hidden w-1.5 cursor-(--cursor-col-resize) focus-visible:outline-none md:block',
        side === 'right' ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2',
        className,
      )}
    >
      {/*
        The glow: a 1px line laid exactly over the card's ring, lit at full
        strength where the pointer is and fading to nothing `--fade` px above
        and below. The whole edge never lights; the affordance is local to the
        hand, and it rides the hand up and down.

        `left: 2px` is the ring's column. The strip is 6px wide and centred on
        the card's edge, so the card's own box begins at 3px, and its `ring-1`
        is the pixel before that. On a right-hand rail the mirror is 3px.

        Shown on hover, on keyboard focus (centred, since there is no pointer
        to follow) and for the whole drag via the body mark, because the
        pointer leaves this strip the moment the rail moves.
      */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-0 w-px opacity-0 transition-opacity group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100 [body[data-resizing]_&]:opacity-100',
          side === 'right' ? 'left-[3px]' : 'left-[2px]',
        )}
        style={{
          background:
            'linear-gradient(to bottom, transparent calc(var(--y, 50%) - var(--fade)), var(--ring) var(--y, 50%), transparent calc(var(--y, 50%) + var(--fade)))',
          ['--fade' as string]: '160px',
        }}
      />
    </div>
  );
}
