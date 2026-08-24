"use client";

import { useState } from "react";
import {
  useWatch,
  type ArrayPath,
  type Control,
  type FieldValues,
  type Path,
  type UseFieldArrayReturn,
  type UseFormRegister,
} from "react-hook-form";
import { ChevronDown, Lock, LockOpen } from "lucide-react";
import { formatMoney, rupeesToPaise } from "@/lib/domain/money";
import {
  currencyByCode,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from "@/lib/domain/currency";
import { Field, FieldLabel } from "@/components/ui/field";
import FieldInfo from "@/components/form/FieldInfo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RemoveButton } from "@/components/ui/remove-button";
import { emptyLineItem, type LineItemFormValues } from "./useDocumentForm";
import { numericField } from "@/components/form/inputFilters";
import { NIL } from "@/lib/utils";

/**
 * Line items for any form with a `lineItems` array of `LineItemFormValues` —
 * the invoice, the receipt and the stipend slip all have one.
 *
 * Generic over the form shape rather than tied to `EditorFormValues`, because
 * the stipend has its own form: its expenses (a reimbursed subscription, say)
 * are line items exactly like an invoice's, and duplicating this editor to say
 * so would mean two places to fix a money bug.
 *
 * The `as Path<T>` casts are the price of that generality: TypeScript cannot
 * prove `lineItems.0.rate` indexes `T` without knowing `T` concretely. They are
 * confined to this file, and the `lineItems` shape the callers share is what
 * actually keeps them honest.
 *
 * Items render as a one-line summary behind a **lock**, not a disclosure arrow.
 * The difference is the point: a line seeded from the client's record is the
 * agreed description at the agreed rate under the agreed classification, and
 * nothing about it is the operator's to retype into an invoice. So the row is
 * closed because it is *settled*, not because it is long, and the icon says
 * which.
 *
 * Unlocking a seeded row opens the two figures that legitimately vary month to
 * month: the amount and the quantity. The description and the SAC stay
 * read-only, because they are the Service's, they print on a tax invoice under
 * Rule 46(g), and a line whose description no longer matches the Service it was
 * priced from is a line nothing reconciles against. A **custom** line has no
 * Service behind it, so it opens all three.
 */
interface LineItemsEditorProps<T extends FieldValues> {
  control: Control<T>;
  register: UseFormRegister<T>;
  fieldArray: UseFieldArrayReturn<T, ArrayPath<T>>;
  /** Rates are shown in the document's own currency; INR unless told otherwise. */
  currency?: CurrencyCode;
  /**
   * Which array on the form this drives, and the id prefix for its inputs.
   * Defaults to the `lineItems` every document has; the pay slip's deductions
   * pass `deductions` so two instances can coexist without colliding ids.
   */
  name?: string;
  legend?: string;
  /** Extra classes on the fieldset — the separator above it, mostly. */
  className?: string;
  addLabel?: string;
  /** Singular noun for the remove button's accessible name. */
  itemLabel?: string;
  /**
   * Hide the quantity input, pinning qty to 1. A deduction is a flat amount —
   * "TDS × 3" is not a thing — so the column is noise there and a place to
   * introduce a wrong figure.
   */
  hideQty?: boolean;
  /**
   * Allow removing the last row. A document must always have at least one line
   * item, but a slip with nothing deducted is normal and must be expressible.
   */
  allowEmpty?: boolean;
  /**
   * Show the SAC field. Invoices and receipts only: a pay slip's deductions are
   * not a supply and have nothing to classify.
   */
  showSac?: boolean;
  /**
   * Keep the description and the SAC read-only on a row that was seeded rather
   * than typed. Invoices and receipts only: those rows come from a Service, and
   * the description is the one the rate was agreed against.
   *
   * Off by default, which is what the slips want. A slip's earnings line is
   * seeded from the employee record but there is no catalogue behind it, so
   * "Basic" is a label the operator owns.
   */
  lockNames?: boolean;
  /**
   * Lines that can be added ready-made, grouped by heading.
   *
   * The Add button becomes a menu when these are supplied, with "Custom line"
   * as its last entry. The presets are built by the *caller* from the service
   * catalogue and the client record, so this component still knows nothing
   * about either: it takes finished rows and appends them.
   */
  presets?: LineItemPreset[];
}

export interface LineItemPreset {
  /** Menu heading this preset sits under, e.g. 'Retainer'. */
  group: string;
  label: string;
  item: LineItemFormValues;
}

/** Presets in their given order, gathered under their headings. */
function groupsOf(presets: LineItemPreset[]): [string, LineItemPreset[]][] {
  const groups = new Map<string, LineItemPreset[]>();
  for (const preset of presets) {
    const bucket = groups.get(preset.group);
    if (bucket) bucket.push(preset);
    else groups.set(preset.group, [preset]);
  }
  return [...groups];
}

/** The line's own name, or a stand-in while it is still being typed. */
function summarize(item: LineItemFormValues | undefined) {
  return item?.description?.trim() || "Untitled item";
}

export default function LineItemsEditor<T extends FieldValues>({
  control,
  register,
  fieldArray,
  currency = DEFAULT_CURRENCY,
  name = "lineItems",
  legend = "Line items",
  addLabel = "Add line item",
  itemLabel = "line item",
  hideQty = false,
  allowEmpty = false,
  showSac = false,
  lockNames = false,
  presets,
  className,
}: LineItemsEditorProps<T>) {
  const { fields, append, remove } = fieldArray;
  const currencySymbol = currencyByCode(currency)?.symbol ?? "₹";

  // The summaries have to track what is typed. `fields` holds the values the
  // array was seeded with, not the live ones, so it cannot drive them.
  const values = useWatch({ control, name: name as Path<T> }) as
    LineItemFormValues[] | undefined;

  /**
   * Per-row state, by index: whether it is unlocked, and whether it is a custom
   * line rather than one seeded from a Service.
   *
   * Index rather than the field-array id because a row has to be marked at the
   * moment it is appended, before its id exists. Removal then has to shift the
   * map down, or a deleted row hands its state to its neighbour — which is what
   * `removeAt` below is for.
   *
   * A row absent from the map is locked, and its `custom` is *unknown* rather
   * than false: `DocumentEditor` seeds retainers with `replace` and a stored
   * draft arrives already populated, so neither passes through `addRow`. See
   * where `custom` is read for how an unclassified row is judged.
   */
  type RowState = { unlocked: boolean; custom?: boolean };
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const patchRow = (index: number, patch: Partial<RowState>) =>
    setRows((prev) => ({
      ...prev,
      // No `custom: false` in the default. Toggling a lock must not *classify*
      // a row that arrived unclassified, or the first click on the blank
      // default row would decide it belongs to a Service.
      [index]: { ...{ unlocked: false }, ...prev[index], ...patch },
    }));

  const addRow = (item: LineItemFormValues) => {
    // Anything added by hand is the operator's line, whatever it was seeded
    // from. The lock exists to protect a name that arrived *with the client* on
    // a document nobody had touched yet; a line somebody chose off a menu is
    // one they meant to put there, and locking it would only be a click to
    // undo. Custom rows carry no lock at all, so this also opens it.
    patchRow(fields.length, { custom: true });
    append(item as Parameters<typeof append>[0]);
  };

  const removeAt = (index: number) => {
    remove(index);
    setRows((prev) => {
      const next: Record<number, RowState> = {};
      for (const [key, state] of Object.entries(prev)) {
        const i = Number(key);
        if (i < index) next[i] = state;
        else if (i > index) next[i - 1] = state;
      }
      return next;
    });
  };

  return (
    /* No card around it. The rows are cards already, and a box drawn around a
       stack of boxes is a border for the sake of one.

       The separator is on a wrapper, not on the `<fieldset>`: a legend sits *in*
       its fieldset's top border and cuts a notch out of it, so the rule came out
       beginning to the right of the word "Line items" rather than above it. */
    <div className={className}>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{legend}</legend>
        {fields.map((field, index) => {
          const row = rows[index];
          /*
          Everything is the operator's unless the caller says a Service owns it.

          Where the row went through `addRow` its origin is known outright. Where
          it did not — the blank default row, a `replace` from the client record,
          a stored draft reopened next month — the SAC is the tell: a line seeded
          from a Service always carries one, and a line typed by hand does not
          until somebody types it. `ponytail: a custom line where the SAC is
          typed before the description hides the description; seed the row map
          from the catalogue if that ever bites.
        */
          const custom =
            !lockNames ||
            (row?.custom ?? !(values?.[index]?.sacCode ?? "").trim());
          /* Only a Service-owned row has anything to lock. A custom line is
             the operator's from top to bottom, so a padlock over it would be a
             control whose only function is to be turned off again. */
          const open = custom || (row?.unlocked ?? false);
          const description = summarize(values?.[index]);

          return (
            <div key={field.id} className="rounded-md border border-border">
              <div className="flex w-full items-center gap-2 px-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{description}</span>
                </span>
                {custom ? null : (
                  <button
                    type="button"
                    onClick={() => patchRow(index, { unlocked: !open })}
                    aria-pressed={open}
                    aria-label={
                      open
                        ? `Lock ${itemLabel} ${index + 1}`
                        : `Unlock ${itemLabel} ${index + 1}`
                    }
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                  >
                    {open ? (
                      <LockOpen aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Lock aria-hidden="true" className="size-3.5" />
                    )}
                  </button>
                )}
              </div>

              {open ? (
                <div className="flex flex-col gap-3 border-t border-border p-3">
                  {custom ? (
                    <Field>
                      <FieldLabel htmlFor={`${name}-desc-${index}`}>
                        Description
                      </FieldLabel>
                      <Input
                        id={`${name}-desc-${index}`}
                        {...register(`${name}.${index}.description` as Path<T>)}
                      />
                    </Field>
                  ) : null}
                  {/* No Detail input. No sheet prints one any more: nothing in
                      Rule 46 asks for a second description of the same supply,
                      and an input for a value that goes nowhere is a trap. The
                      `detail` key stays on the schema, deprecated, so drafts
                      written while it existed still parse. */}
                  {showSac && custom ? (
                    <Field>
                      <FieldInfo
                        htmlFor={`${name}-sac-${index}`}
                        label="SAC"
                        info="The Service Accounting Code this work is classified under. CGST Rule 46(g) wants it printed against the line. It arrives with a line added from the catalogue; a custom line needs one typed."
                        infoLabel="What is a SAC?"
                      />
                      <Input
                        id={`${name}-sac-${index}`}
                        inputMode="numeric"
                        placeholder="998314"
                        {...register(`${name}.${index}.sacCode` as Path<T>)}
                      />
                    </Field>
                  ) : null}
                  <div className="flex flex-wrap items-end gap-3">
                    <Field className="flex-1">
                      <FieldLabel htmlFor={`${name}-rate-${index}`}>
                        {hideQty ? "Amount" : "Rate"} ({currencySymbol})
                      </FieldLabel>
                      <Input
                        id={`${name}-rate-${index}`}
                        {...numericField(
                          register(`${name}.${index}.rate` as Path<T>, {
                            validate: (value) =>
                              value === "" ||
                              rupeesToPaise(value) !== null ||
                              "Enter a valid amount.",
                          }),
                          "money",
                        )}
                      />
                    </Field>
                    {hideQty ? null : (
                      <Field className="flex-1">
                        <FieldLabel htmlFor={`${name}-qty-${index}`}>
                          Qty
                        </FieldLabel>
                        <Input
                          id={`${name}-qty-${index}`}
                          {...numericField(
                            register(`${name}.${index}.qty` as Path<T>),
                            "money",
                          )}
                        />
                      </Field>
                    )}
                    <RemoveButton
                      label={`Remove ${itemLabel} ${index + 1}`}
                      onConfirm={() => removeAt(index)}
                      disabled={!allowEmpty && fields.length === 1}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
        <div>
          {presets && presets.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  >
                    {addLabel}
                    <ChevronDown aria-hidden />
                  </Button>
                }
              />
              {/* `side="bottom"` rather than left to the flipper: the button is
                the last thing in a rail that scrolls, so "there is no room
                below" is the usual case and the menu would open upward over the
                lines it is adding to. */}
              <DropdownMenuContent
                align="start"
                side="bottom"
                collisionAvoidance={{ side: "none" }}
                className="max-h-80 overflow-y-auto"
              >
                {groupsOf(presets).map(([group, items]) => (
                  <DropdownMenuGroup key={group}>
                    <DropdownMenuLabel>{group}</DropdownMenuLabel>
                    {items.map((preset) => (
                      <DropdownMenuItem
                        key={`${group}-${preset.label}`}
                        onClick={() => addRow(preset.item)}
                      >
                        {preset.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                ))}
                <DropdownMenuSeparator />
                {/* Last, and always present. A catalogue that does not name the
                  thing being billed is an ordinary Tuesday, not an error. */}
                <DropdownMenuItem onClick={() => addRow(emptyLineItem())}>
                  Custom line
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => addRow(emptyLineItem())}
            >
              {addLabel}
            </Button>
          )}
        </div>
      </fieldset>
    </div>
  );
}
