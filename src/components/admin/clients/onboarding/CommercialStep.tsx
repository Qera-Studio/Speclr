'use client';

import '@/lib/zod-config';
import { useCallback } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
import { Combobox } from '@/components/ui/combobox';
import FieldInfo, { LegendInfo } from '@/components/form/FieldInfo';
import { numericField } from '@/components/form/inputFilters';
import {
  BILLING_CYCLES,
  ENGAGEMENT_TYPES,
  clientCommercialSchema,
  type ClientCommercial,
} from '@/lib/domain/client';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/domain/currency';
import { draftKey, useFormDraft } from '@/lib/draft';
import { StepForm, asOptionalNumber, pruneEmpty, useStepSave, type StepProps } from './stepKit';

/** Only the fields this step owns; the term and services belong to the next one. */
type FormValues = Omit<ClientCommercial, 'services' | 'startDate' | 'termMonths' | 'autoRenew' | 'noticeDays'>;

const ENGAGEMENT_LABELS: Record<string, string> = {
  retainer: 'Retainer — ongoing, billed on a cycle',
  project: 'Project — a defined scope, billed against it',
  hourly: 'Hourly — billed against time',
};

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

/**
 * Commercial terms.
 *
 * The field that earns this step is **payment terms**: it is what an invoice's
 * due date is derived from. Until now that date was typed per invoice, which is
 * the same shape of mistake as a typed place of supply — a fact the system
 * already knew, asked of the operator anyway.
 *
 * `poRequired` is not decoration either. A client whose accounts payable will
 * not process an invoice without a PO number is a client whose invoice sits
 * unpaid for a month, so finalizing one without a PO is refused rather than
 * merely discouraged.
 *
 * **Currency is record-keeping only.** It records what was agreed; invoices
 * still print INR, because a GST document from an Indian entity must show its
 * tax in INR regardless of the billing currency and the CGST/SGST split is
 * rupee-shaped. `currency.ts` states the whole reasoning.
 *
 * This step and the next both write `commercial`, so each merges onto whatever
 * the other saved — a section save replaces its column, and a half-payload
 * would silently drop the other half.
 */
