"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { MagicMove, useMagicMove } from "@/components/ui/magic-move";
import { RINGED_POPUP_GAP, RINGED_POPUP_WIDTH } from "@/components/ui/popup";

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
  /**
   * A control at the end of this row, revealed on hover: the item form's group
   * list puts a remove there.
   *
   * It sits **inside** the row and stops the row's own selection, so pressing
   * it acts on the option instead of choosing it. That is the whole reason it
   * is a prop here rather than something a caller can wrap around a label: a
   * button rendered into `label` would be inside `ComboboxPrimitive.Item`'s
   * click target with nothing intercepting it, so removing an option would
   * also select it on the way out.
   */
  action?: React.ReactNode;
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
  size?: "default" | "md" | "form";
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  /**
   * The field accepts a value that is not on the list, and the options become
   * suggestions rather than the permitted set.
   *
   * **Off by default, because for most callers it would be a bug.** A GST state,
   * a country, a currency and an entity type are all closed sets where a typed
   * near-miss is a wrong record, and the whole value of the control there is
   * that it cannot produce one.
   *
   * It is on where the list is a *convention* instead of a rule. A Service's
   * item group is the case it was added for: the 43 groups in the catalogue are
   * real and worth offering, since retyping one invites 'Foundation System'
   * beside 'Foundation system' as two bands nothing reconciles, but the set is
   * editorial rather than fixed and a new service must be able to name a
   * heading nobody has used yet.
   *
   * What changes: what is typed is reported on every keystroke rather than only
   * when a row is chosen, so a value matching nothing still reaches the form,
   * and the "no matches" line is suppressed because an empty list here means
   * "this one is new" rather than "there is nothing to pick".
   */
  freeText?: boolean;
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
        // The *selected* tint stays on the row: it marks a standing fact and
        // several rows' worth of it can be on screen at once. The *highlight*
        // does not, because there is only ever one and it slides between rows
        // (`magic-move.tsx`). `z-10` keeps both the label and that tint above it.
        "group/combobox-item relative z-10 flex min-h-7 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none data-selected:bg-accent/50 data-highlighted:text-accent-foreground group-data-[size=form]/combobox-content:min-h-8 group-data-[size=form]/combobox-content:px-3 group-data-[size=form]/combobox-content:text-sm",
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
      {item.action ? (
        /*
          `stopPropagation` on the pointer, not just the click: Base UI selects
          an item on pointer-down, so a click handler alone fires after the row
          has already been chosen and the popup has closed underneath it.

          Quiet until the row is under the pointer, which is `RowActions`' rule
          one level down: a column of always-lit controls in a list of six
          headings competes with the headings.
        */
        <span
          /*
            **The delay is on the way in only**, which is why it sits on the
            hover variant rather than on the base class.

            Unconditional, `delay-200` would also apply to the fade *out*, so
            the button would hang around for a fifth of a second after the
            pointer had left and follow the eye down the list. The base class
            keeps `delay-0`, so leaving is immediate and only arriving waits.

            What the wait buys: this control removes a heading from every item
            that carries it, and the pointer crosses every row on its way to the
            one it wants. Without a delay a destructive-looking button flashes
            under the cursor six times on the way past, which reads as the list
            twitching. 200ms is longer than a pass-through and shorter than a
            decision.

            `focus-within` is deliberately **not** delayed: a keyboard user has
            arrived on purpose, and making them wait for a control they
            navigated to is a pause with nothing behind it.
          */
          className="ms-2 shrink-0 opacity-0 transition-opacity delay-0 focus-within:opacity-100 group-hover/combobox-item:opacity-100 group-hover/combobox-item:delay-200"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {item.action}
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
  freeText,
  ...aria
}: ComboboxProps) {
  // One highlight for the list, moved between rows rather than painted on each.
  const { track, highlight } = useMagicMove();
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

  /*
    Under `freeText` the input is controlled by the caller's value rather than
    by the selected row, which is the whole difference between the two modes.

    Base UI derives the displayed text from the selected item, so a value that
    matches no row displays as empty: the field would clear itself the moment
    it lost focus, and a group nobody had used before could never be typed.
    Binding `inputValue` to the value instead keeps what was typed on screen,
    and `onInputValueChange` reports it per keystroke so it reaches the form
    whether or not it is ever on the list.

    Choosing a row still works, because Base UI sets the input value to that
    row's label as part of selecting it, which arrives here as an ordinary
    change. So the two paths converge rather than needing separate handling.
  */
  const freeTextProps = freeText
    ? {
        inputValue: value,
        onInputValueChange: (next: string, details: { reason?: string }) => {
          /*
            **`input-clear` on blur is Base UI tidying up, not the reader
            clearing the field**, and forwarding it was the one bug in this
            mode. Leaving a value that matches no row makes the primitive reset
            the input to the selected item's label, which for a new group is
            nothing: typing 'Brand new heading' and clicking away emptied the
            field, confirmed in the browser before this guard existed.

            Ignoring that one reason keeps the typed value and costs nothing,
            because a reader emptying the field by hand does it with keystrokes
            that arrive as `input-change` with an empty string.
          */
          if (details?.reason === 'input-clear') return;
          onValueChange(next);
        },
      }
    : {};

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
      {...freeTextProps}
    >
      {/*
        `InputGroup`, not a plain `div`. Base UI resolves the anchor as
        `inputGroupElement ?? inputElement`, so without this part the list
        hangs off the bare `<input>`, a box that sits inside this border and
        stops short of the chevron. That is what made the popup ~34px narrower
        than the control and swallowed the gap: both were correct, measured
        against the wrong element.
      */}
      <ComboboxPrimitive.InputGroup
        data-slot="combobox"
        data-size={size}
        className={cn(
          "group/combobox relative flex w-full items-center rounded-md border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 has-disabled:cursor-not-allowed has-disabled:opacity-50 has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive/20 data-[size=default]:h-8 data-[size=md]:h-9 data-[size=form]:h-9.5 group-data-[size=form]/field-group:h-9.5",
          className,
        )}
      >
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder}
          className={cn(
            "w-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-placeholder",
            size === "form" || size === "md"
              ? "px-3 text-sm"
              : "px-2 text-xs/relaxed group-data-[size=form]/field-group:px-3 group-data-[size=form]/field-group:text-sm",
          )}
          {...aria}
        />
        <ComboboxPrimitive.Trigger
          aria-label="Open list"
          className={cn(
            "flex shrink-0 items-center justify-center text-muted-foreground outline-none",
            size === "form" || size === "md"
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
      </ComboboxPrimitive.InputGroup>

      <ComboboxPrimitive.Portal>
        {/*
          A minimum width, not a fixed one: in the 384px editor rail, pinning
          the popup to the trigger width truncated option labels to "01 Stat…".
          The popup may grow past the field to show the full label, capped so it
          can't run off-screen, and may never come out narrower than the field
          it hangs from. See `popup.ts` for why the anchor width is not enough
          on a control that draws a focus ring.
        */}
        <ComboboxPrimitive.Positioner
          sideOffset={RINGED_POPUP_GAP}
          className={cn("isolate z-50", RINGED_POPUP_WIDTH)}
        >
          <ComboboxPrimitive.Popup
            ref={track.ref}
            data-slot="combobox-content"
            data-size={size}
            className="group/combobox-content relative isolate z-50 max-h-(--available-height) w-full origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 print:hidden"
          >
            {/* Suppressed under `freeText`: there, a list matching nothing
                means the typed value is new, which is allowed, so "No matches."
                would report a failure that has not happened. */}
            {freeText ? null : (
              <ComboboxPrimitive.Empty className="px-2 py-3 text-center text-xs/relaxed text-muted-foreground group-data-[size=form]/combobox-content:text-sm">
                {emptyMessage}
              </ComboboxPrimitive.Empty>
            )}
            {/* The highlight is a child of the popup rather than of the list:
                the list takes a *render function* as its only child, so it has
                no room for a sibling. The popup is the scrolling box and is
                already `relative`, so it measures the same. See `magic-move.tsx`. */}
            <MagicMove {...highlight} />
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
