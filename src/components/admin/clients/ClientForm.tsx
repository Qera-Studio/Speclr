'use client';

import '@/lib/zod-config';
import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AddressFields from '@/components/form/AddressFields';
import PhoneField, { validatePhoneValue } from '@/components/form/PhoneField';
import { clientInputSchema } from '@/lib/domain/registry';
import { composeAddress, emptyAddressParts } from '@/lib/domain/address';
import { createClient, updateClient } from '@/server/actions/clients';
import type { ClientRecord } from '@/lib/domain/types';

type FormValues = z.infer<typeof clientInputSchema>;

/**
 * Derives the flat `address` from the parts, then validates.
 *
 * Two things the shared schema can't do on its own:
 *
 * 1. `address` is required (it's what documents print) but nobody types it —
 *    it's composed from the parts. Without deriving it first, a perfectly
 *    filled address form would be rejected for an empty derived field.
 * 2. The schema's `phone` rule is deliberately lenient so that records written
 *    before phones were structured stay editable. Strict per-country
 *    validation belongs here, in the form, where it can be corrected. Note
 *    that a resolver overrides any `rules` passed to useController, so this is
 *    the only place it can live.
 */
const resolver: Resolver<FormValues> = async (values, context, options) => {
  const composed = composeAddress(values.addressParts ?? emptyAddressParts);
  const withAddress = { ...values, address: composed || values.address };
  const result = await zodResolver(clientInputSchema)(withAddress, context, options);

  const phoneError = validatePhoneValue(values.phone);
  if (phoneError) {
    return {
      ...result,
      values: {},
      errors: { ...result.errors, phone: { type: 'manual', message: phoneError } },
    };
  }

  return result;
};

export default function ClientForm({
  client,
  onDone,
}: {
  client?: ClientRecord | null;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver,
    defaultValues: client
      ? {
          name: client.name,
          // Clients created before this field existed have none — blank, and
          // required, so saving forces it to be filled in.
          companyName: client.companyName ?? '',
          address: client.address,
          // Clients created before structured addresses existed have no parts;
          // they start blank and the old flat address is kept until edited.
          addressParts: client.addressParts ?? { ...emptyAddressParts },
          email: client.email,
          phone: client.phone,
          gstin: client.gstin ?? '',
        }
      : {
          name: '',
          companyName: '',
          address: '',
          addressParts: { ...emptyAddressParts },
          email: '',
          phone: '',
          gstin: '',
        },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    // `values` already carries the composed address — the resolver derived it.
    // The server recomposes from the parts regardless and trusts only those.
    const result = client ? await updateClient(client.id, values) : await createClient(values);

    if (!result.success) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }

    onDone();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FieldGroup size="form">
        <Field>
          <FieldLabel htmlFor="client-name">Name</FieldLabel>
          <Input id="client-name" size="form" {...register('name')} />
          <FieldDescription>
            Short name for lists and dropdowns, e.g. “Clayora”.
          </FieldDescription>
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-company-name">Company name</FieldLabel>
          <Input id="client-company-name" size="form" {...register('companyName')} />
          <FieldDescription>
            The legal name printed on documents, e.g. “Clayora Private Limited”.
          </FieldDescription>
          <FieldError errors={[errors.companyName]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-email">Email</FieldLabel>
          <Input id="client-email" size="form" type="email" {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>

        <PhoneField control={control} name="phone" id="client-phone" />

        <Field>
          <FieldLabel htmlFor="client-gstin">GSTIN (optional)</FieldLabel>
          <Input id="client-gstin" size="form" {...register('gstin')} />
          <FieldError errors={[errors.gstin]} />
        </Field>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Address</FieldLegend>
          <AddressFields control={control} name="addressParts" idPrefix="client" />
          {/*
            `address` is derived from the parts above, not typed — but it is
            what documents print, so a validation failure on it needs somewhere
            to surface. Without this the form would refuse to submit with no
            visible reason.
          */}
          <FieldError errors={[errors.address]} />
        </FieldSet>
      </FieldGroup>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : client ? 'Save changes' : 'Add client'}
      </Button>
    </form>
  );
}
