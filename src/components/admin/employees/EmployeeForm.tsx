'use client';

import '@/lib/zod-config';
import { useState } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSeparator,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import AddressFields from '@/components/form/AddressFields';
import PhoneField, { validatePhoneValue } from '@/components/form/PhoneField';
import UpiQrUpload from '@/components/form/UpiQrUpload';
import { createEmployee, updateEmployee } from '@/server/actions/employees';
import { rupeesToPaise, paiseToRupees } from '@/lib/domain/money';
import { composeAddress, emptyAddressParts, addressPartsSchema } from '@/lib/domain/address';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/domain/currency';
import type { EmployeeRecord } from '@/lib/domain/employee';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  addressParts: addressPartsSchema,
  email: z.string().trim().email('Enter a valid email.'),
  // Strict per-country validation runs separately, in the resolver below —
  // see the note in ClientForm for why it can't live in a shared schema.
  phone: z.string().trim().min(1, 'Phone is required.'),
  role: z.string().trim().min(1, 'Role is required.'),
  engagementType: z.enum(['intern', 'employee']),
  pronoun: z.enum(['he', 'she', 'they']),
  joiningDate: z.string().trim().min(1, 'Joining date is required.'),
  endDate: z.string(),
  payRupees: z.string().trim().min(1, 'Pay is required.'),
  payCurrency: z.string().trim().min(1),
  bankName: z.string(),
  accountNo: z.string(),
  ifsc: z.string(),
  upiId: z.string(),
  upiQrDataUrl: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * Zod for the shape, plus the strict phone check. A resolver overrides any
 * `rules` on individual fields, so this is the only place per-country phone
 * validation can run — see the fuller note in ClientForm.
 */
const resolver: Resolver<FormValues> = async (values, context, options) => {
  const result = await zodResolver(formSchema)(values, context, options);

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

export default function EmployeeForm({
  employee,
  onDone,
}: {
  employee?: EmployeeRecord | null;
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
    defaultValues: employee
      ? {
          name: employee.name,
          // Employees added before structured addresses have no parts; the old
          // flat address is preserved on save until the parts are filled in.
          addressParts: employee.addressParts ?? { ...emptyAddressParts },
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          engagementType: employee.engagementType,
          pronoun: employee.pronoun,
          joiningDate: employee.joiningDate,
          endDate: employee.endDate ?? '',
          payRupees: paiseToRupees(employee.payAmountPaise),
          payCurrency: employee.payCurrency ?? DEFAULT_CURRENCY,
          bankName: employee.bank.bankName,
          accountNo: employee.bank.accountNo,
          ifsc: employee.bank.ifsc,
          upiId: employee.bank.upiId ?? '',
          upiQrDataUrl: employee.bank.upiQrDataUrl ?? '',
        }
      : {
          name: '',
          addressParts: { ...emptyAddressParts },
          email: '',
          phone: '',
          role: '',
          engagementType: 'intern',
          pronoun: 'he',
          joiningDate: new Date().toISOString().slice(0, 10),
          endDate: '',
          payRupees: '',
          payCurrency: DEFAULT_CURRENCY,
          bankName: '',
          accountNo: '',
          ifsc: '',
          upiId: '',
          upiQrDataUrl: '',
        },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    // The flat address is what HR documents print; the server recomposes it
    // from the parts and trusts only those.
    const composed = composeAddress(values.addressParts);

    const payload = {
      name: values.name.trim(),
      address: composed || employee?.address || '',
      addressParts: values.addressParts,
      email: values.email,
      phone: values.phone,
      role: values.role,
      engagementType: values.engagementType,
      pronoun: values.pronoun,
      joiningDate: values.joiningDate,
      endDate: values.endDate || undefined,
      payAmountPaise: rupeesToPaise(values.payRupees) ?? 0,
      payCurrency: values.payCurrency,
      bank: {
        bankName: values.bankName,
        accountNo: values.accountNo,
        ifsc: values.ifsc,
        upiId: values.upiId || undefined,
        upiQrDataUrl: values.upiQrDataUrl || undefined,
      },
    };

    const result = employee
      ? await updateEmployee(employee.id, payload)
      : await createEmployee(payload);

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
          <FieldLabel htmlFor="employee-name">Name</FieldLabel>
          <Input id="employee-name" size="form" {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-email">Email</FieldLabel>
          <Input id="employee-email" size="form" type="email" {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>

        <PhoneField control={control} name="phone" id="employee-phone" />

        <Field>
          <FieldLabel htmlFor="employee-role">Role</FieldLabel>
          <Input id="employee-role" size="form" {...register('role')} />
          <FieldError errors={[errors.role]} />
        </Field>

        <FieldRow>
          <Field>
            <FieldLabel htmlFor="employee-engagement">Engagement type</FieldLabel>
            <Controller
              control={control}
              name="engagementType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger id="employee-engagement" size="form" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent size="form">
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.engagementType]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-pronoun">Pronoun</FieldLabel>
            <Controller
              control={control}
              name="pronoun"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger id="employee-pronoun" size="form" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent size="form">
                    <SelectItem value="he">he/him</SelectItem>
                    <SelectItem value="she">she/her</SelectItem>
                    <SelectItem value="they">they/them</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.pronoun]} />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field>
            <FieldLabel htmlFor="employee-joining">Joining date</FieldLabel>
            <Controller
              control={control}
              name="joiningDate"
              render={({ field }) => (
                <DatePicker
                  id="employee-joining"
                  size="form"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <FieldError errors={[errors.joiningDate]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-end">End date (optional)</FieldLabel>
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <DatePicker
                  id="employee-end"
                  size="form"
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="No end date"
                />
              )}
            />
            <FieldError errors={[errors.endDate]} />
          </Field>
        </FieldRow>

        <FieldRow>
          <Field>
            <FieldLabel htmlFor="employee-pay">Pay</FieldLabel>
            <Input id="employee-pay" size="form" inputMode="decimal" {...register('payRupees')} />
            <FieldError errors={[errors.payRupees]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-currency">Currency</FieldLabel>
            <Controller
              control={control}
              name="payCurrency"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger id="employee-currency" size="form" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent size="form">
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code} {currency.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.payCurrency]} />
          </Field>
        </FieldRow>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Address</FieldLegend>
          <AddressFields control={control} name="addressParts" idPrefix="employee" />
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend variant="label">Bank details</FieldLegend>

          <Field>
            <FieldLabel htmlFor="employee-bank-name">Bank name</FieldLabel>
            <Input id="employee-bank-name" size="form" {...register('bankName')} />
            <FieldError errors={[errors.bankName]} />
          </Field>

          <FieldRow>
            <Field>
              <FieldLabel htmlFor="employee-account">Account number</FieldLabel>
              <Input id="employee-account" size="form" {...register('accountNo')} />
              <FieldError errors={[errors.accountNo]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="employee-ifsc">IFSC</FieldLabel>
              <Input id="employee-ifsc" size="form" {...register('ifsc')} />
              <FieldError errors={[errors.ifsc]} />
            </Field>
          </FieldRow>

          <Field>
            <FieldLabel htmlFor="employee-upi">UPI ID (optional)</FieldLabel>
            <Input id="employee-upi" size="form" {...register('upiId')} />
            <FieldError errors={[errors.upiId]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-upi-qr">UPI QR code (optional)</FieldLabel>
            <Controller
              control={control}
              name="upiQrDataUrl"
              render={({ field }) => (
                <UpiQrUpload
                  id="employee-upi-qr"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <FieldError errors={[errors.upiQrDataUrl]} />
          </Field>
        </FieldSet>
      </FieldGroup>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
      </Button>
    </form>
  );
}
