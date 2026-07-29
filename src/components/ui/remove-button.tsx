"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
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

/**
 * The one way to remove a repeatable row — line items, contract schedules,
 * letter paragraphs, service scope items.
 *
 * A bare "Remove" text button gave no warning and read as heavily as the
 * fields beside it. This is quiet until you approach it (icon only, muted),
 * turns red on hover, names itself in a tooltip, and asks before destroying
 * anything.
 *
 * `label` does triple duty: the accessible name, the tooltip text, and the
 * dialog's default title. Pass the same phrasing the old text button used
 * (e.g. "Remove line item 1") so existing `getByRole('button', {name: …})`
 * queries keep matching.
 */
interface RemoveButtonProps {
  label: string
  onConfirm: () => void
  disabled?: boolean
  /** Overrides the dialog heading; defaults to `label`. */
  confirmTitle?: string
  confirmDescription?: string
  className?: string
}

function RemoveButton({
  label,
  onConfirm,
  disabled,
  confirmTitle,
  confirmDescription = "This can't be undone.",
  className,
}: RemoveButtonProps) {
  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={label}
                  className={cn(
                    "text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive",
                    className
                  )}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>

      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmTitle ?? label}</AlertDialogTitle>
          <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export { RemoveButton }
