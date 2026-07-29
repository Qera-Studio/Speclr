'use client';

import type { UseFieldArrayReturn, UseFormRegister } from 'react-hook-form';
import { rupeesToPaise } from '@/lib/domain/money';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RemoveButton } from '@/components/ui/remove-button';
import { emptyLineItem, type EditorFormValues } from './useDocumentForm';

interface LineItemsEditorProps {
  register: UseFormRegister<EditorFormValues>;
  fieldArray: UseFieldArrayReturn<EditorFormValues, 'lineItems'>;
}

export default function LineItemsEditor({ register, fieldArray }: LineItemsEditorProps) {
  const { fields, append, remove } = fieldArray;

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium">Line items</legend>
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
          <Field>
            <FieldLabel htmlFor={`item-desc-${index}`}>Description</FieldLabel>
            <Input id={`item-desc-${index}`} {...register(`lineItems.${index}.description`)} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`item-detail-${index}`}>Detail (optional)</FieldLabel>
            <Input id={`item-detail-${index}`} {...register(`lineItems.${index}.detail`)} />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field className="flex-1">
              <FieldLabel htmlFor={`item-rate-${index}`}>Rate (₹)</FieldLabel>
              <Input
                id={`item-rate-${index}`}
                inputMode="decimal"
                {...register(`lineItems.${index}.rate`, {
                  validate: (value) =>
                    value === '' || rupeesToPaise(value) !== null || 'Enter a valid amount.',
                })}
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor={`item-qty-${index}`}>Qty</FieldLabel>
              <Input id={`item-qty-${index}`} inputMode="decimal" {...register(`lineItems.${index}.qty`)} />
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
        <Button type="button" variant="outline" onClick={() => append(emptyLineItem())}>
          Add line item
        </Button>
      </div>
    </fieldset>
  );
}
