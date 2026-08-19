'use client';

import '@/lib/zod-config';
import { useCallback, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays } from 'lucide-react';
import { Field, FieldError, FieldLabel, FieldSeparator, FieldSet } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import FieldInfo, { LegendInfo } from '@/components/form/FieldInfo';
import { numericField } from '@/components/form/inputFilters';
import {
  ENGAGEMENT_TYPES,
  clientCommercialSchema,
  type ClientCommercial,
} from '@/lib/domain/client';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/domain/currency';
import { draftKey, useFormDraft } from '@/lib/draft';
import { StepForm, asOptionalNumber, pruneEmpty, useStepSave, type StepProps } from './stepKit';

/** Only the fields this step owns; the term and services belong to the next one. */
type FormValues = Omit<ClientCommercial, 'services' | 'startDate' | 'termMonths' | 'autoRenew' | 'noticeDays'>;

const ENGAGEMENT_CARDS = {
  retainer: { title: 'Retainer', hint: 'Ongoing, billed on a cycle' },
  project: { title: 'Project', hint: 'A defined scope, billed against it' },
  hourly: { title: 'Hourly', hint: 'Billed against time' },
} as const;

/**
 * The cycles anyone actually names, as intervals. `custom` is not a stored
 * value: it is how the picker says "type the number yourself", and what gets
 * stored is still just a count of months.
 */
