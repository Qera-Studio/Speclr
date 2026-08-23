import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        // `default`, given an edge. The stroke is mixed from `--primary` rather
        // than hard-coded, so it darkens with whatever the theme sets and stays
        // two steps down from the fill in both. The two inset lines are a lit
        // top edge and a shaded bottom one — enough to read as a raised surface
        // at a glance, not enough to look like a 2010 gradient button.
        //
        // On trial on the dashboard's "New document" only. Roll it into
        // `default` if it holds up, or delete it — do not leave it half-adopted.
        raised:
          "bg-primary text-primary-foreground border-[color-mix(in_oklch,var(--primary),black_18%)] shadow-[inset_0_1px_0_color-mix(in_oklch,white,transparent_78%),inset_0_-1px_0_color-mix(in_oklch,black,transparent_88%)] hover:bg-[color-mix(in_oklch,var(--primary),white_6%)]",
        outline:
          "border-border hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      /**
       * Three heights, and the third one earns its place.
       *
       * 28 (`default`) is the dense height this tool is built at; 32 (`lg`) is
       * the height of a form's own submit, where the action is the point of the
       * screen rather than one control among many. `form` (38) is not a fourth
       * opinion about buttons: it is `Input`/`Combobox`/`DatePicker`'s height,
       * for a button sitting *inline* with one of them, and a button beside a
       * field that does not match the field is the mismatch this variant
       * exists to stop.
       *
       * `sm` (24) and `icon-xs` (20) were deleted. Neither said anything
       * `default` and `icon-sm` do not, and a fourth height is a fourth
       * decision every call site has to make correctly.
       */
      size: {
        default:
          "h-7 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5 group-data-[size=form]/field-group:h-9.5 group-data-[size=form]/field-group:gap-1.5 group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:text-sm group-data-[size=form]/field-group:[&_svg:not([class*='size-'])]:size-4",
        lg: "h-8 gap-1 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        // Matches the `form` size on Input/Combobox/DatePicker, for a button
        // sitting inline with one of them. Button was the only kit primitive
        // without it, which is why such pairs came out mismatched.
        form: "h-9.5 gap-1.5 px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        icon: "size-7 [&_svg:not([class*='size-'])]:size-3.5 group-data-[size=form]/field-group:size-9 group-data-[size=form]/field-group:[&_svg:not([class*='size-'])]:size-4",
        "icon-sm": "size-6 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
  variant = "default",
  size = "default",
  pending,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { pending?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin text-current" />
      ) : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
