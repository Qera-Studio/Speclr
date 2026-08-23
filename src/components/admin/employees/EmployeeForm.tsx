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
import { InfoTip, LegendInfo } from '@/components/form/FieldInfo';
import PhoneField, { validatePhoneValue } from '@/components/form/PhoneField';
import IfscField from '@/components/form/IfscField';
import UpiQrUpload from '@/components/form/UpiQrUpload';
import { createEmployee, updateEmployee } from '@/server/actions/employees';
import { formatINR, rupeesToPaise, paiseToRupees } from '@/lib/domain/money';
import { splitGrossMonthly } from '@/lib/domain/salaryStructure';
import { composeAddress, emptyAddressParts, addressPartsSchema } from '@/lib/domain/address';
import { isISODate, todayISO } from '@/lib/domain/dates';
import { isIfsc } from '@/lib/domain/bank';
import { CURRENCIES, CURRENCY_CODES, DEFAULT_CURRENCY } from '@/lib/domain/currency';
import { PAN_RE, panSurnameMismatch, type EmployeeRecord } from '@/lib/domain/employee';
import {
  emailSchema,
  ifscSchema,
  panSchema,
  phoneSchema,
  upiSchema,
} from '@/lib/domain/fields';
import { codeSchema, orgNameSchema, personNameSchema, textSchema } from '@/lib/domain/text';
import { EmailField, PanField } from '@/components/form/fields';
import { numericField, uppercaseField } from '@/components/form/inputFilters';

