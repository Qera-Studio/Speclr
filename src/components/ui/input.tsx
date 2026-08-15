import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Two sizes, deliberately:
 *
 *   default: the compact 28px control. Used by tables, toolbars and anywhere
 *            density matters. This variant's class string must stay
 *            byte-identical to what shipped before sizes existed, because
 *            `Input` is imported across the whole app and every non-form
 *            usage silently depends on it.
 *   form:    the roomier 38px control for data entry (editor panes, admin
 *            forms), where comfort beats density.
 *
 * `bg-background`, not a tint: an input on this page is defined by its border,
 * and the grey wash read as "disabled" next to a genuinely read-only field. It
 * is painted rather than transparent on purpose, because the warning bar under
 * a field tucks its top half behind the control.
 *
 * `default` is the default variant on purpose. Flipping it would inflate the
 * sidebar, every table and the admin chrome at once — see the guard test in
 * __tests__/input.test.tsx.
 *
 * The compact variant *inherits* the roomy scale inside a
 * `<FieldGroup size="form">`, via the same `group-data-[size=form]/field-group:`
 * mechanism the group already uses to scale labels and descriptions. That is
 * what keeps a form internally consistent without every call site — including
 * shared field components like AddressFields and PhoneField, which know nothing
 * about the form that renders them — having to remember `size="form"`.
 * Standalone controls (tables, toolbars, the sidebar) sit in no FieldGroup and
 * so stay compact.
 */
const FORM_GROUP_INHERIT =
  "group-data-[size=form]/field-group:h-9.5 group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:py-1 group-data-[size=form]/field-group:text-sm"
const inputVariants = cva(
  "w-full min-w-0 rounded-md border border-input bg-background transition-colors outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: `h-7 px-2 py-0.5 text-sm file:h-6 file:text-xs/relaxed md:text-xs/relaxed ${FORM_GROUP_INHERIT} group-data-[size=form]/field-group:md:text-sm group-data-[size=form]/field-group:file:h-7`,
        form: "h-9.5 px-3 py-1 text-sm file:h-7 file:text-sm",
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
