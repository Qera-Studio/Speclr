"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A searchable single-select, for lists too long to scroll comfortably:
 * clients, employees, the 36 GST states, invoices, countries.
 *
 * Short fixed lists (payment method, engagement type, pronoun) should use
 * `Select` instead — a filter box on three options is noise.
 *
 * The trigger is styled to match `SelectTrigger` exactly, so a Combobox and a
 * Select sitting side by side in a FieldRow are indistinguishable in height,
 * border and focus treatment.
 */
export interface ComboboxOption {
  value: string
  label: string
  /** Optional second line, e.g. an invoice's date and amount. */
  hint?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  /** Shown in the input when nothing is selected. */
  placeholder?: string
  /** Shown when the filter matches nothing. */
  emptyMessage?: string
  id?: string
  name?: string
  disabled?: boolean
  size?: "default" | "form"
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  emptyMessage = "No matches.",
  id,
  name,
  disabled,
  size = "default",
  className,
  ...aria
}: ComboboxProps) {
  const selected = React.useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  )

  return (
    <ComboboxPrimitive.Root<ComboboxOption>
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next?.value ?? "")}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(item, v) => item.value === v.value}
      disabled={disabled}
      name={name}
    >
      <div
        data-slot="combobox"
        data-size={size}
        className={cn(
          "group/combobox relative flex w-full items-center rounded-md border border-input bg-input/20 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive/20 data-[size=default]:h-7 data-[size=form]:h-9 group-data-[size=form]/field-group:h-9 dark:bg-input/30",
          className
        )}
      >
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          className={cn(
            "w-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            size === "form"
              ? "px-3 text-sm"
              : "px-2 text-xs/relaxed group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:text-sm"
          )}
          {...aria}
        />
        <ComboboxPrimitive.Trigger
          aria-label="Open list"
          className={cn(
            "flex shrink-0 items-center justify-center text-muted-foreground outline-none",
            size === "form" ? "pr-3" : "pr-2 group-data-[size=form]/field-group:pr-3"
          )}
        >
          <ComboboxPrimitive.Icon
            render={<ChevronDownIcon className="pointer-events-none size-3.5" />}
          />
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        {/*
          `min-w`, not `w`: in the 384px editor rail, pinning the popup to the
          trigger width truncated option labels to "01 — Stat…". The popup may
          grow past the field to show the full label, capped so it can't run
          off-screen.
        */}
        <ComboboxPrimitive.Positioner
          sideOffset={4}
          className="isolate z-50 min-w-(--anchor-width) max-w-(--available-width)"
        >
          <ComboboxPrimitive.Popup
            data-slot="combobox-content"
            data-size={size}
            className="group/combobox-content relative isolate z-50 max-h-(--available-height) w-max min-w-full origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 print:hidden"
          >
            <ComboboxPrimitive.Empty className="px-2 py-3 text-center text-xs/relaxed text-muted-foreground group-data-[size=form]/combobox-content:text-sm">
              {emptyMessage}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List>
              {(item: ComboboxOption) => (
                <ComboboxPrimitive.Item
                  key={item.value}
                  value={item}
                  className="relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 pr-7 text-xs/relaxed outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground group-data-[size=form]/combobox-content:min-h-8 group-data-[size=form]/combobox-content:px-3 group-data-[size=form]/combobox-content:pr-8 group-data-[size=form]/combobox-content:text-sm"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    {/* No truncate — the popup sizes to its content instead. */}
                    <span className="whitespace-nowrap">{item.label}</span>
                    {item.hint ? (
                      <span className="whitespace-nowrap text-xs/relaxed text-muted-foreground">
                        {item.hint}
                      </span>
                    ) : null}
                  </span>
                  <ComboboxPrimitive.ItemIndicator
                    render={
                      <span className="pointer-events-none absolute right-2 flex items-center justify-center" />
                    }
                  >
                    <CheckIcon className="pointer-events-none size-3.5" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  )
}

export { Combobox }
