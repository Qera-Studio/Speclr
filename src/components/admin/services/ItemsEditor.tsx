'use client';

import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel, FieldSet } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { RemoveButton } from '@/components/ui/remove-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SacField } from '@/components/form/fields';
import { numericField } from '@/components/form/inputFilters';
import { sacSchema } from '@/lib/domain/fields';
import { paiseToRupees, rupeesToPaise } from '@/lib/domain/money';
import { multilineSchema, textSchema } from '@/lib/domain/text';
import type { ContractService } from '@/lib/domain/service';
import type { ItemUnit, ServiceItem } from '@/lib/domain/serviceItem';
import { useSectionSave } from './useSectionSave';

const UNITS: { value: ItemUnit; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'perUnit', label: 'Per unit' },
];

/**
 * A line as the form holds it. Rupees as a string, the `EmployeeForm` pattern:
 * what a person types stays a string until `rupeesToPaise` turns it into the
 * one number that leaves this component.
 */
const rowSchema = z.object({
  id: z.string(),
  name: textSchema(300, { required: 'Say what this item is.' }),
  /**
   * Sales copy, printed under the name on a quotation and nowhere else.
   *
   * Not scope: the name is the scope (`serviceItem.ts`). An invoice prints the
   * name alone and so does a contract, because a deliverables list is a list.
   */
  blurb: multilineSchema(500),
  rupees: z
    .string()
    .refine(
      (v) => v.trim() === '' || rupeesToPaise(v.trim()) !== null,
      'Enter an amount like 12000 or 12000.50.',
    ),
  unit: z.enum(['fixed', 'monthly', 'perUnit']),
  unitLabel: textSchema(40),
  group: textSchema(80),
  /**
   * Blank-tolerant, because blank is the ordinary answer: an item inherits its
   * Service's code unless it is genuinely classified differently. The shared
   * rule runs on anything typed (`CONTEXT.md` §5f, the pair rule).
   */
  sacCode: sacSchema(),
  archived: z.boolean(),
});

const formSchema = z.object({ lines: z.array(rowSchema) });
type FormValues = z.infer<typeof formSchema>;
type Row = FormValues['lines'][number];

const EMPTY_ROW: Row = {
  id: '',
  name: '',
  blurb: '',
  rupees: '',
  unit: 'fixed',
  unitLabel: '',
  group: '',
  sacCode: '',
  archived: false,
};

const toRow = (item: ServiceItem): Row => ({
  id: item.id,
  name: item.name,
  blurb: item.blurb ?? '',
  rupees: item.ratePaise === undefined ? '' : paiseToRupees(item.ratePaise),
  unit: item.unit,
  unitLabel: item.unitLabel ?? '',
  group: item.group ?? '',
  sacCode: item.sacCode ?? '',
  archived: item.archived,
});

/**
 * What leaves the form. A blank rate is **absent**, not zero: "quoted per
 * engagement" and "given away" are different facts, and zero is the second.
 * A unit label is kept only on a per-unit line, where it means something.
 *
 * A blank blurb and a blank SAC are absent for the same reason in two
 * different keys. An empty blurb would print an empty paragraph under the name
 * on a quotation; an empty SAC would be an override that overrides nothing,
 * when what blank means is "the Service's code", which is the ordinary case.
 */
const toItem = (row: Row): ServiceItem => {
  const rupees = row.rupees.trim();
  return {
    id: row.id,
    name: row.name,
    ...(row.blurb.trim() ? { blurb: row.blurb.trim() } : {}),
    ...(rupees === '' ? {} : { ratePaise: rupeesToPaise(rupees) ?? 0 }),
    unit: row.unit,
    ...(row.unit === 'perUnit' && row.unitLabel ? { unitLabel: row.unitLabel } : {}),
    ...(row.group ? { group: row.group } : {}),
    ...(row.sacCode ? { sacCode: row.sacCode } : {}),
    archived: row.archived,
  };
};

/**
 * A Service's items: the priced lines every document reads a slice of.
 *
 * This is the form that makes adding a kind of work a two-minute job rather
 * than a code edit. An item is four things (what, how much, per what, under
 * which heading) and inherits everything else from the Service it sits under:
 * its handover, its completion criteria, its exclusions, the Schedule's terms.
 * That is why a new capability ("3D / Three.js scene") is a row here and not a
 * new Service.
 *
 * **An item's name is its scope**, which is why there is no wording field here
 * and adding one is a change to `docs/service-catalogue.md` first. See
 * `serviceItem.ts` for the three reasons.
 *
 * Posts the whole list to its own section and nothing else; the server reads
 * the row and overwrites `items` alone (`saveServiceSection`). A new item
 * carries `id: ''` and the server assigns one that is never reissued, because
 * client records cite these ids.
 */