export default function CommercialStep({ client, onSaved, submitLabel }: StepProps) {
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
      clientCommercialSchema.omit({
        services: true,
        startDate: true,
        termMonths: true,
        autoRenew: true,
        noticeDays: true,
      }),
    ),
    defaultValues: {
      currency: client?.commercial?.currency ?? DEFAULT_CURRENCY,
      paymentTermsDays: client?.commercial?.paymentTermsDays,
      engagementType: client?.commercial?.engagementType,
      billingCycle: client?.commercial?.billingCycle,
      billingDay: client?.commercial?.billingDay,
      lateFeePercentPerMonth: client?.commercial?.lateFeePercentPerMonth,
      poRequired: client?.commercial?.poRequired ?? false,
      poNumber: client?.commercial?.poNumber ?? '',
      vendorPortalUrl: client?.commercial?.vendorPortalUrl ?? '',
    },
  });

  const engagementType = useWatch({ control, name: 'engagementType' });
  const poRequired = useWatch({ control, name: 'poRequired' });

  const toPayload = useCallback(
    (values: FormValues) => ({ ...client?.commercial, ...pruneEmpty(values) }),
    [client?.commercial],
  );
  // Restores what was typed but not saved, so a refresh or a hop to the other
  // profile comes back to the same half-filled form. Cleared on save.
  useFormDraft(draftKey(client?.id, 'commercial'), watch, reset);

  const { serverError, save } = useStepSave<FormValues>(client, 'commercial', onSaved, toPayload);

  return (
    <StepForm
      onSubmit={handleSubmit(save)}
      serverError={serverError}
      submitting={isSubmitting}
      submitLabel={submitLabel}
    >
      <FieldRow>
        <Field>
          <FieldInfo
            htmlFor="client-currency"
            label="Billing currency"
            info="Recorded as what was agreed. Invoices still print INR: a GST document from an Indian entity must show its tax in INR whatever the billing currency, and the CGST/SGST split is rupee-shaped."
            infoLabel="Why do invoices still print INR?"
          />
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Combobox
                id="client-currency"
                size="form"
                options={CURRENCIES.map((c) => ({ value: c.code, label: c.code }))}
                value={field.value ?? ''}
                onValueChange={field.onChange}
                placeholder="Select a currency…"
                emptyMessage="No matching currencies."
              />
            )}
          />
          <FieldError errors={[errors.currency]} />
        </Field>

        <Field>
          <FieldInfo
            htmlFor="client-payment-terms"
            label="Payment terms (days)"
            info="An invoice's due date is derived from this and its issue date, instead of being typed each time."
            infoLabel="What are payment terms used for?"
          />
          <Input
            id="client-payment-terms"
            size="form"
            placeholder="30"
            {...numericField(register('paymentTermsDays', asOptionalNumber))}
          />
          <FieldError errors={[errors.paymentTermsDays]} />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field>
          <FieldLabel htmlFor="client-engagement">Engagement type</FieldLabel>
          <Controller
            control={control}
            name="engagementType"
            render={({ field }) => (
              <Combobox
                id="client-engagement"
                size="form"
                options={ENGAGEMENT_TYPES.map((t) => ({ value: t, label: ENGAGEMENT_LABELS[t] }))}
                value={field.value ?? ''}
                onValueChange={field.onChange}
                placeholder="Select an engagement type…"
                emptyMessage="No matching types."
              />
            )}
          />
          <FieldError errors={[errors.engagementType]} />
        </Field>

      {engagementType === 'retainer' ? (
        <FieldRow>
          <Field>
            <FieldLabel htmlFor="client-billing-cycle">Billing cycle</FieldLabel>
            <Controller
              control={control}
              name="billingCycle"
              render={({ field }) => (
                <Combobox
                  id="client-billing-cycle"
                  size="form"
                  options={BILLING_CYCLES.map((c) => ({ value: c, label: CYCLE_LABELS[c] }))}
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                  placeholder="Select a cycle…"
                  emptyMessage="No matching cycles."
                />
              )}
            />
            <FieldError errors={[errors.billingCycle]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="client-billing-day">Billed on day</FieldLabel>
            <Input
              id="client-billing-day"
              size="form"
              placeholder="1"
              {...numericField(register('billingDay', asOptionalNumber))}
            />
            <FieldError errors={[errors.billingDay]} />
          </Field>
        </FieldRow>
      ) : null}

        <Field>
          <FieldInfo
            htmlFor="client-late-fee"
            label="Late payment interest (% / month)"
            info="Qera’s standard invoice terms say 1.5% per month. Recorded here so a client who negotiated something else is not billed the standard rate by accident."
            infoLabel="What is the standard late fee?"
          />
          <Input
            id="client-late-fee"
            size="form"
            placeholder="1.5"
            {...numericField(register('lateFeePercentPerMonth', asOptionalNumber), 'money')}
          />
          <FieldError errors={[errors.lateFeePercentPerMonth]} />
        </Field>
      </FieldRow>

      <FieldSeparator />

      <FieldSet>
        <LegendInfo
          info="How this client wants to receive an invoice. Enterprise clients often have requirements that change the delivery step entirely."
          label="About invoice submission"
        >
          Invoice submission
        </LegendInfo>

        <Field orientation="horizontal">
          <FieldInfo
            htmlFor="client-po-required"
            label="A PO is required before invoicing"
            info="Finalizing an invoice for this client without a PO number will be refused. Their accounts payable will not process one, so an invoice without it simply waits."
            infoLabel="What does requiring a PO do?"
          />
          <Controller
            control={control}
            name="poRequired"
            render={({ field }) => (
              <Switch
                id="client-po-required"
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>

        {poRequired ? (
          <Field>
            <FieldLabel htmlFor="client-po-number">PO number</FieldLabel>
            <Input
              id="client-po-number"
              size="form"
              placeholder="PO-2026-0042"
              {...register('poNumber')}
            />
            <FieldError errors={[errors.poNumber]} />
          </Field>
        ) : null}

        <Field>
          <FieldInfo
            htmlFor="client-vendor-portal"
            label="Vendor portal"
            info="Where invoices are submitted, if not by email. Large clients often route everything through Coupa, Ariba or their own portal."
            infoLabel="What is the vendor portal?"
          />
          <Input
            id="client-vendor-portal"
            size="form"
            type="url"
            placeholder="https://clayora.coupahost.com"
            {...register('vendorPortalUrl')}
          />
          <FieldError errors={[errors.vendorPortalUrl]} />
        </Field>
      </FieldSet>
    </StepForm>
  );
}
