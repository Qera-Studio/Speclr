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
import { numericField } from '@/components/form/inputFilters';
import { paiseToRupees, rupeesToPaise } from '@/lib/domain/money';
import { textSchema } from '@/lib/domain/text';
import type { ContractService, MenuLine, MenuUnit } from '@/lib/domain/service';
import { useSectionSave } from './useSectionSave';

const UNITS: { value: MenuUnit; label: string }[] = [
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
  text: textSchema(300, { required: 'Say what this line is.' }),
  rupees: z
    .string()
    .refine(
      (v) => v.trim() === '' || rupeesToPaise(v.trim()) !== null,
      'Enter an amount like 12000 or 12000.50.',
    ),
  unit: z.enum(['fixed', 'monthly', 'perUnit']),
  unitLabel: textSchema(40),
  group: textSchema(80),
});

const formSchema = z.object({ lines: z.array(rowSchema) });
type FormValues = z.infer<typeof formSchema>;
type Row = FormValues['lines'][number];

const EMPTY_ROW: Row = { id: '', text: '', rupees: '', unit: 'fixed', unitLabel: '', group: '' };

const toRow = (line: MenuLine): Row => ({
  id: line.id,
  text: line.text,
  rupees: line.ratePaise === undefined ? '' : paiseToRupees(line.ratePaise),
  unit: line.unit,
  unitLabel: line.unitLabel ?? '',
  group: line.group ?? '',
});

/**
 * What leaves the form. A blank rate is **absent**, not zero: "quoted per
 * engagement" and "given away" are different facts, and zero is the second.
 * A unit label is kept only on a per-unit line, where it means something.
 */
const toLine = (row: Row): MenuLine => {
  const rupees = row.rupees.trim();
  return {
    id: row.id,
    text: row.text,
    ...(rupees === '' ? {} : { ratePaise: rupeesToPaise(rupees) ?? 0 }),
    unit: row.unit,
    ...(row.unit === 'perUnit' && row.unitLabel ? { unitLabel: row.unitLabel } : {}),
    ...(row.group ? { group: row.group } : {}),
  };
};

/**
 * A Service's menu: the priced lines a contract ticks from.
 *
 * This is the form that makes adding a kind of work a two-minute job rather
 * than a code edit. A line is four things (what, how much, per what, under
 * which heading) and inherits everything else from the Service it sits under:
 * its handover, its completion criteria, its exclusions, the Schedule's terms.
 * That is why a new capability ("3D / Three.js scene") is a row here and not a
 * new Service.
 *
 * Posts the whole menu to its own section and nothing else; the server reads
 * the row and overwrites `menu` alone (`saveServiceSection`). A new line
 * carries `id: ''` and the server assigns one that is never reissued, because
 * client records cite these ids.
 */
export default function MenuEditor({ service }: { service: ContractService }) {
  const { pending, serverError, save } = useSectionSave(service.code, 'menu');

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: { lines: (service.menu ?? []).map(toRow) },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');

  const submit = handleSubmit((values) => save({ menu: values.lines.map(toLine) }));

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      {fields.map((field, i) => (
        // A fieldset per line, named, so each row is one group to a screen
        // reader and to a test rather than four unrelated inputs in a row.
        <FieldSet key={field.id} aria-label={`Line ${i + 1}`} className="rounded-md border p-3">
          <FieldRow columns={2} className="grid-cols-[3fr_1fr]">
            <Field>
              <FieldLabel htmlFor={`menu-text-${i}`}>Description</FieldLabel>
              <Input id={`menu-text-${i}`} size="form" {...register(`lines.${i}.text`)} />
              <FieldError errors={[errors.lines?.[i]?.text]} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`menu-rate-${i}`}>Rate (₹)</FieldLabel>
              <Input
                id={`menu-rate-${i}`}
                size="form"
                placeholder="Quoted"
                {...numericField(register(`lines.${i}.rupees`), 'money')}
              />
              <FieldError errors={[errors.lines?.[i]?.rupees]} />
            </Field>
          </FieldRow>

          <div className="flex flex-wrap items-end gap-3">
            <Field className="w-36">
              <FieldLabel htmlFor={`menu-unit-${i}`}>Unit</FieldLabel>
              <Controller
                control={control}
                name={`lines.${i}.unit`}
                render={({ field: unit }) => (
                  <Select value={unit.value} onValueChange={(v) => unit.onChange(v)}>
                    <SelectTrigger id={`menu-unit-${i}`} size="form" className="w-full">
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
                <FieldLabel htmlFor={`menu-unit-label-${i}`}>Unit label</FieldLabel>
                <Input
                  id={`menu-unit-label-${i}`}
                  size="form"
                  placeholder="per screen"
                  {...register(`lines.${i}.unitLabel`)}
                />
                <FieldError errors={[errors.lines?.[i]?.unitLabel]} />
              </Field>
            ) : null}

            <Field className="min-w-40 flex-1">
              <FieldLabel htmlFor={`menu-group-${i}`}>Group</FieldLabel>
              <Input
                id={`menu-group-${i}`}
                size="form"
                placeholder="Brand experience"
                {...register(`lines.${i}.group`)}
              />
              <FieldError errors={[errors.lines?.[i]?.group]} />
            </Field>

            <RemoveButton label={`Remove line ${i + 1}`} onConfirm={() => remove(i)} />
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
          Add a line
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save menu'}
        </Button>
      </div>
    </form>
  );
}
