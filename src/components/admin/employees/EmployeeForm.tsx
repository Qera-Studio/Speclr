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
import FieldInfo, { InfoTip } from '@/components/form/FieldInfo';
import PhoneField, { validatePhoneValue } from '@/components/form/PhoneField';
import IfscField from '@/components/form/IfscField';
import UpiQrUpload from '@/components/form/UpiQrUpload';
import { createEmployee, updateEmployee } from '@/server/actions/employees';
import { rupeesToPaise, paiseToRupees } from '@/lib/domain/money';
import { composeAddress, emptyAddressParts, addressPartsSchema } from '@/lib/domain/address';
import { isIfsc } from '@/lib/domain/bank';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/domain/currency';
import {
  PAN_RE,
  panHolderTypeError,
  panSurnameMismatch,
  type EmployeeRecord,
} from '@/lib/domain/employee';
import { numericField, uppercaseField } from '@/components/form/inputFilters';

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
  // Optional — bank details can be filled in later — but wrong is not allowed.
  ifsc: z.string().refine((v) => v === '' || isIfsc(v), 'Enter a valid IFSC, e.g. KKBK0000677.'),
  branch: z.string(),
  upiId: z.string(),
  upiQrDataUrl: z.string(),
  employeeCode: z.string(),
  // Optional like the IFSC — filled in later — but wrong is not allowed, since
  // this prints on a statutory wage slip.
  pan: z
    .string()
    .refine((v) => v === '' || PAN_RE.test(v.toUpperCase()), 'Enter a valid PAN, e.g. ABCDE1234F.')
    // The 4th character says what kind of holder the PAN belongs to. A company
    // or firm PAN on a person is the wrong document, not a typo.
    .refine(
      (v) => v === '' || !PAN_RE.test(v.toUpperCase()) || !panHolderTypeError(v),
      'This PAN does not belong to an individual.',
    ),
  uan: z.string(),
  pfNumber: z.string(),
  esicNumber: z.string(),
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
    setValue,
    watch,
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
          branch: employee.bank.branch ?? '',
          upiId: employee.bank.upiId ?? '',
          upiQrDataUrl: employee.bank.upiQrDataUrl ?? '',
          employeeCode: employee.payroll?.employeeCode ?? '',
          pan: employee.payroll?.pan ?? '',
          uan: employee.payroll?.uan ?? '',
          pfNumber: employee.payroll?.pfNumber ?? '',
          esicNumber: employee.payroll?.esicNumber ?? '',
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
          branch: '',
          upiId: '',
          upiQrDataUrl: '',
          employeeCode: '',
          pan: '',
          uan: '',
          pfNumber: '',
          esicNumber: '',
        },
  });

  /**
   * The PAN's 5th character is the surname's initial. Surfaced as a hint rather
   * than a validation error: a name recorded surname-first, a married name or a
   * transliteration all make it differ honestly, and refusing those would be
   * wrong. Worth pointing at; never worth blocking.
   */
  const panValue = watch('pan');
  const nameValue = watch('name');
  const engagementType = watch('engagementType');
  const panSurnameHint =
    panValue && PAN_RE.test(panValue.toUpperCase()) && nameValue
      ? panSurnameMismatch(panValue, nameValue)
      : false;

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
        branch: values.branch || undefined,
        upiId: values.upiId || undefined,
        upiQrDataUrl: values.upiQrDataUrl || undefined,
      },
      payroll: {
        employeeCode: values.employeeCode || undefined,
        // Stored upper-case: PAN is case-insensitive to type but has one
        // canonical printed form, and this prints on a wage slip.
        pan: values.pan ? values.pan.toUpperCase() : undefined,
        uan: values.uan || undefined,
        pfNumber: values.pfNumber || undefined,
        esicNumber: values.esicNumber || undefined,
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
            <FieldLabel htmlFor="employee-end">End date</FieldLabel>
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

        {/* Currency first, then the figure it denominates — you choose the unit
            before you type the amount, and the stipend editor reads the same way. */}
        <FieldRow>
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

          <Field>
            <FieldLabel htmlFor="employee-pay">Pay</FieldLabel>
            <Input id="employee-pay" size="form" {...numericField(register('payRupees'), 'money')} />
            <FieldError errors={[errors.payRupees]} />
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

          {/* IFSC first: it fills in the bank name and branch below, so the
              field that drives the others comes before them. */}
          <FieldRow>
            <IfscField
              control={control}
              name="ifsc"
              bankNameField="bankName"
              branchField="branch"
              setValue={setValue}
              id="employee-ifsc"
            />

            <Field>
              <FieldLabel htmlFor="employee-account">Account number</FieldLabel>
              <Input id="employee-account" size="form" {...numericField(register('accountNo'))} />
              <FieldError errors={[errors.accountNo]} />
            </Field>
          </FieldRow>

          {/* Filled by the lookup but never disabled: the lookup is an
              enhancement, and a bank it can't find must still be typeable. */}
          <Field>
            <FieldLabel htmlFor="employee-bank-name">Bank name</FieldLabel>
            <Input
              id="employee-bank-name"
              size="form"
              placeholder="Enter an IFSC to fill this in"
              {...register('bankName')}
            />
            <FieldError errors={[errors.bankName]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-branch">Branch</FieldLabel>
            <Input
              id="employee-branch"
              size="form"
              placeholder="Enter an IFSC to fill this in"
              {...register('branch')}
            />
            <FieldError errors={[errors.branch]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-upi">UPI ID</FieldLabel>
            <Input id="employee-upi" size="form" {...register('upiId')} />
            <FieldError errors={[errors.upiId]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="employee-upi-qr">UPI QR code</FieldLabel>
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

        <FieldSeparator />

        {/*
          All optional, and shown for interns too: an intern has none of these,
          but hiding the section behind the engagement type would lose whatever
          was already typed the moment someone flipped that select.
        */}
        <FieldSet>
          <div className="flex items-center gap-1.5">
            <FieldLegend variant="label">Payroll identifiers</FieldLegend>
            <InfoTip
              label="About payroll identifiers"
              info="Printed on a pay slip. Interns have none of these — leave them blank."
            />
          </div>

          <FieldRow>
            <Field>
              <FieldLabel htmlFor="employee-code">Employee code</FieldLabel>
              {/* Read-only: the code is claimed from an atomic counter on save,
                  so two people can never be issued the same one. Editing it by
                  hand is what produced the duplicate this replaced.

                  The placeholder follows the engagement type, because "assigned
                  on save" would be a promise the server does not keep for an
                  intern — they are not on the payroll and get no code. */}
              <Input
                id="employee-code"
                size="form"
                readOnly
                placeholder={
                  engagementType === 'employee' ? 'Assigned on save' : 'Employees only'
                }
                className="text-muted-foreground"
                {...register('employeeCode')}
              />
              <FieldError errors={[errors.employeeCode]} />
            </Field>

            <Field>
              <FieldInfo
                htmlFor="employee-pan"
                label="PAN"
                infoLabel="About the PAN check"
                info={
                  panSurnameHint
                    ? `The 5th letter of a PAN is the surname's initial — this one reads “${panValue.toUpperCase()[4]}”. Worth a check; it is not always wrong.`
                    : 'Ten characters, e.g. ABCPR1234F. The 4th says what kind of holder it belongs to and must be P, an individual; the 5th is the surname’s initial.'
                }
              />
              <Input
                id="employee-pan"
                size="form"
                placeholder="ABCDE1234F"
                {...uppercaseField(register('pan'))}
              />
              <FieldError errors={[errors.pan]} />
              {/*
                A tooltip is never announced, and the surname hint is *news* —
                it appears as a consequence of what was just typed. The visible
                icon is where it is read; this is where it is heard.
              */}
              <span role="status" aria-label="PAN check" className="sr-only">
                {panSurnameHint && !errors.pan
                  ? "This PAN's 5th letter does not match the surname."
                  : ''}
              </span>
            </Field>
          </FieldRow>

          <FieldRow>
            <Field>
              <FieldLabel htmlFor="employee-uan">UAN</FieldLabel>
              <Input id="employee-uan" size="form" {...numericField(register('uan'))} />
              <FieldError errors={[errors.uan]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="employee-esic">ESIC number</FieldLabel>
              <Input
                id="employee-esic"
                size="form"
                {...numericField(register('esicNumber'))}
              />
              <FieldError errors={[errors.esicNumber]} />
            </Field>
          </FieldRow>

          {/* Its own row: a PF account number runs to ~22 characters, which is
              unreadable in half the rail. Same rule anywhere a value is longer
              than about sixteen. */}
          <Field>
            <FieldLabel htmlFor="employee-pf">PF number</FieldLabel>
            <Input id="employee-pf" size="form" {...uppercaseField(register('pfNumber'))} />
            <FieldError errors={[errors.pfNumber]} />
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
