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
import { ChevronRight } from "lucide-react";
import { formatMoney, rupeesToPaise } from "@/lib/domain/money";
import {
  currencyByCode,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from "@/lib/domain/currency";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RemoveButton } from "@/components/ui/remove-button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { emptyLineItem, type LineItemFormValues } from "./useDocumentForm";

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
 * Items render collapsed to a one-line summary. Most of the time a line is
 * seeded correctly and never touched — the stipend's is — so showing four
 * inputs per item buries the rest of the form in a 384px rail. Clicking a
 * summary expands the fields.
 */
interface LineItemsEditorProps<T extends FieldValues> {
  control: Control<T>;
  register: UseFormRegister<T>;
  fieldArray: UseFieldArrayReturn<T, ArrayPath<T>>;
  /** Rates are shown in the document's own currency; INR unless told otherwise. */
  currency?: CurrencyCode;
}

/** 'Internship Stipend · ₹ 2,500.00 × 1' — enough to check a line at a glance. */
function summarize(
  item: LineItemFormValues | undefined,
  currency: CurrencyCode,
) {
  const description = item?.description?.trim() || "Untitled item";
  const ratePaise = rupeesToPaise(item?.rate ?? "");
  const qty = item?.qty?.trim() || "0";
  const amount = ratePaise === null ? "—" : formatMoney(ratePaise, currency);
  return { description, detail: `${amount} × ${qty}` };
}

export default function LineItemsEditor<T extends FieldValues>({
  control,
  register,
  fieldArray,
  currency = DEFAULT_CURRENCY,
}: LineItemsEditorProps<T>) {
  const { fields, append, remove } = fieldArray;
  const currencySymbol = currencyByCode(currency)?.symbol ?? "₹";

  // The summaries have to track what is typed. `fields` holds the values the
  // array was seeded with, not the live ones, so it cannot drive them.
  const values = useWatch({ control, name: "lineItems" as Path<T> }) as
    | LineItemFormValues[]
    | undefined;

  /**
   * Which rows are expanded, by index.
   *
   * Index rather than the field-array id because a row has to be opened at the
   * moment it is appended, before its id exists. Removal then has to shift the
   * map down, or a deleted row hands its open state to its neighbour — which is
   * what `removeAt` below is for.
   */
  const [openRows, setOpenRows] = useState<Record<number, boolean>>({});
  const setOpen = (index: number, open: boolean) =>
    setOpenRows((prev) => ({ ...prev, [index]: open }));

  const removeAt = (index: number) => {
    remove(index);
    setOpenRows((prev) => {
      const next: Record<number, boolean> = {};
      for (const [key, open] of Object.entries(prev)) {
        const i = Number(key);
        if (i < index) next[i] = open;
        else if (i > index) next[i - 1] = open;
      }
      return next;
    });
  };

  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium">Line items</legend>
      {fields.map((field, index) => {
        const open = openRows[index] ?? false;
        const { description, detail } = summarize(values?.[index], currency);

        return (
          <Collapsible
            key={field.id}
            open={open}
            onOpenChange={(next) => setOpen(index, next)}
            className="group/item rounded-md border border-border"
          >
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="flex w-full items-top gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3 shrink-0 mt-[4px] text-muted-foreground transition-transform duration-200 group-data-[open]/item:rotate-90"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {description}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {detail}
                    </span>
                  </span>
                </button>
              }
            />

            <CollapsibleContent>
              <div className="flex flex-col gap-3 border-t border-border p-3">
                <Field>
                  <FieldLabel htmlFor={`item-desc-${index}`}>
                    Description
                  </FieldLabel>
                  <Input
                    id={`item-desc-${index}`}
                    {...register(`lineItems.${index}.description` as Path<T>)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`item-detail-${index}`}>
                    Detail (optional)
                  </FieldLabel>
                  <Input
                    id={`item-detail-${index}`}
                    {...register(`lineItems.${index}.detail` as Path<T>)}
                  />
                </Field>
                <div className="flex flex-wrap items-end gap-3">
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`item-rate-${index}`}>
                      Rate ({currencySymbol})
                    </FieldLabel>
                    <Input
                      id={`item-rate-${index}`}
                      inputMode="decimal"
                      {...register(`lineItems.${index}.rate` as Path<T>, {
                        validate: (value) =>
                          value === "" ||
                          rupeesToPaise(value) !== null ||
                          "Enter a valid amount.",
                      })}
                    />
                  </Field>
                  <Field className="flex-1">
                    <FieldLabel htmlFor={`item-qty-${index}`}>Qty</FieldLabel>
                    <Input
                      id={`item-qty-${index}`}
                      inputMode="decimal"
                      {...register(`lineItems.${index}.qty` as Path<T>)}
                    />
                  </Field>
                  <RemoveButton
                    label={`Remove line item ${index + 1}`}
                    onConfirm={() => removeAt(index)}
                    disabled={fields.length === 1}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            // Open the new row: it is empty, so a collapsed summary would read
            // "Untitled item" with nowhere obvious to type into.
            setOpen(fields.length, true);
            append(emptyLineItem() as Parameters<typeof append>[0]);
          }}
        >
          Add line item
        </Button>
      </div>
    </fieldset>
  );
}
