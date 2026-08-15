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
 * The query is against the enclosing `field-group` container, not the row
 * itself — an element cannot answer its own container query, and doing so
 * silently leaves every row stacked at one column.
 *
 * The breakpoint is `@2xs` (18rem/288px). The editor rail is 352px wide
 * (EDITOR_RAIL_WIDTH) and its padding leaves 304px of content, so anything
 * larger — `@xs` is already 320px — never fires there and every row silently
 * stacks. Below 288px, genuinely cramped, stacking is the right answer anyway.
 *
 * This is why the rail cannot narrow past 336px. The dependency runs both ways:
 * `EDITOR_RAIL_WIDTH` documents the same arithmetic from its side.
 */
const COLUMNS = {
  2: "@2xs/field-group:grid-cols-2",
  3: "@2xs/field-group:grid-cols-3",
  // Four short fields — a pincode, a state, a city — earn a second breakpoint:
  // quartering 288px leaves 60px a piece, which is narrower than the values.
  // Pairs first, then all four once there is 512px to split.
  4: "@2xs/field-group:grid-cols-2 @lg/field-group:grid-cols-4",
} as const

function FieldRow({
  className,
  columns = 2,
  ...props
}: React.ComponentProps<"div"> & { columns?: 2 | 3 | 4 }) {
  return (
    <div
      data-slot="field-row"
      className={cn(
        "grid w-full grid-cols-1 items-start gap-3 [&>*]:min-w-0",
        COLUMNS[columns],
        className
      )}
      {...props}
    />
  )
}

export { FieldRow }
