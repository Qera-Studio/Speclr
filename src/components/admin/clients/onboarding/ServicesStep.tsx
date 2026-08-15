'use client';

import '@/lib/zod-config';
import { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import FieldInfo, { LegendInfo } from '@/components/form/FieldInfo';
import { numericField } from '@/components/form/inputFilters';
import { clientCommercialSchema, type ClientCommercial } from '@/lib/domain/client';
import { normalizeRupeeInput, paiseToRupees, rupeesToPaise } from '@/lib/domain/money';
import type { ContractService } from '@/lib/domain/contract/service';
import { draftKey, useFormDraft } from '@/lib/draft';
import { StepForm, asOptionalNumber, pruneEmpty, useStepSave, type StepProps } from './stepKit';

type FormValues = Pick<ClientCommercial, 'startDate' | 'termMonths' | 'autoRenew' | 'noticeDays'>;

/**
 * Services & term — what was engaged, at what rate, for how long.
 *
 * The agreed rate is deliberately per-client and optional. A service's
 * catalogue rate is what it is normally sold at; what a particular client
 * agreed may differ, and the honest place for that is on the relationship
 * rather than on the service. A blank rate means "the catalogue one", not zero
 * — which is why an untouched service stores no rate at all.
 *
 * Rates are held as **integer paise**, converted at the edge, like every other
 * amount in this system. A float here would drift against the same figure on an
 * invoice, and the two disagreeing is precisely the failure the client record
 * exists to prevent.
 *
 * Writes the `commercial` column, as the previous step does, so it merges onto
 * whatever that step saved rather than replacing it.
 */
export default function ServicesStep({
  client,
  onSaved,
  submitLabel,
  services,
}: StepProps & { services: ContractService[] }) {
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const service of client?.commercial?.services ?? []) {
      initial[service.code] =
        service.ratePaise === undefined ? '' : paiseToRupees(service.ratePaise);
    }
    return initial;
  });
  const [rateError, setRateError] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // Errors land when a field is left, not only at submit. Seven steps of
    // silence followed by one page of red is a worse trade than being told
    // where you are as you go.
    mode: 'onBlur',
    resolver: zodResolver(
      clientCommercialSchema.pick({
        startDate: true,
        termMonths: true,
        autoRenew: true,
        noticeDays: true,
      }),
    ),
    defaultValues: {
      startDate: client?.commercial?.startDate ?? '',
      termMonths: client?.commercial?.termMonths,
      autoRenew: client?.commercial?.autoRenew ?? false,
      noticeDays: client?.commercial?.noticeDays,
    },
  });

  const toggle = (code: string) =>
    setSelected((current) => {
      if (code in current) {
        const { [code]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [code]: '' };
    });

  const toPayload = useCallback(
    (values: FormValues) => ({
      ...client?.commercial,
      ...pruneEmpty(values),
      services: Object.entries(selected).map(([code, rupees]) => {
        const trimmed = rupees.trim();
        return trimmed === '' ? { code } : { code, ratePaise: rupeesToPaise(trimmed) ?? 0 };
      }),
    }),
    [client?.commercial, selected],
  );

  // Restores what was typed but not saved, so a refresh or a hop to the other
  // profile comes back to the same half-filled form. Cleared on save.
  useFormDraft(draftKey(client?.id, 'services'), watch, reset);

  const { serverError, save } = useStepSave<FormValues>(client, 'commercial', onSaved, toPayload, 'services');

  const onSubmit = handleSubmit(async (values) => {
    // A rate that will not parse must stop the save rather than round to zero:
    // "no agreed rate" and "agreed at nothing" are different facts.
    const bad = Object.entries(selected).find(
      ([, rupees]) => rupees.trim() !== '' && rupeesToPaise(rupees.trim()) === null,
    );
    if (bad) {
      setRateError(`The agreed rate for service ${bad[0]} is not an amount.`);
      return;
    }
    setRateError(null);
    await save(values);
  });

  return (
    <StepForm
      onSubmit={onSubmit}
      serverError={serverError ?? rateError}
      submitting={isSubmitting}
      submitLabel={submitLabel}
    >
      <FieldSet>
        <LegendInfo
          info="Tick what this client has engaged. Leave a rate blank to bill the catalogue rate — a rate here records what this client agreed instead, which may differ."
          label="About services and agreed rates"
        >
          Services engaged
        </LegendInfo>

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No services in the library yet — add them at{' '}
            <a href="/client/services" className="underline">
              Services
            </a>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {services.map((service) => {
              const isOn = service.code in selected;
              const id = `service-${service.code}`;
              const rateId = `service-rate-${service.code}`;
              return (
                <li key={service.code} className="flex flex-col gap-2 rounded-md px-1 py-1.5">
                  <div className="flex items-center gap-3">
                    <Checkbox id={id} checked={isOn} onCheckedChange={() => toggle(service.code)} />
                    <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm">
                      <span className="text-muted-foreground tabular-nums">{service.code}</span>{' '}
                      {service.name}
                    </label>
                  </div>

                  {/*
                    The agreed rate carried no visible label — only an
                    `aria-label` and the word "Catalogue" as a placeholder,
                    which read as an unexplained, apparently-disabled box. It is
                    labelled, indented under its service, and prefixed with the
                    unit it is actually in.
                  */}
                  {isOn ? (
                    <div className="flex items-center gap-2 pl-8">
                      <FieldLabel htmlFor={rateId} className="text-muted-foreground font-normal">
                        Agreed rate
                      </FieldLabel>
                      <div className="relative">
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground"
                        >
                          ₹
                        </span>
                        <Input
                          id={rateId}
                          size="form"
                          className="w-40 pl-6"
                          inputMode="decimal"
                          placeholder="Catalogue rate"
                          value={selected[service.code]}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [service.code]: normalizeRupeeInput(event.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        <FieldLegend variant="label">Contract term</FieldLegend>

        <FieldRow>
          <Field>
            <FieldLabel htmlFor="client-start-date">Engagement starts</FieldLabel>
            {/*
              `DatePicker`, not the browser's native date input, which ignores
              the theme entirely — the reason the primitive exists, and what
              `design-system.test.ts` now keeps out.
            */}
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DatePicker
                  id="client-start-date"
                  size="form"
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  placeholder="Pick a start date"
                />
              )}
            />
            <FieldError errors={[errors.startDate]} />
          </Field>

          <Field>
            <FieldInfo
              htmlFor="client-term-months"
              label="Length (months)"
              info="How long the engagement runs from the start date. Blank means open-ended."
              infoLabel="What is the term length?"
            />
            <Input
              id="client-term-months"
              size="form"
              placeholder="12"
              {...numericField(register('termMonths', asOptionalNumber))}
            />
            <FieldError errors={[errors.termMonths]} />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field>
            <FieldInfo
              htmlFor="client-notice-days"
              label="Notice period (days)"
              info="How much notice either side gives to end the engagement. The contract's Schedule carries the binding version; this records what was agreed so the two can be checked against each other."
              infoLabel="What is the notice period for?"
            />
            <Input
              id="client-notice-days"
              size="form"
              placeholder="30"
              {...numericField(register('noticeDays', asOptionalNumber))}
            />
            <FieldError errors={[errors.noticeDays]} />
          </Field>

          <Field orientation="horizontal">
            <FieldLabel htmlFor="client-auto-renew">Renews automatically</FieldLabel>
            <Controller
              control={control}
              name="autoRenew"
              render={({ field }) => (
                <Switch
                  id="client-auto-renew"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </Field>
        </FieldRow>
      </FieldSet>
    </StepForm>
  );
}
