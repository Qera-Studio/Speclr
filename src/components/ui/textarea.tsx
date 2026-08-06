import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Sizes mirror `Input` — see the note there. `default` stays byte-identical. */
const textareaVariants = cva(
  "flex field-sizing-content w-full resize-none rounded-md border border-input bg-input/20 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default:
          "min-h-16 px-2 py-2 text-sm md:text-xs/relaxed group-data-[size=form]/field-group:min-h-20 group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:text-sm group-data-[size=form]/field-group:md:text-sm",
        form: "min-h-20 px-3 py-2 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Textarea({
  className,
  size,
  ...props
}: Omit<React.ComponentProps<"textarea">, "size"> &
  VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      data-size={size ?? "default"}
      className={cn(textareaVariants({ size }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
