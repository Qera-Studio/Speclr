"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RINGED_POPUP_GAP, RINGED_POPUP_WIDTH } from "@/components/ui/popup"
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
        data-empty={!selected}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-background text-left whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-empty:text-muted-foreground data-[size=default]:h-8 data-[size=default]:px-2 data-[size=default]:text-xs/relaxed group-data-[size=form]/field-group:h-9.5 group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:text-sm data-[size=form]:h-9.5 data-[size=form]:px-3 data-[size=form]:text-sm",
          className
        )}
        {...aria}
      >
        <span className="truncate">
          {selected ? formatDisplayDate(value) : placeholder}
        </span>
        <CalendarIcon className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      {/* The trigger is a ringed control, so the calendar clears the ring and
          is never narrower than the field. A month grid is wider than a short
          date field anyway; the floor is what keeps that true in a wide one. */}
      <PopoverContent
        align="start"
        sideOffset={RINGED_POPUP_GAP}
        className={cn("w-auto p-2", RINGED_POPUP_WIDTH)}
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