export default function ItemsEditor({ service }: { service: ContractService }) {
  const { pending, serverError, save } = useSectionSave(service.code, 'items');

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: { lines: (service.items ?? []).map(toRow) },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');

  const submit = handleSubmit((values) => save({ items: values.lines.map(toItem) }));

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {fields.map((field, i) => (
        // A fieldset per line, named, so each row is one group to a screen
        // reader and to a test rather than four unrelated inputs in a row.
        <FieldSet key={field.id} aria-label={`Item ${i + 1}`} className="rounded-md border p-3">
          <FieldRow columns={2} className="grid-cols-[3fr_1fr]">
            <Field>
              <FieldLabel htmlFor={`item-name-${i}`}>Description</FieldLabel>
              <Input id={`item-name-${i}`} size="form" {...register(`lines.${i}.name`)} />
              <FieldError errors={[errors.lines?.[i]?.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`item-rate-${i}`}>Rate (₹)</FieldLabel>
              <Input
                id={`item-rate-${i}`}
                size="form"
                placeholder="Quoted"
                {...numericField(register(`lines.${i}.rupees`), 'money')}
              />
              <FieldError errors={[errors.lines?.[i]?.rupees]} />
            </Field>
          </FieldRow>

          {/* One sentence, and only a quotation prints it. No `rows`: a
              textarea grows with its content (`docs/design.md` §2.2). */}
          <Field>
            <FieldLabel htmlFor={`item-blurb-${i}`}>Blurb (quotation only)</FieldLabel>
            <Textarea
              id={`item-blurb-${i}`}
              placeholder="Getting the technical foundation of your site ready before any design work starts."
              {...register(`lines.${i}.blurb`)}
            />
            <FieldError errors={[errors.lines?.[i]?.blurb]} />
          </Field>

          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-36">
              <FieldLabel htmlFor={`item-unit-${i}`}>Unit</FieldLabel>
              <Controller
                control={control}
                name={`lines.${i}.unit`}
                render={({ field: unit }) => (
                  <Select value={unit.value} onValueChange={(v) => unit.onChange(v)}>
                    <SelectTrigger id={`item-unit-${i}`} size="form" className="w-full">
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

            {/* Only where it means something: "per screen", "per video". A
                label on a fixed line would be a field that goes nowhere. */}
            {lines[i]?.unit === 'perUnit' ? (
              <Field className="w-36">
                <FieldLabel htmlFor={`item-unit-label-${i}`}>Unit label</FieldLabel>
                <Input
                  id={`item-unit-label-${i}`}
                  size="form"
                  placeholder="per screen"
                  {...register(`lines.${i}.unitLabel`)}
                />
                <FieldError errors={[errors.lines?.[i]?.unitLabel]} />
              </Field>
            ) : null}

            <Field className="min-w-40 flex-1">
              <FieldLabel htmlFor={`item-group-${i}`}>Group</FieldLabel>
              <Input
                id={`item-group-${i}`}
                size="form"
                placeholder="Brand experience"
                {...register(`lines.${i}.group`)}
              />
              <FieldError errors={[errors.lines?.[i]?.group]} />
            </Field>

            {/* Blank means the Service's own code, which is the ordinary case.
                Filled only where this item classifies differently: a 3D scene
                under a web build is specialty design, not IT development. */}
            <div className="w-40">
              <SacField
                control={control}
                name={`lines.${i}.sacCode`}
                id={`item-sac-${i}`}
                label="SAC override"
                info="Blank means this item is classified under the Service's own SAC, which is almost always right. Fill it only where this particular item belongs somewhere else: a 3D scene under a web build is specialty design (998391) rather than IT development (998314)."
              />
            </div>

            <RemoveButton label={`Remove item ${i + 1}`} onConfirm={() => remove(i)} />
          </div>
        </FieldSet>
      ))}

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => append(EMPTY_ROW)}>
          <Plus aria-hidden="true" />
          Add an item
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save items'}
        </Button>
      </div>
    </form>
  );
}
