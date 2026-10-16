import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-sm border border-transparent px-1.5 text-caption font-medium whitespace-nowrap transition-colors focus-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-2.5!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border bg-input/20 text-foreground dark:bg-input/30 [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * A document's status as a badge: the word, never colour alone, and never a
 * ternary at a call site (`design-system.test.ts`). `void` is not a
 * `DocStatus` yet; the kanban names its column with it.
 */
const STATUS = {
  draft: { label: "Draft", variant: "secondary" },
  finalized: { label: "Finalized", variant: "default" },
  void: { label: "Void", variant: "outline" },
} as const satisfies Record<string, { label: string; variant: BadgeVariant }>

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

function Badge({
  className,
  variant,
  status,
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { status?: keyof typeof STATUS }) {
  const resolved = status ? STATUS[status] : null
  const fill = variant ?? resolved?.variant ?? "default"
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant: fill }), className),
        children: children ?? resolved?.label,
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant: fill,
    },
  })
}

export { Badge, badgeVariants }
