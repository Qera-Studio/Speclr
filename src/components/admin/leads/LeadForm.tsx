'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/patterns/ConfirmDialog';
import { EmailField } from '@/components/form/fields';
import PhoneField from '@/components/form/PhoneField';
import { INK, QUIET } from '@/components/admin/services/quiet';
import { LEAD_SOURCES, LEAD_STAGES, leadInputSchema, type Lead, type LeadInput } from '@/lib/domain/lead';
import { deleteLead, saveLead } from '@/server/actions/leads';
import { cn } from '@/lib/utils';

/** A `Select` cannot hold an empty value, so "no source" is this. */
const NONE = 'NONE';

/**
 * One lead, added or edited, in the side panel. Only what a first
 * conversation yields; the rest is asked when they become a client.
 */
export default function LeadForm({
  lead,
  services,
  onDone,
}: {
  /** Absent means a new lead. */
  lead?: Lead;
  /** The live catalogue, offered as what they asked about. */
  services: { code: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadInputSchema),
    mode: 'onTouched',
    defaultValues: {
      name: lead?.name ?? '',
      company: lead?.company ?? '',
      email: lead?.email ?? '',
      phone: lead?.phone ?? '',
      source: lead?.source ?? '',
      stage: lead?.stage ?? 'new',
      serviceCodes: lead?.serviceCodes ?? [],
      notes: lead?.notes ?? '',
    },
  });

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      setServerError(null);
      const result = await saveLead(lead ? { ...values, id: lead.id } : values);
      if (!result.success) {
        setServerError(result.error ?? 'Failed to save the lead.');
        return;
      }
      router.refresh();
      onDone();
    }),
  );

  const remove = () =>
    startDelete(async () => {
      if (!lead) return;
      const result = await deleteLead(lead.id);
      if (!result.success) {
        setServerError(result.error ?? 'Failed to delete the lead.');
        return;
      }
      router.refresh();
      onDone();
    });

  return (
    // Every label quiet, set once so the shared fields match.
    <form
      onSubmit={submit}
      noValidate
      className="flex min-h-full flex-col gap-4 **:data-[slot=field-label]:text-muted-foreground"
    >
      {/* Explicit columns override `FieldRow`'s container query, which needs a
          `field-group` this panel lacks. */}
      <FieldRow className="grid-cols-2 gap-x-8 gap-y-4">
        <Field>
          <FieldLabel htmlFor="lead-name">Name</FieldLabel>
          <Input id="lead-name" size="form" placeholder="Asha Rao" {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="lead-company">Company</FieldLabel>
          <Input id="lead-company" size="form" placeholder="Clayora" {...register('company')} />
          <FieldError errors={[errors.company]} />
        </Field>
        <EmailField control={control} name="email" id="lead-email" />
        <PhoneField control={control} name="phone" id="lead-phone" required={false} />

        <Field>
          <FieldLabel htmlFor="lead-stage">Stage</FieldLabel>
          <Controller
            control={control}
            name="stage"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                <SelectTrigger id="lead-stage" size="form" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent size="form">
                  {LEAD_STAGES.map((stage) => (
                    <SelectItem key={stage.key} value={stage.key}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="lead-source">Source</FieldLabel>
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <Select
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? '' : v)}
              >
                <SelectTrigger id="lead-source" size="form" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent size="form">
                  <SelectItem value={NONE}>Not known</SelectItem>
                  {LEAD_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldRow>

      {services.length > 0 ? (
        <Controller
          control={control}
          name="serviceCodes"
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="pb-2 text-body text-muted-foreground">Interested in</legend>
              <div className="flex flex-wrap gap-2">
                {services.map((service) => {
                  const on = field.value.includes(service.code);
                  return (
                    <Button
                      key={service.code}
                      type="button"
                      size="sm"
                      aria-pressed={on}
                      onClick={() =>
                        field.onChange(
                          on
                            ? field.value.filter((c) => c !== service.code)
                            : [...field.value, service.code],
                        )
                      }
                      className={cn(QUIET, on && 'border-foreground/30 text-foreground')}
                    >
                      {service.name}
                    </Button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />
      ) : null}

      <Field>
        <FieldLabel htmlFor="lead-notes">Notes</FieldLabel>
        <Textarea
          id="lead-notes"
          placeholder="What they need, budget, timeline."
          {...register('notes')}
        />
        <FieldError errors={[errors.notes]} />
      </Field>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {/* At the foot of the panel, wherever the fields end. */}
      <div className="mt-auto flex items-center gap-2 pt-4">
        {lead ? (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" className={QUIET}>
                Delete lead
              </Button>
            }
            title="Delete lead"
            consequence="Their name, contact details and notes are removed for good."
            confirmLabel="Delete lead"
            destructive
            pending={deleting}
            onConfirm={remove}
          />
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" variant="secondary" className={QUIET} onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className={INK} pending={pending}>
            {lead ? 'Save lead' : 'Add lead'}
          </Button>
        </div>
      </div>
    </form>
  );
}
