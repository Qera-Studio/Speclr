import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

/**
 * Five fills, three heights, one shape switch. `docs/design.md` §2.1.
 *
 * **Fills.** `primary` is the one action a view exists for, and there is one
 * per view. `secondary` (a border, no fill) is the default and the ordinary
 * action. `ghost` is for a row of icons, a toolbar, and "Cancel": anything
 * that must not compete. `destructive` is a tint among other controls; the
 * solid red exists only on the confirm inside its own dialog
 * (`AlertDialogAction`). `link` is inline in prose. `raised` (on trial on one
 * button for a year) and `neutral` (a second solid for a row with two, which
 * the one-primary rule forbids) were deleted on 16 October 2026.
 *
 * **Heights.** 28 (`sm`) is the smallest thing that reads as a control rather
 * than a chip: toolbars, row actions, icon-only buttons. 32 (`md`) is the
 * default, the height of an action on the page and of an Input in the editor
 * rail. 36 (`lg`) is a form field's height, for a button beside one or a
 * form's own submit. 24 was deleted: nothing needed it. Inside a
 * `FieldGroup size="form"` an `md` button grows to `lg` on its own, so a
 * button next to a field never has to be told.
 *
 * **`icon`** makes the button square at its height. It is a shape, not a
 * fourth size, and an icon-only button still has to name itself
 * (`aria-label` or an `sr-only` span); `design-system.test.ts` fails the
 * build when it does not.
 */
const buttonVariants = cva(
  "group/button focus-ring inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-control whitespace-nowrap transition-colors select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-border hover:bg-hover hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30",
        ghost:
          "hover:bg-hover hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-7 gap-1 px-2 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        md: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 group-data-[size=form]/field-group:h-9 group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:text-body group-data-[size=form]/field-group:font-medium group-data-[size=form]/field-group:[&_svg:not([class*='size-'])]:size-4",
        lg: "h-9 gap-1.5 px-3 text-body font-medium [&_svg:not([class*='size-'])]:size-4",
      },
      icon: {
        true: "px-0",
      },
    },
    compoundVariants: [
      { icon: true, size: "sm", className: "size-7" },
      { icon: true, size: "md", className: "size-8 group-data-[size=form]/field-group:size-9" },
      { icon: true, size: "lg", className: "size-9" },
    ],
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
)

/**
 * `pending` is the whole of the async-button rule.
 *
 * The forms used to swap the label ('Save settings' became 'Saving…'), which
 * changes the button's width mid-click, and a control that resizes under the
 * cursor is one you can miss on the way down. The label is what the button
 * *is*; whether it is currently working is a second fact, and it belongs in a
 * second glyph. So the label stays, a spinner appears in front of it, and the
 * button disables itself so the double submit cannot happen at all.
 *
 * `aria-busy` rather than an announcement: the label has not changed, so there
 * is nothing new to read out, and forms that report a real outcome do it in
 * their own live region.
 */
function Button({
  className,
  variant = "secondary",
  size = "md",
  icon,
  pending,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { pending?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, icon, className }))}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? <Spinner className="text-current" /> : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
