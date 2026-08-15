'use client';

import '@/lib/zod-config';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { Info, TriangleAlert } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Field,
  FieldError,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLabel } from '@/components/ui/field';
import { Combobox } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FieldInfo, { LegendInfo } from '@/components/form/FieldInfo';
import FieldCheck from '@/components/form/FieldCheck';
import { numericField, uppercaseField } from '@/components/form/inputFilters';
import { clientTaxCrossErrors, clientTaxSchema, TDS_SECTIONS, type ClientTax } from '@/lib/domain/client';
import { TAX_ID_TYPES, taxIdType, taxIdTypeForCountry } from '@/lib/domain/taxIds/foreign';
import { cinStateHint } from '@/lib/domain/taxIds/india';
import { StepForm, asOptionalNumber, pruneEmpty, useStepSave, type StepProps } from './stepKit';

type FormValues = ClientTax;

/**
 * Tax & registration.
 *
 * **Two branches, one record.** India gets GSTIN/PAN/SEZ/TDS/CIN; everywhere
 * else gets a typed registration number and the three things a foreign client
 * routinely asks a supplier for. Which branch shows is decided by
 * `addressParts.country` — there is no country field on this step, because the
 * address already said.
 *
 * **What the foreign branch is, and is not.** It is collected, validated and
 * stored, and it prints as the recipient's registration. Nothing computes from
 * it: no VAT rate, no second tax line, no foreign-denominated invoice. That
 * bound is recorded at the top of `taxIds/foreign.ts` and in `PRINCIPLES.md` §7,
 * and it is what keeps this step from quietly becoming a jurisdiction engine.
 *
 * The GSTIN↔address check is the one that earns this whole flow: a GSTIN's
 * first two digits *are* the place of supply, so agreeing them with the address
 * once, here, is what makes deriving place of supply per document trustworthy.
 */
