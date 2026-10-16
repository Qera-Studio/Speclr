'use client';

import { useFieldArray, useForm, type Control, type UseFormRegister } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { RemoveButton } from '@/components/patterns/ConfirmAction';
import { Textarea } from '@/components/ui/textarea';
import { partSectionLabel } from '@/lib/domain/contract/completeness';
import type { ContractService, ServiceRow } from '@/lib/domain/service';
import { useSectionSave } from './useSectionSave';

/** The paragraph lists, each one textarea; the section id names its heading. */
const PARAGRAPHS = [
  ['included', 'included'],
  ['accountTerms', 'account'],
  ['limitsNotes', 'limitsNotes'],
  ['completion', 'completion'],
  ['receives', 'receives'],
  ['receivesNotes', 'receivesNotes'],
] as const;

type ParagraphKey = (typeof PARAGRAPHS)[number][0];

interface FormValues extends Record<ParagraphKey, string> {
  thirdPartyCosts: string;
  limits: ServiceRow[];
  fee: ServiceRow[];
}

/** One paragraph per line, as typed; blank lines are dropped on the way out. */
const paragraphs = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * A Limits or Fee table: label/value rows, each a `[blank]` more often than
 * not. Its own field array so a row can be added or removed on its own.
 */
function RowsEditor({
  name,
  legend,
  itemLabel,
  control,
  register,
}: {
  name: 'limits' | 'fee';
  legend: string;
  /** 'Limit', 'Fee row': names each row's group and its remove button. */
  itemLabel: string;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const lower = itemLabel.toLowerCase();

  return (
    <FieldSet>
      <FieldLegend>{legend}</FieldLegend>
      {fields.map((field, i) => (
        <FieldSet key={field.id} aria-label={`${itemLabel} ${i + 1}`}>
          <div className="flex items-end gap-3">
            <FieldRow columns={2} className="flex-1">
              <Field>
                <FieldLabel htmlFor={`${name}-label-${i}`}>Label</FieldLabel>
                <Input id={`${name}-label-${i}`} size="form" {...register(`${name}.${i}.label`)} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${name}-value-${i}`}>Value</FieldLabel>
                <Input id={`${name}-value-${i}`} size="form" {...register(`${name}.${i}.value`)} />
              </Field>
            </FieldRow>
            <RemoveButton label={`Remove ${lower} ${i + 1}`} onConfirm={() => remove(i)} />
          </div>
        </FieldSet>
      ))}
      <div>
        <Button type="button" variant="secondary" onClick={() => append({ label: '', value: '' })}>
          <Plus aria-hidden="true" />
          Add a {lower}
        </Button>
      </div>
    </FieldSet>
  );
}

/**
 * Every prose field of a Service, editable in the app.
 *
 * This is what retires the code file as the place a Service's wording lives.
 * A list of paragraphs is one textarea with a paragraph per line, the pattern
 * the details dialog already uses for the overview; the two tables are rows.
 * The headings are `partSectionLabel`, the same map the sheet prints from, so
 * the form and the document cannot come to call a section different things.
 *
 * Posts the wording section and only that (`saveServiceSection`): the menu,
 * the rate, the name and the libraries are other forms, and a key this one
 * never sends is a key it cannot blank.
 */
export default function WordingForm({ service }: { service: ContractService }) {
  const { pending, serverError, save } = useSectionSave(service.code, 'wording');
  const label = (section: string) => partSectionLabel(section, service.scheduleKey);

  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      included: service.included.join('\n'),
      accountTerms: service.accountTerms.join('\n'),
      limitsNotes: service.limitsNotes.join('\n'),
      completion: service.completion.join('\n'),
      receives: service.receives.join('\n'),
      receivesNotes: service.receivesNotes.join('\n'),
      thirdPartyCosts: service.thirdPartyCosts,
      limits: service.limits,
      fee: service.fee,
    },
  });

  const submit = handleSubmit((values) =>
    save({
      included: paragraphs(values.included),
      accountTerms: paragraphs(values.accountTerms),
      limitsNotes: paragraphs(values.limitsNotes),
      completion: paragraphs(values.completion),
      receives: paragraphs(values.receives),
      receivesNotes: paragraphs(values.receivesNotes),
      thirdPartyCosts: values.thirdPartyCosts.trim(),
      limits: values.limits,
      fee: values.fee,
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {/* Not `FieldDescription` (CONTEXT §5e): a standing note about the whole
          form, said once, rather than a description under each field. */}
      <p className="text-body text-muted-foreground">
        One paragraph per line. Anything in [brackets] becomes a blank the contract fills
        in, labelled by the sentence it sits in.
      </p>

      {PARAGRAPHS.map(([key, section]) => (
        <Field key={key}>
          <FieldLabel htmlFor={`wording-${key}`}>{label(section)}</FieldLabel>
          <Textarea id={`wording-${key}`} rows={4} {...register(key)} />
        </Field>
      ))}

      <RowsEditor
        name="limits"
        legend={label('limits')}
        itemLabel="Limit"
        control={control}
        register={register}
      />

      <Field>
        <FieldLabel htmlFor="wording-costs">{label('costs')}</FieldLabel>
        <Textarea id="wording-costs" rows={2} {...register('thirdPartyCosts')} />
      </Field>

      <RowsEditor
        name="fee"
        legend={label('fee')}
        itemLabel="Fee row"
        control={control}
        register={register}
      />

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save wording'}
        </Button>
      </div>
    </form>
  );
}
