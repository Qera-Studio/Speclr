'use client';

import '@/lib/zod-config';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import FieldInfo from '@/components/form/FieldInfo';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import IfscField from '@/components/form/IfscField';
import { CinField, EmailField, GstinField } from '@/components/form/fields';
import { GST_STATES } from '@/lib/domain/gstStates';
import { studioInputSchema, type StudioInfo } from '@/lib/domain/studio';
import { updateStudioSettings } from '@/server/actions/studio';
import { numericField } from '@/components/form/inputFilters';

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
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // First blur, then every keystroke, the same rule the onboarding steps
    // run under, and for the same reason: a form that stays silent until submit
    // reports every mistake at once, at the moment the operator has decided
    // they are finished. See the note in `CommercialStep`.
    mode: 'onTouched',
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
              <Input
                id="studio-legal-name"
                size="form"
                autoComplete="organization"
                {...register('legalName')}
              />
              <FieldError errors={[errors.legalName]} />
            </Field>
            <Field>
              <FieldInfo
                htmlFor="studio-brand-mark"
                label="Brand mark"
                info="The wordmark that prints beside the logo, which is not always the legal name."
                infoLabel="What is the brand mark?"
              />
              <Input
                id="studio-brand-mark"
                size="form"
                placeholder="Qera Studio"
                autoComplete="off"
                {...register('brandMark')}
              />
              <FieldError errors={[errors.brandMark]} />
            </Field>
          </FieldRow>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Address</FieldLegend>
          <Field>
            <FieldInfo
              htmlFor="studio-address"
              label="Registered address"
              info="One line per line, exactly as it should print. Ends with the country."
              infoLabel="How should the address be laid out?"
            />
            <Textarea
              id="studio-address"
              rows={4}
              placeholder={'B-12, Sector 62\nNoida, Uttar Pradesh 201309\nIndia'}
              autoComplete="street-address"
              {...register('address')}
            />
            <FieldError errors={[errors.address]} />
          </Field>
          <FieldRow>
            <Field>
              <FieldLabel htmlFor="studio-phone">Phone</FieldLabel>
              <Input id="studio-phone" size="form" autoComplete="tel" {...register('phone')} />
              <FieldError errors={[errors.phone]} />
            </Field>
            <EmailField control={control} name="email" id="studio-email" />
          </FieldRow>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Tax &amp; registration</FieldLegend>
          {/* A row each: GSTIN is 15 characters and CIN is 21, and neither is
              readable in half a 384px rail. Anything longer than about sixteen
              gets its own row. */}
          {/* These were plain text inputs with no validation at all, while a
              *client's* GSTIN was held to its mod-36 check character. Ours is
              the one frozen onto every invoice we issue. */}
          <GstinField
            control={control}
            name="gstin"
            id="studio-gstin"
            info="Qera's own registration. Its first two digits are the studio's state, which decides CGST + SGST against IGST on every invoice."
          />
          <CinField control={control} name="cin" id="studio-cin" />
          <Field>
            <FieldInfo
              htmlFor="studio-state-code"
              label="Registered state"
              info="Decides the CGST + SGST vs IGST split on every invoice — a client in this state is intra-state."
              infoLabel="What does the registered state decide?"
            />
            <Controller
              control={control}
              name="stateCode"
              render={({ field }) => (
                <Combobox
                  id="studio-state-code"
                  size="form"
                  options={GST_STATES.map((state) => ({
                    value: state.code,
                    label: `${state.code} · ${state.name}`,
                  }))}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select a state…"
                  emptyMessage="No matching states."
                />
              )}
            />
            <FieldError errors={[errors.stateCode]} />
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Bank</FieldLegend>
          {/* IFSC first: it fills in the bank name and branch below, so the
              field that drives the others comes before them. */}
          <FieldRow>
            <IfscField
              control={control}
              name="bank.ifsc"
              bankNameField="bank.bankName"
              branchField="bank.branch"
              setValue={setValue}
              id="studio-bank-ifsc"
            />
            <Field>
              <FieldLabel htmlFor="studio-bank-account">Account number</FieldLabel>
              <Input
                id="studio-bank-account"
                size="form"
                autoComplete="off"
                {...numericField(register('bank.accountNo'))}
              />
              <FieldError errors={[errors.bank?.accountNo]} />
            </Field>
          </FieldRow>
          {/* Filled by the lookup but never disabled: the lookup is an
              enhancement, and a bank it can't find must still be typeable. */}
          <FieldRow>
            <Field>
              <FieldLabel htmlFor="studio-bank-name">Bank name</FieldLabel>
              <Input
                id="studio-bank-name"
                size="form"
                placeholder="Enter an IFSC to fill this in"
                autoComplete="off"
                {...register('bank.bankName')}
              />
              <FieldError errors={[errors.bank?.bankName]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="studio-bank-branch">Branch</FieldLabel>
              <Input
                id="studio-bank-branch"
                size="form"
                placeholder="Enter an IFSC to fill this in"
                autoComplete="off"
                {...register('bank.branch')}
              />
              <FieldError errors={[errors.bank?.branch]} />
            </Field>
          </FieldRow>
          <Field>
            <FieldLabel htmlFor="studio-bank-upi">UPI ID</FieldLabel>
            <Input id="studio-bank-upi" size="form" autoComplete="off" {...register('bank.upiId')} />
            <FieldError errors={[errors.bank?.upiId]} />
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Footer lines</FieldLegend>
          <Field>
            <FieldInfo
              htmlFor="studio-thanks-line"
              label="Thanks line"
              info="Printed at the foot of invoices and receipts."
              infoLabel="Where does the thanks line appear?"
            />
            <Input
              id="studio-thanks-line"
              size="form"
              placeholder="Thank you for your business."
              autoComplete="off"
              {...register('thanksLine')}
            />
            <FieldError errors={[errors.thanksLine]} />
          </Field>
          <Field>
            <FieldInfo
              htmlFor="studio-hr-email"
              label="HR query email"
              info="Printed on stipend slips, pay slips and HR letters, so an employee has somewhere to write."
              infoLabel="Where does the HR email appear?"
            />
            <Input
              id="studio-hr-email"
              size="form"
              type="email"
              placeholder="hr@qera.studio"
              autoComplete="email"
              {...register('queryEmailHr')}
            />
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

      <Button type="submit" size="lg" className="self-start" pending={isSubmitting}>
        Save settings
      </Button>
    </form>
  );
}
