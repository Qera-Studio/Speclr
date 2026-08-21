"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

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
  value: string;
  label: string;
  /** Optional second line, e.g. an invoice's date and amount. */
  hint?: string;
  /**
   * Right-aligned column in the list row, e.g. a phone dial code. Fixed width
   * and left-aligned inside it, so the values line up down the list rather than
   * ragging off the right edge.
   */
  trailing?: string;
  /**
   * What the input shows once this option is chosen, when the row's own label
   * is too long to sit in a narrow field. Filtering still searches `label`.
   */
  selectedLabel?: string;
  /**
   * Draws a rule above this row, for the option that is a different *kind* of
   * answer rather than one more of the same — "Custom" under a list of named
   * cycles. A styled row rather than a separate element so it stays one flat
   * list to filter, arrow through and announce.
   */
  separatorBefore?: boolean;
}

/**
 * A run of options under a heading, for a list long enough that the heading is
 * how you find your place in it: countries by continent.
 *
 * Filtering still runs across the whole list and Base UI hides a group nothing
 * in it matched, so typing "sing" narrows to one row under "Asia" rather than
 * to a wall of empty headings.
 */
export interface ComboboxGroup {
  label: string;
  items: ComboboxOption[];
}

interface ComboboxProps {
  options?: ComboboxOption[];
  /** Grouped alternative to `options`. Pass one or the other, never both. */
  groups?: ComboboxGroup[];
  value: string;
  onValueChange: (value: string) => void;
  /** Shown in the input when nothing is selected. */
  placeholder?: string;
  /** Shown when the filter matches nothing. */
  emptyMessage?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  size?: "default" | "form";
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * One row. Lifted out of the render so the flat list and each group's
 * collection draw an identical row rather than two copies drifting apart.
 */
function renderItem(item: ComboboxOption) {
  return (
    <ComboboxPrimitive.Item
      key={item.value}
      value={item}
      /*
                    The selected row is marked by a faint block behind it, not
                    by a tick in a reserved gutter: the tick cost every row
                    seven pixels of right padding to say what one row's own
                    highlight already says, and that gutter is where a trailing
                    value wants to sit. The stacked variant is deliberate: two
                    data attributes outrank one, so hovering the selected row
                    still reads as hover.
                  */
      className={cn(
        "relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none data-selected:bg-accent/50 data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:data-selected:bg-accent group-data-[size=form]/combobox-content:min-h-8 group-data-[size=form]/combobox-content:px-3 group-data-[size=form]/combobox-content:text-sm",
        item.separatorBefore &&
          "mt-1 rounded-t-none border-t border-border pt-2",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        {/* No truncate; the popup sizes to its content instead. */}
        <span className="whitespace-nowrap">{item.label}</span>
        {item.hint ? (
          <span className="whitespace-nowrap text-xs/relaxed text-muted-foreground">
            {item.hint}
          </span>
        ) : null}
      </span>
      {item.trailing ? (
        <span className="ms-6 w-12 shrink-0 whitespace-nowrap text-left tabular-nums text-muted-foreground">
          {item.trailing}
        </span>
      ) : null}
    </ComboboxPrimitive.Item>
  );
}

function Combobox({
  options,
  groups,
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
  // Flattened once, so the selected row is found the same way whether the list
  // is grouped or not.
  const flat = React.useMemo(
    () => groups?.flatMap((g) => g.items) ?? options ?? [],
    [groups, options],
  );
  const selected = React.useMemo(
    () => flat.find((o) => o.value === value) ?? null,
    [flat, value],
  );

  return (
    <ComboboxPrimitive.Root<ComboboxOption>
      items={(groups ?? options ?? []) as never}
      value={selected}
      onValueChange={(next) => onValueChange(next?.value ?? "")}
      itemToStringLabel={(item) => item.selectedLabel ?? item.label}
      // `itemToStringLabel` is what the default filter searches, so an option
      // that shows something shorter when selected would otherwise become
      // unfindable by its own name. Search every part of the row instead.
      filter={(item, query) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return `${item.label} ${item.trailing ?? ""} ${item.hint ?? ""}`
          .toLowerCase()
          .includes(q);
      }}
      isItemEqualToValue={(item, v) => item.value === v.value}
      disabled={disabled}
      name={name}
    >
      <div
        data-slot="combobox"
        data-size={size}
        className={cn(
          "group/combobox relative flex w-full items-center rounded-md border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive/20 data-[size=default]:h-7 data-[size=form]:h-9.5 group-data-[size=form]/field-group:h-9.5",
          className,
        )}
      >
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          className={cn(
            "w-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            size === "form"
              ? "px-3 text-sm"
              : "px-2 text-xs/relaxed group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:text-sm",
          )}
          {...aria}
        />
        <ComboboxPrimitive.Trigger
          aria-label="Open list"
          className={cn(
            "flex shrink-0 items-center justify-center text-muted-foreground outline-none",
            size === "form"
              ? "pr-3"
              : "pr-2 group-data-[size=form]/field-group:pr-3",
          )}
        >
          <ComboboxPrimitive.Icon
            render={
              <ChevronDownIcon className="pointer-events-none size-3.5" />
            }
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
              {groups
                ? (group: ComboboxGroup) => (
                    <ComboboxPrimitive.Group
                      key={group.label}
                      items={group.items}
                      className="pb-1 last:pb-0"
                    >
                      {/*
                        A heading, not an option: not focusable, not selectable
                        and not announced as a choice. Base UI hides a whole
                        group when the filter matches nothing in it, which is
                        what keeps a search from returning a page of empty
                        headings.
                      */}
                      <ComboboxPrimitive.GroupLabel className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground group-data-[size=form]/combobox-content:px-3">
                        {group.label}
                      </ComboboxPrimitive.GroupLabel>
                      <ComboboxPrimitive.Collection>
                        {(item: ComboboxOption) => renderItem(item)}
                      </ComboboxPrimitive.Collection>
                    </ComboboxPrimitive.Group>
                  )
                : (item: ComboboxOption) => renderItem(item)}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

export { Combobox };
