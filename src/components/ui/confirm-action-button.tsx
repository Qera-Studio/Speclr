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
  title: string
  description: string
  /** Text on the confirming button inside the dialog. Defaults to `label`. */
  confirmLabel?: string
  onConfirm: () => void
  disabled?: boolean
  variant?: VariantProps<typeof buttonVariants>["variant"]
  /** Variant for the dialog's confirm button — destructive for deletions. */
  confirmVariant?: VariantProps<typeof buttonVariants>["variant"]
  size?: VariantProps<typeof buttonVariants>["size"]
  className?: string
}

function ConfirmActionButton({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
  disabled,
  variant = "outline",
  confirmVariant,
  size,
  className,
}: ConfirmActionButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button type="button" variant={variant} size={size} disabled={disabled} className={className}>
            {label}
          </Button>
        }
      />
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
