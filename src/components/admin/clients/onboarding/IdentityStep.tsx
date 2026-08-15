'use client';

import '@/lib/zod-config';
import { useMemo, useState } from 'react';
import { useController, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Field, FieldError, FieldLabel, FieldSeparator, FieldSet } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import FieldInfo, { LegendInfo } from '@/components/form/FieldInfo';
import AddressFields from '@/components/form/AddressFields';
import PhoneField, { validatePhoneValue } from '@/components/form/PhoneField';
import { clientInputSchema } from '@/lib/domain/registry';
import { composeAddress, emptyAddressParts } from '@/lib/domain/address';
import { entityTypesForCountry } from '@/lib/domain/entityType';
import { createClient, updateClient } from '@/server/actions/clients';
import type { ClientRecord } from '@/lib/domain/types';
import { StepForm, type StepProps } from './stepKit';

type FormValues = z.infer<typeof clientInputSchema>;

/**
 * Identity — the step that creates the record.
 *
 * The resolver carries the two rules the shared schema cannot, both inherited
 * verbatim from the form this replaces:
 *
 * 1. `address` is required — it is what documents print — but nobody types it.
 *    It is composed from the parts, so it has to be derived *before* zod sees
 *    the values or a perfectly filled address is rejected for an empty field.
 * 2. The schema's `phone` rule is deliberately lenient so records written
 *    before phones were structured stay editable; strict per-country validation
 *    belongs here, where it can be corrected. A resolver overrides any `rules`
 *    on a controller, so this is the only place it can live.
 *
 * Entity type is required *here* and optional on the record — clients created
 * before onboarding existed have none, and a required column would make those
 * rows permanently un-saveable.
 */
const resolver: Resolver<FormValues> = async (values, context, options) => {
  const composed = composeAddress(values.addressParts ?? emptyAddressParts);
  const withAddress = { ...values, address: composed || values.address };
  const result = await zodResolver(clientInputSchema)(withAddress, context, options);

  const errors = { ...result.errors };
  let failed = false;

  const phoneError = validatePhoneValue(values.phone);
  if (phoneError) {
    errors.phone = { type: 'manual', message: phoneError };
    failed = true;
  }
  // Checked against the forms *this country* offers, not merely against empty.
  // Moving the address abroad leaves an Indian selection in the field with
  // nothing showing in the list — and a UAE client saved as a private limited
  // under the Companies Act is a wrong record, not a cosmetic one.
  const offered = entityTypesForCountry(values.addressParts?.country);
  if (!values.entityType || !offered.some((e) => e.value === values.entityType)) {
    errors.entityType = { type: 'manual', message: 'Choose the entity type.' };
    failed = true;
  }

  return failed ? { ...result, values: {}, errors } : result;
};

export default function IdentityStep({ client, onSaved, submitLabel }: StepProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver,
    // Errors land when a field is left, not only at submit. Seven steps of
    // silence followed by one page of red is a worse trade than being told
    // where you are as you go.
    mode: 'onBlur',
    defaultValues: client
      ? {
          name: client.name,
          companyName: client.companyName ?? '',
          address: client.address,
          addressParts: client.addressParts ?? { ...emptyAddressParts },
          email: client.email,
          phone: client.phone,
          gstin: client.gstin ?? '',
          entityType: client.entityType ?? '',
        }
      : {
          name: '',
          companyName: '',
          address: '',
          addressParts: { ...emptyAddressParts },
          email: '',
          phone: '',
          gstin: '',
          entityType: '',
        },
  });

  // The country drives which legal forms are offered, and it comes from the
  // address rather than a field of its own — one place to say where a client is.
  const country = useWatch({ control, name: 'addressParts.country' });
  const entityType = useController({ control, name: 'entityType' });
  const entityOptions = useMemo(
    () => entityTypesForCountry(country).map((e) => ({ value: e.value, label: e.label })),
    [country],
  );

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = client
      ? await updateClient(client.id, values)
      : await createClient(values);

    if (!result.success || !result.id) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }

    const now = Date.now();
    onSaved({
      ...(client ?? { createdAt: now }),
      ...values,
      id: result.id,
      updatedAt: now,
    } as ClientRecord);
  };

  return (
    <StepForm
      onSubmit={handleSubmit(onSubmit)}
      serverError={serverError}
      submitting={isSubmitting}
      submitLabel={submitLabel}
    >
      {/*
        Three identity facts on one line. Entity type used to be fourteen radio
        cards at the bottom of the step — a third of the page to say one word,
        and a word that belongs beside the names it qualifies. A dropdown of
        fourteen is a dropdown; a grid of fourteen is a wall.
      */}
      <FieldRow columns={3}>
        <Field>
          <FieldInfo
            htmlFor="client-name"
            label="Name"
            info="The short name, used in lists, the client picker and this page's heading. Documents print the legal entity name instead."
            infoLabel="Where is the short name used?"
          />
          {/* Placeholders name the *kind* of value, not an example of one. A
              plausible example sitting in an empty field reads as filled in. */}
          <Input id="client-name" size="form" placeholder="Full name" {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldInfo
            htmlFor="client-company-name"
            label="Legal entity name"
            info="What documents print. CGST Rule 46 wants the recipient's legal name on a tax invoice, which is rarely the name anyone says out loud."
            infoLabel="Why is the legal name separate?"
          />
          <Input
            id="client-company-name"
            size="form"
            placeholder="Registered name"
            {...register('companyName')}
          />
          <FieldError errors={[errors.companyName]} />
        </Field>

        <Field>
          <FieldInfo
            htmlFor="client-entity-type"
            label="Entity type"
            info="The legal form, which decides what identifiers apply — an Indian entity's PAN encodes its own kind, so this is what turns a shape check into a real one. The list follows the country in the address below."
            infoLabel="Why does the entity type matter?"
          />
          <Combobox
            id="client-entity-type"
            size="form"
            options={entityOptions}
            value={String(entityType.field.value ?? '')}
            onValueChange={entityType.field.onChange}
            placeholder="Select…"
          />
          <FieldError errors={[errors.entityType]} />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field>
          <FieldLabel htmlFor="client-email">Email</FieldLabel>
          <Input
            id="client-email"
            size="form"
            type="email"
            placeholder="example@gmail.com"
            {...register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>

        <PhoneField control={control} name="phone" id="client-phone" />
      </FieldRow>

      <FieldSeparator />

      <FieldSet>
        <LegendInfo
          info="Rule 46 wants the recipient's address on a tax invoice, and the country here decides how the next step treats their tax registration — and which legal forms the entity type offers."
          label="Why is the address required?"
        >
          Registered address
        </LegendInfo>
        <AddressFields control={control} name="addressParts" idPrefix="client" />
        {/*
          `address` is derived from the parts, not typed — but it is what
          documents print, so a failure on it needs somewhere to surface.
        */}
        <FieldError errors={[errors.address]} />
      </FieldSet>
    </StepForm>
  );
}
