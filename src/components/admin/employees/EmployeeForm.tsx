'use client';

import '@/lib/zod-config';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, FieldLabel, FieldError, FieldGroup, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { createEmployee, updateEmployee } from '@/server/actions/employees';
import { rupeesToPaise, paiseToRupees } from '@/lib/domain/money';
import type { EmployeeRecord } from '@/lib/domain/employee';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  address: z.string().trim().min(1, 'Address is required.'),
  email: z.string().trim().email('Enter a valid email.'),
  phone: z.string().trim().min(1, 'Phone is required.'),
  role: z.string().trim().min(1, 'Role is required.'),
  engagementType: z.enum(['intern', 'employee']),
  pronoun: z.enum(['he', 'she', 'they']),
  joiningDate: z.string().trim().min(1, 'Joining date is required.'),
  endDate: z.string(),
  payRupees: z.string().trim().min(1, 'Pay is required.'),
  bankName: z.string(),
  accountNo: z.string(),
  ifsc: z.string(),
  upiId: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

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
    resolver: zodResolver(formSchema),
    defaultValues: employee
      ? {
          name: employee.name,
          address: employee.address,
          email: employee.email,
          phone: employee.phone,
          role: employee.role,
          engagementType: employee.engagementType,
          pronoun: employee.pronoun,
          joiningDate: employee.joiningDate,
          endDate: employee.endDate ?? '',
          payRupees: paiseToRupees(employee.payAmountPaise),
          bankName: employee.bank.bankName,
          accountNo: employee.bank.accountNo,
          ifsc: employee.bank.ifsc,
          upiId: employee.bank.upiId ?? '',
        }
      : {
          name: '',
          address: '',
          email: '',
          phone: '',
          role: '',
          engagementType: 'intern',
          pronoun: 'he',
          joiningDate: new Date().toISOString().slice(0, 10),
          endDate: '',
          payRupees: '',
          bankName: '',
          accountNo: '',
          ifsc: '',
          upiId: '',
        },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);

    const payload = {
      name: values.name.trim(),
      address: values.address,
      email: values.email,
      phone: values.phone,
      role: values.role,
      engagementType: values.engagementType,
      pronoun: values.pronoun,
      joiningDate: values.joiningDate,
      endDate: values.endDate || undefined,
      payAmountPaise: rupeesToPaise(values.payRupees) ?? 0,
      bank: {
        bankName: values.bankName,
        accountNo: values.accountNo,
        ifsc: values.ifsc,
        upiId: values.upiId || undefined,
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
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="employee-name">Name</FieldLabel>
          <Input id="employee-name" {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-address">Address</FieldLabel>
          <Input id="employee-address" {...register('address')} />
          <FieldError errors={[errors.address]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-email">Email</FieldLabel>
          <Input id="employee-email" type="email" {...register('email')} />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-phone">Phone</FieldLabel>
          <Input id="employee-phone" type="tel" {...register('phone')} />
          <FieldError errors={[errors.phone]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-role">Role</FieldLabel>
          <Input id="employee-role" {...register('role')} />
          <FieldError errors={[errors.role]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-engagement">Engagement type</FieldLabel>
          <Controller
            control={control}
            name="engagementType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                <SelectTrigger id="employee-engagement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                <SelectTrigger id="employee-pronoun">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="he">he/him</SelectItem>
                  <SelectItem value="she">she/her</SelectItem>
                  <SelectItem value="they">they/them</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.pronoun]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-joining">Joining date</FieldLabel>
          <Input id="employee-joining" type="date" {...register('joiningDate')} />
          <FieldError errors={[errors.joiningDate]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-end">End date (optional)</FieldLabel>
          <Input id="employee-end" type="date" {...register('endDate')} />
          <FieldError errors={[errors.endDate]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="employee-pay">Pay (₹)</FieldLabel>
          <Input id="employee-pay" inputMode="decimal" {...register('payRupees')} />
          <FieldError errors={[errors.payRupees]} />
        </Field>

        <FieldSet>
          <FieldLegend variant="label">Bank details</FieldLegend>
          <Field>
            <FieldLabel htmlFor="employee-bank-name">Bank name</FieldLabel>
            <Input id="employee-bank-name" {...register('bankName')} />
            <FieldError errors={[errors.bankName]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-account">Account number</FieldLabel>
            <Input id="employee-account" {...register('accountNo')} />
            <FieldError errors={[errors.accountNo]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-ifsc">IFSC</FieldLabel>
            <Input id="employee-ifsc" {...register('ifsc')} />
            <FieldError errors={[errors.ifsc]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-upi">UPI ID (optional)</FieldLabel>
            <Input id="employee-upi" {...register('upiId')} />
            <FieldError errors={[errors.upiId]} />
          </Field>
        </FieldSet>
      </FieldGroup>

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
      </Button>
    </form>
  );
}
