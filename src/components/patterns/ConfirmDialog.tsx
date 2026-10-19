'use client';

import type { ReactElement, ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * @level molecule
 *
 * The one confirmation. Every "are you sure" in the app is this component,
 * and the wording is fixed by it rather than by whoever writes the call site
 * (`docs/design.md` §2.6):
 *
 * - **The title is the verb and the object, with no question mark.** "Delete
 *   draft", "Leave page", "Archive service". A title that asks a question
 *   makes the reader answer it twice, once here and once on the button.
 * - **The consequence is one sentence** that says what cannot be undone.
 * - **Cancel is always the word "Cancel"**, and it is `ghost`. There were
 *   nine hand-written dialogs with "Cancel", "Stay" and "Keep editing"
 *   between them before this existed, which is the whole reason it exists.
 * - **The confirm repeats the verb and the object**, so the button that does
 *   the thing says what the thing is. `destructive` makes it solid red; the
 *   tint that a destructive button wears among other controls is wrong here,
 *   because by now the destruction is the only thing on screen.
 *
 * Controlled (`open` / `onOpenChange`) for a dialog raised from a menu item
 * or a guard, or uncontrolled with a `trigger` for a button that opens it.
 * `extra` is a third action for the one dialog that has a better answer than
 * either (the unsaved-changes guard's "Save and leave"); it sits last so the
 * eye lands on it.
 */
export interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A button that opens the dialog. Rendered as the trigger, so one element is both. */
  trigger?: ReactElement;
  /** One word for the pointer, beside a trigger that is an icon. The `aria-label` keeps its object. */
  tooltip?: string;
  title: string;
  consequence: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
  extra?: ReactNode;
  size?: 'default' | 'sm';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  tooltip,
  title,
  consequence,
  confirmLabel,
  destructive,
  pending,
  disabled,
  onConfirm,
  extra,
  size,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        tooltip ? (
          /* The tooltip wraps the *trigger*, not the button, so one element is
             both. Nested the other way the dialog's trigger is the tooltip's
             wrapper, and the dialog opens from an element nobody clicked. */
          <Tooltip>
            <TooltipTrigger render={<AlertDialogTrigger render={trigger} />} />
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ) : (
          <AlertDialogTrigger render={trigger} />
        )
      ) : null}
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{consequence}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'primary'}
            disabled={disabled || pending}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </AlertDialogAction>
          {extra}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
