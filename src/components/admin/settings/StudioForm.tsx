'use client';

import '@/lib/zod-config';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GST_STATES } from '@/lib/domain/gstStates';
import { studioInputSchema, type StudioInfo } from '@/lib/domain/studio';
import { updateStudioSettings } from '@/server/actions/studio';

type FormValues = z.infer<typeof studioInputSchema>;

/**
 * Editor for the studio's own details — the "from:" block, bank, GSTIN and CIN
 * that every document prints.
 *
 * Two deliberate departures from `ClientForm`:
 *
 * - **The address is one textarea, not `AddressFields`.** The stored flat string
 *   is authoritative, and recomposing it from parts would insert a state line
 *   the current printed address doesn't have — a silent change to the paper.
 * - **The phone is a plain input, not `PhoneField`.** The number prints with its
 *   existing spacing ("+91 72001 24605"); forcing it through E.164 validation
 *   would rewrite what documents show.
 */
export default function StudioForm({ studio }: { studio: StudioInfo }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(studioInputSchema),
    defaultValues: {
      brandMark: studio.brandMark,
      legalName: studio.legalName,
      address: studio.address,
      phone: studio.phone,
      email: studio.email,
      thanksLine: studio.thanksLine,
      gstin: studio.gstin,
      cin: studio.cin,
      queryEmailHr: studio.queryEmailHr,
      stateCode: studio.stateCode,
      bank: { ...studio.bank },
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSaved(false);
    const result = await updateStudioSettings(values);
    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-2xl flex-col gap-4">
      <FieldGroup size="form">
        <FieldSet>
          <FieldLegend variant="label">Identity</FieldLegend>
          <FieldRow>
            <Field>
              <FieldLabel htmlFor="studio-legal-name">Legal name</FieldLabel>
              <Input id="studio-legal-name" size="form" {...register('legalName')} />
              <FieldError errors={[errors.legalName]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="studio-brand-mark">Brand mark</FieldLabel>
              <Input id="studio-brand-mark" size="form" {...register('brandMark')} />
              <FieldDescription>The wordmark beside the logo.</FieldDescription>
              <FieldError errors={[errors.brandMark]} />
            </Field>
          </FieldRow>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Address</FieldLegend>
          <Field>
            <FieldLabel htmlFor="studio-address">Registered address</FieldLabel>
            <Textarea id="studio-address" rows={4} {...register('address')} />
            <FieldDescription>
              One line per line, exactly as it should print. Ends with the country.
            </FieldDescription>
            <FieldError errors={[errors.address]} />
          </Field>
          <FieldRow>
            <Field>
              <FieldLabel htmlFor="studio-phone">Phone</FieldLabel>
              <Input id="studio-phone" size="form" {...register('phone')} />
              <FieldError errors={[errors.phone]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="studio-email">Email</FieldLabel>
              <Input id="studio-email" size="form" type="email" {...register('email')} />
              <FieldError errors={[errors.email]} />
            </Field>
          </FieldRow>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Tax &amp; registration</FieldLegend>
          <FieldRow>
            <Field>
              <FieldLabel htmlFor="studio-gstin">GSTIN</FieldLabel>
              <Input id="studio-gstin" size="form" {...register('gstin')} />
              <FieldError errors={[errors.gstin]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="studio-cin">CIN</FieldLabel>
              <Input id="studio-cin" size="form" {...register('cin')} />
              <FieldError errors={[errors.cin]} />
            </Field>
          </FieldRow>
          <Field>
            <FieldLabel htmlFor="studio-state-code">Registered state</FieldLabel>
            <Controller
              control={control}
              name="stateCode"
              render={({ field }) => (
                <Combobox
                  id="studio-state-code"
                  size="form"
                  options={GST_STATES.map((state) => ({
                    value: state.code,
                    label: `${state.code} — ${state.name}`,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select a state…"
                  emptyMessage="No matching states."
                />
              )}
            />
            <FieldDescription>
              Decides the CGST + SGST vs IGST split on every invoice — a client in
              this state is intra-state.
            </FieldDescription>
            <FieldError errors={[errors.stateCode]} />
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Bank</FieldLegend>
          <FieldRow>
            <Field>
              <FieldLabel htmlFor="studio-bank-name">Bank name</FieldLabel>
              <Input id="studio-bank-name" size="form" {...register('bank.bankName')} />
              <FieldError errors={[errors.bank?.bankName]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="studio-bank-account">Account number</FieldLabel>
              <Input id="studio-bank-account" size="form" {...register('bank.accountNo')} />
              <FieldError errors={[errors.bank?.accountNo]} />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field>
              <FieldLabel htmlFor="studio-bank-ifsc">IFSC</FieldLabel>
              <Input id="studio-bank-ifsc" size="form" {...register('bank.ifsc')} />
              <FieldError errors={[errors.bank?.ifsc]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="studio-bank-upi">UPI ID</FieldLabel>
              <Input id="studio-bank-upi" size="form" {...register('bank.upiId')} />
              <FieldError errors={[errors.bank?.upiId]} />
            </Field>
          </FieldRow>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Footer lines</FieldLegend>
          <Field>
            <FieldLabel htmlFor="studio-thanks-line">Thanks line</FieldLabel>
            <Input id="studio-thanks-line" size="form" {...register('thanksLine')} />
            <FieldDescription>Printed at the foot of invoices and receipts.</FieldDescription>
            <FieldError errors={[errors.thanksLine]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="studio-hr-email">HR query email</FieldLabel>
            <Input id="studio-hr-email" size="form" type="email" {...register('queryEmailHr')} />
            <FieldDescription>Printed on stipend slips and HR letters.</FieldDescription>
            <FieldError errors={[errors.queryEmailHr]} />
          </Field>
        </FieldSet>
      </FieldGroup>

      {serverError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-muted-foreground">
          Saved. Documents already issued keep the details they were issued with.
        </p>
      ) : null}

      <Button type="submit" size="lg" className="self-start" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  );
}