const CYCLE_PRESETS = [
  { value: '1', label: 'Monthly' },
  { value: '3', label: 'Quarterly' },
  { value: '6', label: 'Half-yearly' },
  { value: '12', label: 'Annual' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

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
export default function CommercialStep({
  client,
  onSaved,
  submitLabel,
  kind = 'company',
}: StepProps) {
  const {
    register,
    control,
    watch,
    reset,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // Errors land when a field is left, not only at submit. Seven steps of
    // silence followed by one page of red is a worse trade than being told
    // where you are as you go.
    //
    // `onTouched` rather than `onBlur`: first blur, then every keystroke. Under
    // `onBlur` the displayed state lagged the value by a whole blur, so a field
    // already visited kept its tick while wrong and kept its error while being
    // corrected. See the longer note in `TaxStep`.
    mode: 'onTouched',
    resolver: zodResolver(
      clientCommercialSchema
        .omit({
          services: true,
          startDate: true,
          termMonths: true,
          autoRenew: true,
          noticeDays: true,
        })
        // A retainer bills itself: without a cycle and a day, nothing says when.
        // The other two engagements bill against a scope or against time, so
        // neither field applies and neither is asked for.
        .superRefine((values, ctx) => {
          if (values.engagementType !== 'retainer') return;
          if (values.billingIntervalMonths == null) {
            ctx.addIssue({
              code: 'custom',
              path: ['billingIntervalMonths'],
              message: 'Choose how often this retainer is billed.',
            });
          }
          if (values.billingDay == null) {
            ctx.addIssue({
              code: 'custom',
              path: ['billingDay'],
              message: 'Choose the day of the month it is billed on.',
            });
          }
        }),
    ),
    defaultValues: {
      currency: client?.commercial?.currency ?? DEFAULT_CURRENCY,
      paymentTermsDays: client?.commercial?.paymentTermsDays,
      engagementType: client?.commercial?.engagementType,
      billingIntervalMonths: client?.commercial?.billingIntervalMonths,
      billingDay: client?.commercial?.billingDay,
      lateFeePercentPerMonth: client?.commercial?.lateFeePercentPerMonth,
      poRequired: client?.commercial?.poRequired ?? false,
      poNumber: client?.commercial?.poNumber ?? '',
      vendorPortalUrl: client?.commercial?.vendorPortalUrl ?? '',
    },
  });

  const engagementType = useWatch({ control, name: 'engagementType' });
  const poRequired = useWatch({ control, name: 'poRequired' });
  const interval = useWatch({ control, name: 'billingIntervalMonths' });

  // Both switches whose "off" means an absent value rather than a stored false.
  // A portal is recorded by having a URL, so the toggle is state rather than a
  // column: two fields saying the same thing is one of them going stale.
  const [portalUsed, setPortalUsed] = useState(Boolean(client?.commercial?.vendorPortalUrl));
  // "Custom" is likewise not stored. It is remembered only so that clearing the
  // number does not snap the picker back to Monthly mid-edit.
  const [customCycle, setCustomCycle] = useState(
    interval != null && !CYCLE_PRESETS.some((c) => c.value === String(interval)),
  );
  const cycleMonths = numericField(register('billingIntervalMonths', asOptionalNumber));

  // Prune *after* the merge, not before it. Pruning first drops a field this
  // step cleared (it arrives as `''`) and leaves the previously saved value
  // underneath it standing, so switching the portal off kept its address.
  const toPayload = useCallback(
    (values: FormValues) => pruneEmpty({ ...client?.commercial, ...values }),
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
      <FieldRow columns={3}>
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
                // The symbol leads, because it is what anyone recognises at a
                // glance; the name is there so the filter can find "dirham".
                /*
                  Name on the left, symbol and code in the right-hand column,
                  which is left-aligned inside itself so the codes line up down
                  the list. `trailing` is searched too, so "INR" still finds it.
                */
                options={CURRENCIES.map((c) => ({
                  value: c.code,
                  label: c.name,
                  trailing: `${c.symbol} ${c.code}`,
                  selectedLabel: `${c.symbol}  ${c.code}`,
                }))}
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

        <Field>
          <FieldInfo
            htmlFor="client-late-fee"
            label="Late payment interest (% / month)"
            info="Qera's standard invoice terms say 1.5% per month. Recorded here so a client who negotiated something else is not billed the standard rate by accident."
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

      <FieldSet>
        <LegendInfo
          info="How the work was sold, which decides whether there is a billing cycle at all."
          label="What does the engagement type change?"
        >
          Engagement type
        </LegendInfo>
        {/*
          Cards rather than a fourth dropdown. Three options with a line of
          explanation each read faster open than closed, and a page of identical
          selects is a page nobody reads. The radio is real and `sr-only`: it
          carries the keyboard arrows, the group semantics and the label, and
          `has-[:checked]` does the rest in CSS.
        */}
        <Controller
          control={control}
          name="engagementType"
          render={({ field }) => (
            <div className="grid gap-2 @2xs/field-group:grid-cols-3">
              {ENGAGEMENT_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-md border border-input bg-background p-3 transition-colors hover:bg-accent/40 has-[:checked]:border-ring has-[:checked]:bg-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/30"
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={field.name}
                    value={type}
                    checked={field.value === type}
                    onChange={() => field.onChange(type)}
                    onBlur={field.onBlur}
                  />
                  <span className="text-sm font-medium">{ENGAGEMENT_CARDS[type].title}</span>
                  <span className="text-xs text-muted-foreground">
                    {ENGAGEMENT_CARDS[type].hint}
                  </span>
                </label>
              ))}
            </div>
          )}
        />
        <FieldError errors={[errors.engagementType]} />
      </FieldSet>

      {engagementType === 'retainer' ? (
        <FieldRow>
          <Field>
            <FieldLabel htmlFor="client-billing-cycle">Billing cycle</FieldLabel>
            {/*
              The typed number sits beside the picker rather than under it: it
              is the same answer continued, not a second question.
            */}
            <div className="flex items-center gap-2">
              <Combobox
                id="client-billing-cycle"
                size="form"
                className={customCycle ? 'w-32 shrink-0' : undefined}
                options={[
                  ...CYCLE_PRESETS,
                  { value: 'custom', label: 'Custom', separatorBefore: true },
                ]}
                value={customCycle ? 'custom' : interval == null ? '' : String(interval)}
                onValueChange={(next) => {
                  setCustomCycle(next === 'custom');
                  if (next !== 'custom') {
                    setValue('billingIntervalMonths', next === '' ? undefined : Number(next), {
                      shouldDirty: true,
                    });
                  }
                }}
                placeholder="Select a cycle…"
                emptyMessage="No matching cycles."
              />
              {customCycle ? (
                <Input
                  aria-label="Months between invoices"
                  size="form"
                  placeholder="Frequency"
                  {...cycleMonths}
                  /*
                    A custom 3 is quarterly. Someone will type one of the named
                    intervals into the custom box, so the picker takes its own
                    name back rather than leaving the record describing the same
                    cycle two ways. On blur, not on keystroke: collapsing the
                    box the moment "1" is typed makes "12" impossible to enter.
                  */
                  onBlur={(event) => {
                    cycleMonths.onBlur(event);
                    if (CYCLE_PRESETS.some((c) => c.value === String(interval))) {
                      setCustomCycle(false);
                    }
                  }}
                />
              ) : null}
            </div>
            <FieldError errors={[errors.billingIntervalMonths]} />
          </Field>

          <Field>
            <FieldInfo
              htmlFor="client-billing-day"
              label="Billed on day"
              info="The day of the month the retainer invoice is raised on. A month too short for it uses its own last day, so a client billed on the 31st is billed on the 28th in February."
              infoLabel="What happens in a short month?"
            />
            <Controller
              control={control}
              name="billingDay"
              render={({ field }) => <DayOfMonthPicker id="client-billing-day" {...field} />}
            />
            <FieldError errors={[errors.billingDay]} />
          </Field>
        </FieldRow>
      ) : null}

      {/*
        Purchase orders and vendor portals are an enterprise accounts-payable
        apparatus. An individual has neither, and offering the section anyway
        is two switches nobody will ever turn on. The fields stay on the record
        untouched, so a client reclassified later keeps whatever was saved.
      */}
      {kind === 'individual' ? null : (
        <>
        <FieldSeparator />

        <FieldSet>
          <LegendInfo
            info="How this client wants to receive an invoice. Enterprise clients often have requirements that change the delivery step entirely."
            label="About invoice submission"
          >
            Invoice submission
          </LegendInfo>

          {/* Two switches that each reveal one field, so they sit as a pair
              rather than as a stack whose halves look unrelated. */}
          <FieldRow>
            <Field>
              <div className="flex min-h-9.5 items-center justify-between gap-3">
                <FieldInfo
                  htmlFor="client-po-required"
                  label="A PO is required"
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
              </div>
              {poRequired ? (
                <>
                  <Input
                    aria-label="PO number"
                    size="form"
                    placeholder="PO-2026-0042"
                    {...register('poNumber')}
                  />
                  <FieldError errors={[errors.poNumber]} />
                </>
              ) : null}
            </Field>

            <Field>
              <div className="flex min-h-9.5 items-center justify-between gap-3">
                <FieldInfo
                  htmlFor="client-vendor-portal-used"
                  label="Invoices go through a portal"
                  info="Where invoices are submitted, if not by email. Large clients often route everything through Coupa, Ariba or their own portal."
                  infoLabel="What is the vendor portal?"
                />
                <Switch
                  id="client-vendor-portal-used"
                  checked={portalUsed}
                  onCheckedChange={(checked) => {
                    setPortalUsed(checked);
                    // Off means there is no portal, so the address goes with it.
                    // Leaving it behind would restore itself the next time the
                    // switch was flipped and print nowhere in between.
                    if (!checked) setValue('vendorPortalUrl', '', { shouldDirty: true });
                  }}
                />
              </div>
              {portalUsed ? (
                <>
                  <Input
                    aria-label="Vendor portal address"
                    size="form"
                    type="url"
                    placeholder="https://clayora.coupahost.com"
                    {...register('vendorPortalUrl')}
                  />
                  <FieldError errors={[errors.vendorPortalUrl]} />
                </>
              ) : null}
            </Field>
          </FieldRow>
        </FieldSet>
        </>
      )}
    </StepForm>
  );
}

/**
 * A day of the month, 1 to 31, with no month and no year.
 *
 * `DatePicker` is the house answer for a date, and this is not one: a retainer
 * is raised on the 5th of every month, not on the 5th of one of them. A
 * calendar with a month in it would be asking a different question.
 */
function DayOfMonthPicker({
  id,
  value,
  onChange,
  onBlur,
}: {
  id?: string;
  value?: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        onBlur={onBlur}
        data-empty={value == null}
        className="flex h-9.5 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 data-empty:text-muted-foreground"
      >
        <span className="truncate">{value == null ? 'Pick a day' : `Day ${value}`}</span>
        <CalendarDays className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => {
                onChange(day);
                setOpen(false);
              }}
              className={cn(
                'size-8 rounded-md text-sm tabular-nums transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none',
                day === value && 'bg-primary text-primary-foreground hover:bg-primary',
              )}
            >
              {day}
            </button>
          ))}
        </div>
        <p className="mt-2 max-w-56 text-xs text-muted-foreground">
          A month with no such day is billed on its last one, so the 31st becomes the 28th in
          February.
        </p>
      </PopoverContent>
    </Popover>
  );
}
