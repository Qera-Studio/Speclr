"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
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
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

/**
 * A button whose action is confirmed in the app's own dialog.
 *
 * The editors used `window.confirm`, which draws the browser's grey OS box —
 * unstyled, unthemed, and impossible to word properly. This is for the
 * consequential document actions: finalizing (which claims a permanent number
 * and makes the document immutable) and deleting a draft.
 *
 * `RemoveButton` covers the icon-sized "remove a row" case; this one is for a
 * labelled button that needs a real explanation before it fires.
 */
interface ConfirmActionButtonProps {
  label: string
  /**
   * Drawn instead of the label, which then names the button for assistive tech.
   * For the action that is understood from its glyph alone and is better small —
   * deleting a draft, beside a full-width primary action.
   */
  icon?: React.ReactNode
  /**
   * Shown on hover, for an icon-only button.
   *
   * The `sr-only` label above already names the button for assistive tech; a
   * sighted reader gets nothing from a glyph in a row of glyphs. The clause
   * drawer's control row is where that bit: four `IconAction`s said what they
   * did on hover and the one irreversible control in the row did not.
   *
   * Opt-in, because a *labelled* confirm button already says what it does and
   * a tooltip repeating the label is noise. Usually shorter than `label`,
   * which is a sentence naming the object ("Delete this clause") where a
   * tooltip beside four others is a word ("Delete").
   */
  tooltip?: string
  title: string
  description: string
  /** Text on the confirming button inside the dialog. Defaults to `label`. */
  confirmLabel?: string
  onConfirm: () => void
  disabled?: boolean
  /**
   * The action is running, so the trigger shows a spinner and refuses a second
   * click.
   *
   * Separate from `disabled`, and that is the point rather than a nicety. A
   * caller that only had `disabled` could stop the second click but could not
   * say *why* the button had gone dead, so finalizing a contract looked
   * identical to finalizing being unavailable: the button greyed out for a few
   * seconds and came back, with nothing on screen claiming the work. `Button`
   * already draws the spinner and sets `aria-busy`; this is only the wire.
   */
  pending?: boolean
  variant?: VariantProps<typeof buttonVariants>["variant"]
  /** Variant for the dialog's confirm button — destructive for deletions. */
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"]
  size?: VariantProps<typeof buttonVariants>["size"]
  className?: string
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
  variant = "outline",
  confirmVariant,
  size,
  className,
}: ConfirmActionButtonProps) {
  const button = (
    <Button
      type="button"
      variant={variant}
      size={size}
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
  )

  return (
    <AlertDialog>
      {tooltip ? (
        /*
          The tooltip wraps the *trigger*, not the button, so one element is
          both. Nesting them the other way round gives the dialog a trigger
          that is the tooltip's wrapper rather than the button, and the dialog
          then opens from a element that was never clicked.
        */
        <Tooltip>
          <TooltipTrigger render={<AlertDialogTrigger render={button} />} />
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        <AlertDialogTrigger render={button} />
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel ?? label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { ConfirmActionButton }
