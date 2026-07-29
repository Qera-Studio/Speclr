import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Two (or three) fields side by side, exactly equal in width.
 *
 * Grid, not flex, on purpose. The old `flex flex-wrap gap-4` + `flex-1` pattern
 * sizes each child partly by its content, so a date field and a dropdown in the
 * same row came out different widths. `grid-cols-2` gives each column an
 * identical track regardless of what's inside it.
 *
 * `items-start` keeps a field with a validation message from stretching its
 * neighbour's control, and `min-w-0` lets long option text truncate instead of
 * forcing the column wider.
 *
 * The breakpoint is `@xs` (20rem/320px), not `@md`: the editor rail is 384px
 * wide (EDITOR_RAIL_WIDTH) and its padding leaves roughly 340px of content, so
 * an `@md` (448px) query would never fire and every row would silently stack.
 * Below 320px — genuinely cramped — stacking is the right answer anyway.
 */
function FieldRow({
  className,
  columns = 2,
  ...props
}: React.ComponentProps<"div"> & { columns?: 2 | 3 }) {
  return (
    <div
      data-slot="field-row"
      className={cn(
        "@container/field-row grid w-full grid-cols-1 items-start gap-3 [&>*]:min-w-0",
        columns === 2 ? "@xs/field-row:grid-cols-2" : "@xs/field-row:grid-cols-3",
        className
      )}
      {...props}
    />
  )
}

export { FieldRow }