export default function TaxStep({ client, onSaved, submitLabel }: StepProps) {
  const addressState = client?.addressParts?.state;
  const country = client?.addressParts?.country?.toUpperCase() || 'IN';
  const isIndia = country === 'IN';

  /**
   * The cross-section rules live in `clientTaxCrossErrors` and run here as well
   * as on the server, because they need the address and entity type — which are
   * on the record, not in this form's values. Same function both sides, so the
   * browser and the action can never disagree about what is valid.
   */
  const resolver: Resolver<FormValues> = async (values, context, options) => {
    const result = await zodResolver(clientTaxSchema)(values, context, options);
    const cross = clientTaxCrossErrors(values, {
      addressState,
      entityType: client?.entityType,
    });

    if (!cross.gstin && !cross.pan) return result;
    return {
      ...result,
      values: {},
      errors: {
        ...result.errors,
        ...(cross.gstin ? { gstin: { type: 'manual', message: cross.gstin } } : {}),
        ...(cross.pan ? { pan: { type: 'manual', message: cross.pan } } : {}),
      },
    };
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver,
    // Checked when a field is left, not only when the form is submitted. This
    // is the step where the app knows more than the operator does — a mod-36
    // check character, a PAN's holder type, a GSTIN that disagrees with the
    // address — and holding all of that back until submit wastes it.
    mode: 'onBlur',
    defaultValues: {
      gstRegistered: client?.tax?.gstRegistered ?? isIndia,
      gstin: client?.tax?.gstin ?? client?.gstin ?? '',
      pan: client?.tax?.pan ?? '',
      sez: client?.tax?.sez ?? false,
      tdsApplicable: client?.tax?.tdsApplicable ?? false,
      tdsSection: client?.tax?.tdsSection ?? '',
      tdsRatePercent: client?.tax?.tdsRatePercent,
      tan: client?.tax?.tan ?? '',
      cin: client?.tax?.cin ?? '',
      taxIdType: client?.tax?.taxIdType ?? taxIdTypeForCountry(country),
      taxId: client?.tax?.taxId ?? '',
      reverseCharge: client?.tax?.reverseCharge ?? false,
      requiresTaxResidencyCertificate: client?.tax?.requiresTaxResidencyCertificate ?? false,
      requiresW8BenE: client?.tax?.requiresW8BenE ?? false,
    },
  });

  const gstRegistered = useWatch({ control, name: 'gstRegistered' });
  const tdsApplicable = useWatch({ control, name: 'tdsApplicable' });
  const selectedTaxIdType = useWatch({ control, name: 'taxIdType' });
  const cin = useWatch({ control, name: 'cin' });

  const { serverError, save } = useStepSave<FormValues>(client, 'tax', onSaved, pruneEmpty);
  const cinHint = cin ? cinStateHint(cin, addressState) : null;

  return (
    <StepForm
      onSubmit={handleSubmit(save)}
      serverError={serverError}
      submitting={isSubmitting}
      submitLabel={submitLabel}
    >
      {isIndia ? (
        <>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="client-gst-registered">GST registered</FieldLabel>
            <Controller
              control={control}
              name="gstRegistered"
              render={({ field }) => (
                <Switch
                  id="client-gst-registered"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </Field>

          {gstRegistered ? (
            // Revealed by the switch above, so it arrives rather than appears:
            // a field that pops into a form the eye has already measured reads
            // as a redraw, and the same field sliding down reads as a response.
            <Field className="animate-in fade-in slide-in-from-top-2 duration-300">
              <FieldInfo
                htmlFor="client-gstin"
                label="GSTIN"
                info="The first two digits are the state of registration, and they become the place of supply on every invoice. They are checked against the address so the two can never disagree."
                infoLabel="Why does the GSTIN matter?"
              />
              <div className="relative">
                <Input
                  id="client-gstin"
                  size="form"
                  className="pr-8"
                  placeholder="09AABCQ2864Q1ZQ"
                  {...uppercaseField(register('gstin'))}
                />
                <FieldCheck control={control} name="gstin" />
              </div>
              <FieldError errors={[errors.gstin]} />
            </Field>
          ) : null}

          <Field>
            <FieldInfo
              htmlFor="client-pan"
              label="PAN"
              info="Ten characters. The 4th encodes the holder type, so it is checked against the entity type chosen on the previous step — a Private Limited's PAN is a C, an individual's a P."
              infoLabel="What is checked about the PAN?"
            />
            <div className="relative">
              <Input
                id="client-pan"
                size="form"
                className="pr-8"
                placeholder="AABCQ2864Q"
                {...uppercaseField(register('pan'))}
              />
              <FieldCheck control={control} name="pan" />
            </div>
            <FieldError errors={[errors.pan]} />
          </Field>

          <Field orientation="horizontal">
            <FieldInfo
              htmlFor="client-sez"
              label="SEZ unit"
              info="A supply to an SEZ unit is zero-rated under IGST Act s.16, made without payment of tax under an LUT. It is easy to miss and it changes the tax treatment entirely."
              infoLabel="What does SEZ change?"
            />
            <Controller
              control={control}
              name="sez"
              render={({ field }) => (
                <Checkbox
                  id="client-sez"
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </Field>

          <FieldSeparator />

          <FieldSet>
            <LegendInfo
              info="Most corporate clients deduct tax before paying. 194J is the usual section for professional services. It prints on the invoice as a memo and never changes the amount billed — the taxable value on a GST document is the full consideration."
              label="What does recording TDS do?"
            >
              TDS
            </LegendInfo>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="client-tds">They deduct TDS</FieldLabel>
              <Controller
                control={control}
                name="tdsApplicable"
                render={({ field }) => (
                  <Switch
                    id="client-tds"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </Field>

            {tdsApplicable ? (
              <div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-4 duration-300">
                <FieldRow>
                  <Field>
                    <FieldLabel htmlFor="client-tds-section">Section</FieldLabel>
                    <Controller
                      control={control}
                      name="tdsSection"
                      render={({ field }) => (
                        <Combobox
                          id="client-tds-section"
                          size="form"
                          options={TDS_SECTIONS.map((s) => ({ value: s, label: s }))}
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                          placeholder="Select a section…"
                          emptyMessage="No matching sections."
                        />
                      )}
                    />
                    <FieldError errors={[errors.tdsSection]} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="client-tds-rate">Rate (%)</FieldLabel>
                    <Input
                      id="client-tds-rate"
                      size="form"
                      placeholder="10"
                      {...numericField(register('tdsRatePercent', asOptionalNumber))}
                    />
                    <FieldError errors={[errors.tdsRatePercent]} />
                  </Field>
                </FieldRow>

                <Field>
                  <FieldInfo
                    htmlFor="client-tan"
                    label="TAN"
                    info="The account number the deduction is filed against. Anyone deducting TDS is required to hold one."
                    infoLabel="What is a TAN?"
                  />
                  <div className="relative">
                    <Input
                      id="client-tan"
                      size="form"
                      className="pr-8"
                      placeholder="DELQ12345F"
                      {...uppercaseField(register('tan'))}
                    />
                    <FieldCheck control={control} name="tan" />
                  </div>
                  <FieldError errors={[errors.tan]} />
                </Field>
              </div>
            ) : null}
          </FieldSet>

          <FieldSeparator />

          {/*
            `isolate` so the two z-indexes below are compared against each
            other and nothing else. Without it they are settled in whatever
            stacking context the page happens to provide, which is how the
            notice ended up painting over the field it is supposed to hide
            behind.
          */}
          <Field className="isolate">
            <FieldInfo
              htmlFor="client-cin"
              label="CIN (optional)"
              info="The Corporate Identity Number from the certificate of incorporation. 21 characters, and only companies have one — some contracts ask for it."
              infoLabel="What is a CIN?"
            />
            {/*
              Lifted above the notice, and opaque in its own right.

              The wrapper carries the background rather than leaning on the
              input's: the autofill rule in globals.css sets
              `background-clip: text` on an autofilled field, which is exactly
              what stops Chrome painting its blue, and it would just as happily
              stop the field painting the white that hides the notice's top
              half. One class here and "behind" no longer depends on the input
              being opaque.
            */}
            <div className="relative z-10 rounded-md bg-background">
              <Input
                id="client-cin"
                size="form"
                className="pr-8"
                placeholder="U62099UP2026PTC254312"
                {...uppercaseField(register('cin'))}
              />
              <FieldCheck control={control} name="cin" />
            </div>
            {cinHint ? (
              <>
                {/*
                  A warning box, not red text: nothing is blocked and nothing is
                  refused. The registrar pair is a *hint*, since the published
                  ROC codes are not exhaustive, so a real CIN can disagree with
                  this and still be correct.

                  It hangs out from behind the field rather than sitting in the
                  flow below it. Five classes make that work and they are
                  interlocking, so none of them is arbitrary:

                    `z-0`       behind the input, explicitly. The `Alert`
                                primitive is itself `relative`, so leaving this
                                to source order put a later sibling in front of
                                an earlier `z-10` one. Zero rather than a
                                negative: Tailwind emits `-z-10` as
                                `z-index: calc(10 * -1)`, and a *negative* layer
                                is the one case engines disagree on once the
                                drop animation's transform has promoted this
                                box to its own compositing layer. 0 against 10
                                is the boring comparison every engine agrees
                                about.
                    `max-w`     80% of the field, so it reads as hanging *from*
                                the field rather than as the form's next row.
                                A max-width, not a width: `Field` is
                                `flex-col *:w-full`, and that variant sorts
                                after plain `w-*` in the sheet, so it wins any
                                straight fight over `width`. `max-width` has no
                                such competitor.
                    `mx-auto`   centred. An auto cross-axis margin also turns
                                off the flex container's default `stretch`,
                                which is the other half of why `w-auto` alone
                                did nothing.
                    `-mt-6`     24px up, against the 8px `Field` gap: 16px of
                                the box ends up behind the input.
                    `pt-4`      the same 16px, so the text clears the input's
                                bottom edge exactly and none of it is hidden.

                  The fall itself is `drop-in` in globals.css.
                */}
                <Alert
                  variant="warning"
                  className="animate-drop-in z-0 mx-auto -mt-6 max-w-[80%] pt-4"
                >
                  <TriangleAlert aria-hidden />
                  <AlertDescription>{cinHint}</AlertDescription>
                </Alert>
                {/* Colour is not announced; this is. */}
                <span role="status" className="sr-only">
                  {cinHint}
                </span>
              </>
            ) : null}
            <FieldError errors={[errors.cin]} />
          </Field>
        </>
      ) : (
        <>
          {/*
            On the page, not behind an icon — deliberately.

            `PRINCIPLES.md` §4 forbids a second jurisdiction; §7 logs the
            override and bounds it at "collected, validated, snapshotted and
            printed; nothing computes from it". Saying so where the operator
            can see it is part of that bound, the same way the clause library
            states on the page that nothing there has been reviewed. An
            explanation that only appears on hover is not a disclosure.
          */}
          <Alert variant="note">
            <Info aria-hidden />
            <AlertDescription>
              A foreign registration is recorded and printed on their documents
              as the recipient’s registration. Nothing is computed from it: Qera
              invoices an overseas client as a zero-rated export of services
              under an LUT, and no foreign tax is calculated here.
            </AlertDescription>
          </Alert>

          <FieldSet>
            <FieldLegend variant="label">Tax registration</FieldLegend>

            <FieldRow>
              <Field>
                <FieldLabel htmlFor="client-tax-id-type">Registration type</FieldLabel>
                <Controller
                  control={control}
                  name="taxIdType"
                  render={({ field }) => (
                    <Combobox
                      id="client-tax-id-type"
                      size="form"
                      options={TAX_ID_TYPES.map((t) => ({ value: t.code, label: t.label }))}
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      placeholder="Select a type…"
                      emptyMessage="No matching types."
                    />
                  )}
                />
                <FieldError errors={[errors.taxIdType]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="client-tax-id">Number</FieldLabel>
                <div className="relative">
                  <Input
                    id="client-tax-id"
                    size="form"
                    className="pr-8"
                    placeholder={taxIdType(selectedTaxIdType)?.placeholder ?? 'Registration number'}
                    {...uppercaseField(register('taxId'))}
                  />
                  {/* These carry real check digits too: UK VAT is mod-97, an
                      ABN mod-89. Same claim as the Indian identifiers, and the
                      same limit on it. */}
                  <FieldCheck control={control} name="taxId" />
                </div>
                <FieldError errors={[errors.taxId]} />
              </Field>
            </FieldRow>
          </FieldSet>

          <FieldSeparator />

          <FieldSet>
            <LegendInfo
              info="Recorded so the paperwork is known before the invoice, not after it."
              label="Why record these?"
            >
              What they will ask for
            </LegendInfo>

            <Field orientation="horizontal">
              <FieldInfo
                htmlFor="client-reverse-charge"
                label="Reverse charge applies on their side"
                info="The recipient accounts for the tax in their own country. For Qera this changes nothing computed — the supply is already a zero-rated export — but it is what their finance team will expect the invoice to state."
                infoLabel="What is reverse charge?"
              />
              <Controller
                control={control}
                name="reverseCharge"
                render={({ field }) => (
                  <Checkbox
                    id="client-reverse-charge"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="client-trc">They need a tax residency certificate</FieldLabel>
              <Controller
                control={control}
                name="requiresTaxResidencyCertificate"
                render={({ field }) => (
                  <Checkbox
                    id="client-trc"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="client-w8">They will ask for a W-8BEN-E</FieldLabel>
              <Controller
                control={control}
                name="requiresW8BenE"
                render={({ field }) => (
                  <Checkbox
                    id="client-w8"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </Field>
          </FieldSet>
        </>
      )}
    </StepForm>
  );
}
