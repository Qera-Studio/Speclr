"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/**
 * react-day-picker themed to the app's tokens. Deliberately unopinionated
 * about value shape — `DatePicker` owns the ISO-string contract, this just
 * draws a month.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      // `relative` is load-bearing, not decoration. react-day-picker renders
      // `Nav` as a sibling of the month rather than inside the caption, and its
      // own stylesheet, which is never imported here, is what would normally
      // give `.rdp-months` a positioning context. Without one, `nav`'s absolute
      // resolved against the popover instead, pinning the arrows to the popup's
      // padding edge above and outside the calendar.
      className={cn("relative w-fit", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex h-7 items-center justify-center",
        caption_label: "text-sm font-medium",
        // `h-7` matches the caption's height so the 24px buttons centre on the
        // month's own centre line rather than sitting 2px proud of it.
        nav: "absolute inset-x-0 top-0 flex h-7 items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "text-muted-foreground"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-8 text-xs/relaxed font-normal text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "size-8 p-0 text-center",
        day_button: cn(
          "size-8 rounded-md p-0 text-sm font-normal outline-none transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring/30"
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:ring-1 [&>button]:ring-border",
        outside: "[&>button]:text-muted-foreground/50",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" {...rest} />
          ) : (
            <ChevronRightIcon className="size-4" {...rest} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
