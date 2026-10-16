"use client"

import * as React from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import type { VariantProps } from "class-variance-authority"

/**
 * @level molecule
 *
 * The "add a thing" button: a plus and a verb.
 *
 * Reserved for the page-level create actions (Add client, Add employee, Add
 * service, New invoice). Deliberately NOT used inside the editor rail, where
 * "Add line item" and friends sit next to real form fields.
 *
 * The plus used to turn a quarter-turn on hover. It does not any more: an
 * icon that moves delays recognising *which* icon it is by the length of the
 * move, and carries no information (`docs/design.md` §1.6).
 */
export interface AddButtonProps
  extends Omit<React.ComponentProps<"button">, "children"> {
  children: React.ReactNode
  variant?: VariantProps<typeof buttonVariants>["variant"]
}

function AddButton({
  className,
  children,
  variant = "primary",
  ...props
}: AddButtonProps) {
  return (
    <button
      type="button"
      data-slot="button"
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    >
      <Plus aria-hidden="true" />
      {children}
    </button>
  )
}

/**
 * Same treatment for a create action that navigates instead of opening a panel
 * (the dashboard's "New invoice"). Kept separate rather than polymorphic: two
 * small components beat one with an `as` prop.
 *
 * A Next `Link`, not a bare `<a>`: every href it is given is internal, and a
 * plain anchor made "New contract" a full document load. That tore the whole
 * admin shell down and back up, which is how a collapsed sidebar came back
 * expanded.
 */
function AddLink({
  className,
  children,
  variant = "primary",
  ...props
}: Omit<React.ComponentProps<typeof Link>, "children"> & {
  children: React.ReactNode
  variant?: VariantProps<typeof buttonVariants>["variant"]
}) {
  return (
    <Link className={cn(buttonVariants({ variant }), className)} {...props}>
      <Plus aria-hidden="true" />
      {children}
    </Link>
  )
}

export { AddButton, AddLink }
