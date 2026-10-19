'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { buttonVariants } from '@/components/ui/button';
import type { VariantProps } from 'class-variance-authority';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';

/**
 * @level molecule
 *
 * A button that asks before it acts: `Button` as the trigger of a
 * `ConfirmDialog`. The wording rules are the dialog's; this only decides what
 * the button looks like. An `icon` makes it icon-only, with the label as the
 * accessible name and a one-word `tooltip` for the pointer.
 */
interface ConfirmActionButtonProps {
  label: string;
  icon?: React.ReactNode;
  tooltip?: string;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  pending?: boolean;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  confirmVariant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  className?: string;
}

function ConfirmActionButton({
  label,
  icon,
  tooltip,
  title,
  description,
  confirmLabel,
  onConfirm,
  disabled,
  pending,
  variant = 'secondary',
  confirmVariant,
  size,
  className,
}: ConfirmActionButtonProps) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          type="button"
          variant={variant}
          size={size}
          icon={icon ? true : undefined}
          disabled={disabled}
          pending={pending}
          className={className}
        >
          {icon ? (
            <>
              {icon}
              <span className="sr-only">{label}</span>
            </>
          ) : (
            label
          )}
        </Button>
      }
      tooltip={tooltip}
      title={title}
      consequence={description}
      confirmLabel={confirmLabel ?? label}
      destructive={confirmVariant === 'destructive'}
      onConfirm={onConfirm}
    />
  );
}

/**
 * The one way a repeatable row leaves a list: a quiet trash icon that still
 * asks first. A bare "Remove" read as heavily as the fields beside it and
 * warned about nothing.
 */
function RemoveButton({
  label,
  onConfirm,
  disabled,
  tooltip = 'Remove',
  confirmTitle,
  confirmDescription = "This can't be undone.",
  className,
}: {
  label: string;
  onConfirm: () => void;
  disabled?: boolean;
  tooltip?: string;
  confirmTitle?: string;
  confirmDescription?: string;
  className?: string;
}) {
  return (
    <ConfirmDialog
      size="sm"
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon
          disabled={disabled}
          aria-label={label}
          className={cn(
            'text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive',
            className,
          )}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      }
      tooltip={tooltip}
      title={confirmTitle ?? label}
      consequence={confirmDescription}
      confirmLabel="Remove"
      destructive
      onConfirm={onConfirm}
    />
  );
}

export { ConfirmActionButton, RemoveButton };
