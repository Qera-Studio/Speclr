'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { RemoveButton } from '@/components/patterns/ConfirmAction';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SacField } from '@/components/form/fields';
import { numericField } from '@/components/form/inputFilters';
import { sacSchema } from '@/lib/domain/fields';
import { paiseToRupees, rupeesToPaise } from '@/lib/domain/money';
import { multilineSchema, textSchema } from '@/lib/domain/text';
import type { ItemUnit, ServiceItem } from '@/lib/domain/serviceItem';

const UNITS: { value: ItemUnit; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'perUnit', label: 'Per unit' },
];

/**
 * One item, as the form holds it. Rupees stay a string until `rupeesToPaise`
 * turns them into the one number that leaves this component, which is the
 * `EmployeeForm` pattern and the reason a float never reaches the database.
 */
const schema = z
  .object({
    name: textSchema(300, { required: 'Say what this item is.' }),
    blurb: multilineSchema(500),
    rupees: z
      .string()
      .refine(
        (v) => v.trim() === '' || rupeesToPaise(v.trim()) !== null,
        'Enter an amount like 12000 or 12000.50.',
      ),
    rupeesMax: z
      .string()
      .refine(
        (v) => v.trim() === '' || rupeesToPaise(v.trim()) !== null,
        'Enter an amount like 12000 or 12000.50.',
      ),
    unit: z.enum(['fixed', 'monthly', 'perUnit']),
    unitLabel: textSchema(40),
    group: textSchema(80),
    sacCode: sacSchema(),
  })
  .superRefine((values, ctx) => {
    // The same two rules `serviceItemSchema` runs on the way in, checked here
    // so the reader is told at the field rather than by a server refusal.
    const low = values.rupees.trim();
    const high = values.rupeesMax.trim();
    if (high && !low) {
      ctx.addIssue({
        code: 'custom',
        path: ['rupees'],
        message: 'A range needs a rate to start from.',
      });
    }
    if (high && low && (rupeesToPaise(high) ?? 0) < (rupeesToPaise(low) ?? 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['rupeesMax'],
        message: 'The top of the range cannot be below the rate.',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const toForm = (item: ServiceItem | null): FormValues => ({
  name: item?.name ?? '',
  blurb: item?.blurb ?? '',
  rupees: item?.ratePaise === undefined ? '' : paiseToRupees(item.ratePaise),
  rupeesMax: item?.rateMaxPaise === undefined ? '' : paiseToRupees(item.rateMaxPaise),
  unit: item?.unit ?? 'fixed',
  unitLabel: item?.unitLabel ?? '',
  group: item?.group ?? '',
  sacCode: item?.sacCode ?? '',
});

/**
 * A copy of `admin/services/ItemForm.tsx`, for the drawer experiment.
 *
 * Identical fields and layout. The one change is that nothing reaches the
 * server: saving and removing a group call back into the specimen, which holds
 * the items in state. A library page that wrote to the catalogue would be a
 * way to change what clients are quoted from a page meant for looking at
 * buttons. Delete it with `ExperimentDrawer.tsx` when the experiment ends.
 */
export default function ExperimentItemForm({
  item,
  groups = [],
  onDone,
  onSave,
  onRemoveGroup,
}: {
  item: ServiceItem | null;
  /**
   * The group headings this service already uses, with how many items carry
   * each, as suggestions.
   *
   * Derived by the caller from the items themselves, so the list cannot go
   * stale against them. Empty is a real answer and the ordinary one for nine
   * of the sixteen services: the field still accepts anything typed.
   *
   * The count is what the remove confirmation names. A heading with no count
   * could not warn how much it was about to change.
   */
  groups?: { name: string; count: number }[];
  onDone: () => void;
  onSave: (item: ServiceItem) => void;
  onRemoveGroup: (name: string) => void;
}) {

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: toForm(item),
  });

  const unit = watch('unit');
  const group = watch('group');

  const removeGroup = (name: string) => {
    onRemoveGroup(name);
    if (group === name) setValue('group', '', { shouldDirty: false });
  };

  const submit = handleSubmit((values) => {
    const low = values.rupees.trim();
    const high = values.rupeesMax.trim();
    const payload: ServiceItem = {
      // Blank means "new", and the specimen assigns an id that is never
      // reissued. An existing item keeps the id a client record may cite.
      id: item?.id ?? '',
      name: values.name,
      ...(values.blurb.trim() ? { blurb: values.blurb.trim() } : {}),
      ...(low ? { ratePaise: rupeesToPaise(low) ?? 0 } : {}),
      unit: values.unit,
      ...(values.unit === 'perUnit' && values.unitLabel
        ? { unitLabel: values.unitLabel }
        : {}),
      ...(values.group ? { group: values.group } : {}),
      ...(values.sacCode ? { sacCode: values.sacCode } : {}),
      ...(high ? { rateMaxPaise: rupeesToPaise(high) ?? 0 } : {}),
      // Archiving is the table's act, not this form's, so an edit never
      // silently restores an item somebody retired.
      archived: item?.archived ?? false,
    };

    onSave(payload);
    onDone();
  });

  return (
    <form onSubmit={submit} noValidate>
      {/*
        `FieldGroup`, not a bare flex column, and it is load-bearing rather than
        tidy. `FieldRow` pairs its children through an `@2xs/field-group`
        container query, and a container query resolves against a **named
        container on an ancestor**. There was none here, so every row silently
        stacked at one column: the rate sat above "Up to", the unit above its
        label, which is not what either row was written to do. See the note at
        the top of `ui/field-row.tsx`, which predicts exactly this.
      */}
      <FieldGroup size="form">
      <Field>
        <FieldLabel htmlFor="item-name">Name</FieldLabel>
        <Input id="item-name" size="form" {...register('name')} />
        <FieldError errors={[errors.name]} />
      </Field>

      {/* One sentence, and only a quotation prints it, under the item's name.
          No `rows`: a textarea grows with its content (`docs/design.md` §2.2).

          Labelled for what it is and where it appears rather than for the
          property it is stored in. `blurb` is the field name on `ServiceItem`
          and reads as a placeholder in the UI; what the reader needs to know
          is that the sentence is client-facing and that no other document
          prints it. */}
      <Field>
        <FieldLabel htmlFor="item-blurb">Quotation description</FieldLabel>
        <Textarea
          id="item-blurb"
          placeholder="Getting the technical foundation of your site ready before any design work starts."
          {...register('blurb')}
        />
        <FieldError errors={[errors.blurb]} />
      </Field>

      <FieldRow columns={2}>
        <Field>
          <FieldLabel htmlFor="item-rate">Rate (₹)</FieldLabel>
          <Input
            id="item-rate"
            size="form"
            placeholder="Quoted"
            {...numericField(register('rupees'), 'money')}
          />
          <FieldError errors={[errors.rupees]} />
        </Field>
        {/* A band, for a retainer quoted as a range. Blank means the rate is
            exact, which is every one-off piece of work. */}
        <Field>
          <FieldLabel htmlFor="item-rate-max">Up to (₹)</FieldLabel>
          <Input
            id="item-rate-max"
            size="form"
            placeholder="Exact"
            {...numericField(register('rupeesMax'), 'money')}
          />
          <FieldError errors={[errors.rupeesMax]} />
        </Field>
      </FieldRow>

      <FieldRow columns={2}>
        <Field>
          <FieldLabel htmlFor="item-unit">Unit</FieldLabel>
          <Controller
            control={control}
            name="unit"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="item-unit" size="form" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        {/* Only where it means something. A label on a fixed line is a field
            that goes nowhere. */}
        {unit === 'perUnit' ? (
          <Field>
            <FieldLabel htmlFor="item-unit-label">Unit label</FieldLabel>
            <Input
              id="item-unit-label"
              size="form"
              placeholder="per screen"
              {...register('unitLabel')}
            />
            <FieldError errors={[errors.unitLabel]} />
          </Field>
        ) : null}
      </FieldRow>

      {/* Two labels rather than two values: neither decides money, and a
          reader filling one is usually filling the other. */}
      <FieldRow columns={2}>
        {/*
          A combobox over the groups this service already uses, and **not a
          closed list**: `freeText` keeps whatever is typed, so a heading nobody
          has used yet can still be named.

          The suggestions are what the field is for. A group is a label the eye
          reads as a band, nothing keys off it, and retyping one by hand is how
          'Foundation System' comes to sit beside 'Foundation system' as two
          bands nothing will ever reconcile. Offering the 6 this service uses
          makes the consistent choice the easy one without making it the only
          one.
        */}
        <Field>
          <FieldLabel htmlFor="item-group">Group</FieldLabel>
          <Controller
            control={control}
            name="group"
            render={({ field }) => (
              <Combobox
                id="item-group"
                size="form"
                freeText
                placeholder="Brand experience"
                options={groups.map((group) => ({
                  value: group.name,
                  label: group.name,
                  action: (
                    <RemoveButton
                      label={`Remove the group ${group.name}`}
                      onConfirm={() => removeGroup(group.name)}
                      confirmTitle={`Remove "${group.name}"?`}
                      confirmDescription={`This clears the group from ${group.count} ${
                        group.count === 1 ? 'item' : 'items'
                      } on this service. The ${
                        group.count === 1 ? 'item stays' : 'items stay'
                      }, with ${
                        group.count === 1 ? 'its' : 'their'
                      } name, rate and id unchanged, and simply ${
                        group.count === 1 ? 'reads' : 'read'
                      } as ungrouped. Nothing is deleted.`}
                    />
                  ),
                }))}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <FieldError errors={[errors.group]} />
        </Field>

        <SacField
          control={control}
          name="sacCode"
          id="item-sac"
          label="SAC override"
          info="Blank means this item is classified under the Service's own SAC, which is almost always right. Fill it only where this particular item belongs somewhere else: a 3D scene under a web build is specialty design (998391) rather than IT development (998314)."
        />
      </FieldRow>
      </FieldGroup>

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">
          {item ? 'Save item' : 'Create item'}
        </Button>
      </div>
    </form>
  );
}
