'use client';

import '@/lib/zod-config';
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Field, FieldLabel, FieldError, FieldGroup, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RemoveButton } from '@/components/ui/remove-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createService, updateService } from '@/server/actions/services';
import type { ServiceTemplate } from '@/lib/domain/serviceTemplate';

interface FormValues {
  name: string;
  overview: string;
  scopeItems: { value: string }[];
  exclusionItems: { value: string }[];
  priceNote: string;
  milestones: { label: string; scope: string }[];
  revisionsNote: string;
  disclaimerNote: string;
  supportNote: string;
}

export default function ServiceForm({
  service,
  onDone,
}: {
  service?: ServiceTemplate | null;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: service
      ? {
          name: service.name,
          overview: service.overview,
          scopeItems: service.scopeItems.map((value) => ({ value })),
          exclusionItems: service.exclusionItems.map((value) => ({ value })),
          priceNote: service.priceNote,
          milestones: service.milestones.map((m) => ({ label: m.label, scope: m.scope })),
          revisionsNote: service.revisionsNote,
          disclaimerNote: service.disclaimerNote,
          supportNote: service.supportNote,
        }
      : {
          name: '',
          overview: '',
          scopeItems: [],
          exclusionItems: [],
          priceNote: '',
          milestones: [],
          revisionsNote: '',
          disclaimerNote: '',
          supportNote: '',
        },
  });

  const scope = useFieldArray({ control, name: 'scopeItems' });
  const exclusions = useFieldArray({ control, name: 'exclusionItems' });
  const milestones = useFieldArray({ control, name: 'milestones' });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    if (!values.name.trim()) {
      setError('name', { message: 'Name is required.' });
      return;
    }

    const payload = {
      name: values.name.trim(),
      overview: values.overview,
      scopeItems: values.scopeItems.map((s) => s.value).filter((v) => v.trim() !== ''),
      exclusionItems: values.exclusionItems.map((s) => s.value).filter((v) => v.trim() !== ''),
      priceNote: values.priceNote,
      milestones: values.milestones.filter((m) => m.label.trim() !== '' || m.scope.trim() !== ''),
      revisionsNote: values.revisionsNote,
      disclaimerNote: values.disclaimerNote,
      supportNote: values.supportNote,
    };

    const result = service
      ? await updateService(service.id, payload)
      : await createService(payload);

    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }

    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="service-name">Name</FieldLabel>
          <Input id="service-name" {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="service-overview">Overview</FieldLabel>
          <Textarea id="service-overview" rows={3} {...register('overview')} />
          <FieldError errors={[errors.overview]} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Scope</FieldLegend>
          {scope.fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel htmlFor={`scope-item-${index}`}>{`Scope item ${index + 1}`}</FieldLabel>
                <Input id={`scope-item-${index}`} {...register(`scopeItems.${index}.value`)} />
              </Field>
              <RemoveButton
                label={`Remove scope ${index + 1}`}
                onConfirm={() => scope.remove(index)}
              />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => scope.append({ value: '' })}>
            Add scope item
          </Button>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Exclusions</FieldLegend>
          {exclusions.fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel htmlFor={`exclusion-item-${index}`}>{`Exclusion item ${index + 1}`}</FieldLabel>
                <Input id={`exclusion-item-${index}`} {...register(`exclusionItems.${index}.value`)} />
              </Field>
              <RemoveButton
                label={`Remove exclusion ${index + 1}`}
                onConfirm={() => exclusions.remove(index)}
              />
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => exclusions.append({ value: '' })}>
            Add exclusion item
          </Button>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="service-price-note">Price &amp; payment</FieldLabel>
          <Textarea id="service-price-note" rows={3} {...register('priceNote')} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Milestones</FieldLegend>
          {milestones.fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2">
              <Field className="flex-1">
                <FieldLabel htmlFor={`milestone-label-${index}`}>{`Milestone ${index + 1} label`}</FieldLabel>
                <Input id={`milestone-label-${index}`} {...register(`milestones.${index}.label`)} />
              </Field>
              <Field className="flex-1">
                <FieldLabel htmlFor={`milestone-scope-${index}`}>{`Milestone ${index + 1} scope`}</FieldLabel>
                <Input id={`milestone-scope-${index}`} {...register(`milestones.${index}.scope`)} />
              </Field>
              <RemoveButton
                label={`Remove milestone ${index + 1}`}
                onConfirm={() => milestones.remove(index)}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => milestones.append({ label: '', scope: '' })}
          >
            Add milestone
          </Button>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="service-revisions">Revisions</FieldLabel>
          <Textarea id="service-revisions" rows={3} {...register('revisionsNote')} />
        </Field>

        <Field>
          <FieldLabel htmlFor="service-disclaimer">Disclaimer</FieldLabel>
          <Textarea id="service-disclaimer" rows={3} {...register('disclaimerNote')} />
        </Field>

        <Field>
          <FieldLabel htmlFor="service-support">Support &amp; ownership</FieldLabel>
          <Textarea id="service-support" rows={3} {...register('supportNote')} />
        </Field>
      </FieldGroup>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : service ? 'Save changes' : 'Add service'}
      </Button>
    </form>
  );
}
