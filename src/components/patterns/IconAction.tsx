'use client';

import type { LucideIcon } from 'lucide-react';
import { CheckCheck, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCopy } from '@/lib/useCopy';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * @level molecule
 *
 * An icon-only control that explains itself: a `sm` ghost `Button`, square,
 * muted until hovered, with the label as its accessible name and a one-word
 * tooltip for the pointer (`docs/design.md` §1.5: the two are different
 * strings, read in different contexts). Every icon in a toolbar is one of
 * these, so a row of them cannot drift apart on size, fill or whether it has
 * a name.
 */
export function IconAction({
  icon: Icon,
  label,
  tooltip,
  onClick,
  disabled,
  className,
}: {
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            className={cn('text-muted-foreground hover:text-foreground', className)}
          />
        }
      >
        <Icon className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{tooltip ?? label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The `IconAction` for the one action that happens entirely off screen. The
 * icon swaps to a double tick for a moment, and so does the name, because
 * nothing else on the page can say the value arrived.
 */
export function CopyAction({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  revertAfterMs = 1500,
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  revertAfterMs?: number;
  className?: string;
}) {
  const { copied, copy } = useCopy(value, revertAfterMs);
  const current = copied ? copiedLabel : label;
  return (
    <IconAction
      icon={copied ? CheckCheck : Copy}
      label={current}
      onClick={copy}
      className={cn(copied && 'text-primary hover:text-primary', className)}
    />
  );
}
