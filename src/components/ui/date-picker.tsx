"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CALENDAR_FIELD_WIDTH, CALENDAR_WIDTH, RINGED_POPUP_GAP } from "@/components/ui/popup"
import {
  formatDisplayDate,
  isoToLocalDate,
  localDateToISO,
} from "@/lib/domain/dates"

/**
 * The app's date control. Replaces the browser's native date input, which
 * ignores the theme entirely.
 *
 * **Contract: value in and out is an ISO 'YYYY-MM-DD' string** — never a Date.
 * Every date in this app is stored and validated as that string (see the
 * `isoDate` zod fields in registry.ts / employee.ts), so the Date ↔ ISO
 * conversion lives here and nowhere else, using the timezone-safe helpers in
 * lib/domain/dates. An empty string means "no date", which is what the
 * optional date fields (due date, end date) use.
 */
interface DatePickerProps {
  value: string
  onValueChange: (value: string) => void
  id?: string
  disabled?: boolean
  /** Shown when no date is set. */
  placeholder?: string
  size?: "default" | "form"
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

function DatePicker({
  value,
  onValueChange,
  id,
  disabled,
  placeholder = "Pick a date",
  size = "default",
  className,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = isoToLocalDate(value) ?? undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        data-slot="date-picker-trigger"
        data-size={size}
        // Present or absent, never "false": the `data-empty:` variant matches
        // presence, so `{!selected}` greyed every filled date.
        data-empty={selected ? undefined : ''}
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border border-input bg-background text-left whitespace-nowrap transition-colors outline-none focus-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-empty:text-placeholder data-[size=default]:h-8 data-[size=default]:px-2 data-[size=default]:text-xs/relaxed group-data-[size=form]/field-group:h-9 group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:text-sm data-[size=form]:h-9 data-[size=form]:px-3 data-[size=form]:text-sm",
          // The calendar's width, not the column's. See `CALENDAR_FIELD_WIDTH`:
          // the grid cannot stretch to the field, so the field matches the grid
          // and the two edges line up. A cap rather than a width, because
          // `Field` sets `*:w-full` on its children and would win.
          "w-full",
          CALENDAR_FIELD_WIDTH,
          className
        )}
        {...aria}
      >
        <span className="truncate">
          {selected ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarIcon className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      {/*
        The trigger is a ringed control, so the calendar clears the ring.

        **The two match, and the field is what gives way.** `popup.ts`'s second
        rule sizes a popup from its anchor, and for a grid that runs the wrong
        way: a calendar is seven columns of two-digit numbers, so stretching it
        to a full-width date field spreads the same 28 numbers over more page
        and reads as broken rather than as matching. But two edges that do not
        line up read as a fault too, which is what a 264px field over a 240px
        calendar was.

        So the rule is inverted rather than dropped: the calendar keeps its
        content width and the **field takes the calendar's**, via the shared
        `CALENDAR_WIDTH` above. Both sides name one token, so neither can drift
        from the other.
      */}
      <PopoverContent
        align="start"
        sideOffset={RINGED_POPUP_GAP}
        className={cn(CALENDAR_WIDTH, "p-2")}
      >
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onValueChange(date ? localDateToISO(date) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
