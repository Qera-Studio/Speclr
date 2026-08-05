'use client';

import type {
  ArrayPath,
  FieldValues,
  Path,
  UseFieldArrayReturn,
  UseFormRegister,
} from 'react-hook-form';
import { rupeesToPaise } from '@/lib/domain/money';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RemoveButton } from '@/components/ui/remove-button';
import { emptyLineItem } from './useDocumentForm';

/**
 * Line items for any form that has a `lineItems` array of `LineItemFormValues`
 * — the invoice, the receipt and the stipend slip all do.
 *
 * Generic over the form shape rather than tied to `EditorFormValues`, because
 * the stipend has its own form: its expenses (a reimbursed subscription, say)
 * are line items exactly like an invoice's, and duplicating this editor to say
 * so would mean two places to fix a money bug.
 *
 * The `as Path<T>` casts are the price of that generality: TypeScript cannot
 * prove `lineItems.0.rate` indexes `T` without knowing `T` concretely. They are
 * confined to this file, and the `T extends { lineItems: LineItemFormValues[] }`
 * bound is what actually keeps them honest.
 */
interface LineItemsEditorProps<T extends FieldValues> {
  register: UseFormRegister<T>;
  fieldArray: UseFieldArrayReturn<T, ArrayPath<T>>;
  /** Rate is shown in the document's own currency; INR unless told otherwise. */
  currencySymbol?: string;
}

export default function LineItemsEditor<T extends FieldValues>({
  register,
  fieldArray,
  currencySymbol = '₹',
}: LineItemsEditorProps<T>) {
  const { fields, append, remove } = fieldArray;

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium">Line items</legend>
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
          <Field>
            <FieldLabel htmlFor={`item-desc-${index}`}>Description</FieldLabel>
            <Input id={`item-desc-${index}`} {...register(`lineItems.${index}.description` as Path<T>)} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`item-detail-${index}`}>Detail (optional)</FieldLabel>
            <Input id={`item-detail-${index}`} {...register(`lineItems.${index}.detail` as Path<T>)} />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field className="flex-1">
              <FieldLabel htmlFor={`item-rate-${index}`}>Rate ({currencySymbol})</FieldLabel>
              <Input
                id={`item-rate-${index}`}
                inputMode="decimal"
                {...register(`lineItems.${index}.rate` as Path<T>, {
                  validate: (value) =>
                    value === '' || rupeesToPaise(value) !== null || 'Enter a valid amount.',
                })}
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor={`item-qty-${index}`}>Qty</FieldLabel>
              <Input id={`item-qty-${index}`} inputMode="decimal" {...register(`lineItems.${index}.qty` as Path<T>)} />
            </Field>
            <RemoveButton
              label={`Remove line item ${index + 1}`}
              onConfirm={() => remove(index)}
              disabled={fields.length === 1}
            />
          </div>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" onClick={() => append(emptyLineItem() as Parameters<typeof append>[0])}>
          Add line item
        </Button>
      </div>
    </fieldset>
  );
}
