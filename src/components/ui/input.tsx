import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Two sizes, deliberately:
 *
 *   default — the compact 28px control. Used by tables, toolbars and anywhere
 *             density matters. This variant's class string must stay
 *             byte-identical to what shipped before sizes existed, because
 *             `Input` is imported across the whole app and every non-form
 *             usage silently depends on it.
 *   form    — the roomier 36px control for data entry (editor panes, admin
 *             forms), where comfort beats density.
 *
 * `default` is the default variant on purpose. Flipping it would inflate the
 * sidebar, every table and the admin chrome at once — see the guard test in
 * __tests__/input.test.tsx.
 */
const inputVariants = cva(
  "w-full min-w-0 rounded-md border border-input bg-input/20 transition-colors outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: "h-7 px-2 py-0.5 text-sm file:h-6 file:text-xs/relaxed md:text-xs/relaxed",
        form: "h-9 px-3 py-1 text-sm file:h-7 file:text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={size ?? "default"}
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