const formSchema = z.object({
  // A person, so the strict name rule: letters, marks and the punctuation real
  // names carry. No digits, no markup. This is the name on a wage slip.
  name: personNameSchema(200, { required: 'Name is required.' }),
  addressParts: addressPartsSchema,
  email: emailSchema({ required: 'Email is required.' }),
  phone: phoneSchema({ required: 'Phone is required.' }),
  // Free text, not the name rule: "Designer II" and "L3 Engineer" are real
  // titles and carry digits.
  role: textSchema(200, { required: 'Role is required.' }),
  engagementType: z.enum(['intern', 'employee']),
  pronoun: z.enum(['he', 'she', 'they']),
  // Presence was the only check on all three of these. A date that is merely
  // non-empty, a pay figure that is merely non-empty and a currency that is
  // merely non-empty are three ways for the wrong thing to reach a wage slip.
  joiningDate: z
    .string()
    .min(1, 'Joining date is required.')
    .refine(isISODate, "Expected a date in 'YYYY-MM-DD' format."),
  endDate: z.string().refine((v) => v === '' || isISODate(v), "Expected 'YYYY-MM-DD'."),
  // Annual for an employee, monthly for an intern. Digits and at most two
  // decimal places, matching `rupeesToPaise`, which reads this next.
  payRupees: z
    .string()
    .min(1, 'Pay is required.')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v.trim()), 'Enter an amount like 45000 or 45000.50.'),
  payCurrency: z.enum(CURRENCY_CODES),
  bankName: orgNameSchema(120),
  accountNo: codeSchema(40),
  // Optional — bank details can be filled in later — but wrong is not allowed.
  ifsc: ifscSchema(),
  branch: textSchema(120),
  upiId: upiSchema(60),
  upiQrDataUrl: z.string(),
  employeeCode: codeSchema(40),
  // Optional like the IFSC — filled in later — but wrong is not allowed, since
  // this prints on a statutory wage slip. The holder-type check (the 4th
  // character must be P) rides along in the shared rule: a company or firm PAN
  // on a person is the wrong document, not a typo.
  pan: panSchema(),
  uan: codeSchema(40),
  pfNumber: codeSchema(40),
  esicNumber: codeSchema(40),
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
    // First blur, then every keystroke, the same rule the onboarding steps
    // run under, and for the same reason: a form that stays silent until submit
    // reports every mistake at once, at the moment the operator has decided
    // they are finished. See the note in `CommercialStep`.
    mode: 'onTouched',
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
          // The field holds whichever figure this person is quoted in — annual
          // for an employee, the monthly stipend for an intern. Records written
          // before the annual column existed fall back to twelve months of
          // their monthly pay, which is the same money either way.
          payRupees: paiseToRupees(
            employee.engagementType === 'employee'
              ? employee.annualSalaryPaise ?? employee.payAmountPaise * 12
              : employee.payAmountPaise,
          ),
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
          // `todayISO`, never a date sliced out of a UTC timestamp: that
          // converts to UTC first, so east of Greenwich the small hours default
          // a new employee's joining date to yesterday. `dates.ts` warns about
          // it at the helper; this was the one call site that had not read it,
          // and `design-system.test.ts` now keeps it from coming back.
          joiningDate: todayISO(),
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
  const isEmployee = engagementType === 'employee';

  /**
   * The monthly figure an annual salary implies, and how the pay slip will
   * itemise it. Derived on every keystroke from `splitGrossMonthly` — the same
   * function the slip seeds itself with, so what is shown here is what will be
   * on the slip, not an approximation of it.
   */
  const payRupees = watch('payRupees');
  const annualPaise = rupeesToPaise(payRupees);
  const payPreview =
    annualPaise === null || annualPaise <= 0
      ? null
      : (() => {
          const monthlyPaise = Math.round(annualPaise / 12);
          const split = splitGrossMonthly(monthlyPaise);
          return {
            monthlyPaise,
            rows: [
              { label: 'Basic', paise: split.basicPaise },
              { label: 'House rent allowance', paise: split.hraPaise },
              { label: 'Special allowance', paise: split.specialAllowancePaise },
            ],
          };
        })();
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
      // Both are sent, but only one is authoritative: for an employee the
      // server recomputes `payAmountPaise` from the annual figure, so the pair
      // can never disagree. See `withDerivedPay` in the employees action.
      payAmountPaise:
        values.engagementType === 'employee'
          ? Math.round((rupeesToPaise(values.payRupees) ?? 0) / 12)
          : rupeesToPaise(values.payRupees) ?? 0,
      annualSalaryPaise:
        values.engagementType === 'employee'
          ? rupeesToPaise(values.payRupees) ?? 0
          : undefined,
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

        <EmailField control={control} name="email" id="employee-email" />

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

          {/*
            The unit follows the engagement, because the two are genuinely
            different figures: an employee is offered an annual salary and paid
            a twelfth of it, an intern is offered a monthly stipend and nothing
            else. One field labelled "Pay" made you remember which.
          */}
          <Field>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor="employee-pay">
                {isEmployee ? 'Annual salary' : 'Monthly stipend'}
              </FieldLabel>
              <InfoTip
                label="About the pay figure"
                info={
                  isEmployee
                    ? 'What the employee is actually paid in a year, before tax. Not a cost-to-company figure — Qera adds no employer contributions to it (PF needs 20+ employees, gratuity five years of service).'
                    : 'A stipend is a monthly amount. An intern is not offered an annual package, and saying otherwise on their offer letter would frame the internship as employment.'
                }
              />
            </div>
            <Input id="employee-pay" size="form" {...numericField(register('payRupees'), 'money')} />
            <FieldError errors={[errors.payRupees]} />
          </Field>
        </FieldRow>

        {/*
          What the pay slip will actually carry, shown before it is saved rather
          than discovered on the slip. Read-only: the split is derived, and an
          editable copy of a derived figure is just a second thing to keep in
          step. Every line stays editable on the slip itself.
        */}
        {isEmployee && payPreview ? (
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Per month, as the pay slip will show it
            </p>
            <dl className="m-0 flex flex-col gap-1">
              {payPreview.rows.map(({ label, paise }) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="m-0 text-sm tabular-nums">{formatINR(paise)}</dd>
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-border pt-2 font-medium">
                <dt className="text-sm">Gross per month</dt>
                <dd className="m-0 text-sm tabular-nums">{formatINR(payPreview.monthlyPaise)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

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
          <LegendInfo
            label="About payroll identifiers"
            info="Printed on a pay slip. Interns have none of these — leave them blank."
          >
            Payroll identifiers
          </LegendInfo>

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

            <PanField
              control={control}
              name="pan"
              id="employee-pan"
              placeholder="ABCDE1234F"
              infoLabel="About the PAN check"
              /* The only caller with something more specific to say than the
                 field's default: an employee's PAN is a person's, so the 5th
                 letter can be compared against the name on the same form. */
              info={
                panSurnameHint
                  ? `The 5th letter of a PAN is the surname's initial, and this one reads “${panValue.toUpperCase()[4]}”. Worth a check; it is not always wrong.`
                  : 'Ten characters, e.g. ABCPR1234F. The 4th says what kind of holder it belongs to and must be P, an individual; the 5th is the surname’s initial.'
              }
            >
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
            </PanField>
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

      <Button type="submit" size="lg" pending={isSubmitting}>
        {employee ? 'Save changes' : 'Add employee'}
      </Button>
    </form>
  );
}
