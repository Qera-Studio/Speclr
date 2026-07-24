'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';

/**
 * confirmSwap — the reusable action-feedback sequence.
 *
 * A button that answers the cues a bare button misses:
 *   1. hover  → the idle icon plays a small animation (e.g. the download arrow
 *               bobs) — the button itself does NOT lift or scale.
 *   2. click  → `onAction` fires immediately; after `confirmDelayMs` the icon +
 *               label SNAP to a confirming state (double-check + "Downloaded"),
 *               then snap back to idle after `revertAfterMs`.
 *
 * The button width is fixed to fit the LARGER of the idle / confirm content
 * (both are rendered stacked in a grid cell; only the active one is visible), so
 * the swap never resizes the button — no glitchy width snap.
 *
 * Say "add confirmSwap to this button" on any action (download, save, copy,
 * send). `onAction` does the real work; the confirm state shows regardless.
 */
export type IconMotion = 'bob-down' | 'bob-up' | 'none';

export interface ConfirmButtonProps extends VariantProps<typeof buttonVariants> {
  idleIcon: LucideIcon;
  idleLabel: string;
  confirmIcon: LucideIcon;
  confirmLabel: string;
  onAction: () => void;
  /**
   * Custom idle-icon node (e.g. <TrayArrowIcon direction="down" />). When given,
   * it replaces `idleIcon` and its own hover animation runs off the button's
   * "rest"/"hover" variant state; `iconMotion` is ignored.
   */
  idleIconSlot?: React.ReactNode;
  /** Hover animation for the (default) idle icon. */
  iconMotion?: IconMotion;
  /** Delay between click and the swap to the confirm state. */
  confirmDelayMs?: number;
  /** How long the confirm state lingers before snapping back to idle. */
  revertAfterMs?: number;
  className?: string;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

const ICON_HOVER_VARIANTS = {
  'bob-down': { rest: { y: 0 }, hover: { y: 2 } },
  'bob-up': { rest: { y: 0 }, hover: { y: -2 } },
  none: { rest: { y: 0 }, hover: { y: 0 } },
} as const;

export function ConfirmButton({
  idleIcon: IdleIcon,
  idleLabel,
  confirmIcon: ConfirmIcon,
  confirmLabel,
  onAction,
  idleIconSlot,
  iconMotion = 'bob-down',
  confirmDelayMs = 500,
  revertAfterMs = 1500,
  variant = 'outline',
  size,
  className,
  type = 'button',
  'aria-label': ariaLabel,
}: ConfirmButtonProps) {
  const [confirmed, setConfirmed] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      if (revertTimer.current) clearTimeout(revertTimer.current);
    };
  }, []);

  const handleClick = () => {
    onAction();
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    if (revertTimer.current) clearTimeout(revertTimer.current);
    confirmTimer.current = setTimeout(() => {
      setConfirmed(true);
      revertTimer.current = setTimeout(() => setConfirmed(false), revertAfterMs);
    }, confirmDelayMs);
  };

  const iconVariants = ICON_HOVER_VARIANTS[iconMotion];

  return (
    <motion.button
      type={type}
      onClick={handleClick}
      aria-label={ariaLabel}
      data-slot="button"
      initial="rest"
      animate="rest"
      whileHover="hover"
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {/* Both states share one grid cell so the button sizes to the larger of
          the two — the swap never changes the button width. */}
      <span className="grid items-center justify-items-center">
        <span
          aria-hidden={confirmed}
          className={cn(
            'col-start-1 row-start-1 inline-flex items-center gap-2',
            confirmed && 'invisible',
          )}
        >
          {idleIconSlot ?? (
            <motion.span
              className="inline-flex"
              variants={iconVariants}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            >
              <IdleIcon aria-hidden="true" />
            </motion.span>
          )}
          {idleLabel}
        </span>

        <span
          aria-hidden={!confirmed}
          className={cn(
            'col-start-1 row-start-1 inline-flex items-center gap-2',
            !confirmed && 'invisible',
          )}
        >
          <ConfirmIcon aria-hidden="true" />
          {confirmLabel}
        </span>
      </span>
    </motion.button>
  );
}
