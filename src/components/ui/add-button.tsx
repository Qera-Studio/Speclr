"use client"

import * as React from "react"
import { motion } from "motion/react"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/**
 * The "add a thing" button: a plus that turns a quarter-turn on hover.
 *
 * Reserved for the page-level create actions — Add client, Add employee, Add
 * service, New invoice. Deliberately NOT used inside the editor rail, where
 * "Add line item" and friends sit next to real form fields and a spinning icon
 * would be noise.
 *
 * Rotates clockwise (+90°) so the plus leans into the page rather than away
 * from it; anticlockwise reads as an undo.
 */
export interface AddButtonProps
  extends Omit<React.ComponentProps<"button">, "children"> {
  children: React.ReactNode
  variant?: "default" | "outline"
}

function AddButton({
  className,
  children,
  variant = "default",
  ...props
}: AddButtonProps) {
  return (
    <motion.button
      type="button"
      data-slot="button"
      initial="rest"
      animate="rest"
      whileHover="hover"
      className={cn(buttonVariants({ variant }), className)}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      <motion.span
        className="inline-flex"
        variants={{ rest: { rotate: 0 }, hover: { rotate: 90 } }}
        transition={{ type: "spring", stiffness: 350, damping: 18 }}
      >
        <Plus aria-hidden="true" />
      </motion.span>
      {children}
    </motion.button>
  )
}

/**
 * Same treatment for a create action that navigates instead of opening a panel
 * (the dashboard's "New invoice"). Kept separate rather than polymorphic — two
 * small components beat one with an `as` prop.
 */
function AddLink({
  className,
  children,
  variant = "default",
  ...props
}: Omit<React.ComponentProps<"a">, "children"> & {
  children: React.ReactNode
  variant?: "default" | "outline"
}) {
  return (
    <motion.a
      initial="rest"
      animate="rest"
      whileHover="hover"
      className={cn(buttonVariants({ variant }), className)}
      {...(props as React.ComponentProps<typeof motion.a>)}
    >
      <motion.span
        className="inline-flex"
        variants={{ rest: { rotate: 0 }, hover: { rotate: 90 } }}
        transition={{ type: "spring", stiffness: 350, damping: 18 }}
      >
        <Plus aria-hidden="true" />
      </motion.span>
      {children}
    </motion.a>
  )
}

export { AddButton, AddLink }
