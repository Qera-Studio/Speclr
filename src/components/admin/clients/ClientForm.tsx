'use client';

import '@/lib/zod-config';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { clientInputSchema } from '@/lib/domain/registry';
import { createClient, updateClient } from '@/server/actions/clients';
import type { ClientRecord } from '@/lib/domain/types';

type FormValues = z.infer<typeof clientInputSchema>;

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
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(clientInputSchema),
    defaultValues: client
      ? {
          name: client.name,
          address: client.address,
          email: client.email,
          phone: client.phone,
          gstin: client.gstin ?? '',
        }
      : { name: '', address: '', email: '', phone: '', gstin: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = client ? await updateClient(client.id, values) : await createClient(values);

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
          <FieldLabel htmlFor="client-name">Name</FieldLabel>
          <Input id="client-name" {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-address">Address</FieldLabel>
          <Textarea id="client-address" rows={3} {...register('address')} />
          <FieldError errors={[errors.address]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-email">Email</FieldLabel>
          <Input id="client-email" type="email" {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-phone">Phone</FieldLabel>
          <Input id="client-phone" type="tel" {...register('phone')} />
          <FieldError errors={[errors.phone]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-gstin">GSTIN (optional)</FieldLabel>
          <Input id="client-gstin" {...register('gstin')} />
          <FieldError errors={[errors.gstin]} />
        </Field>
      </FieldGroup>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : client ? 'Save changes' : 'Add client'}
      </Button>
    </form>
  );
}
