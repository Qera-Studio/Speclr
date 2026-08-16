"use client";

import "@/lib/zod-config";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { Info, TriangleAlert } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Field,
  FieldError,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { FieldRow } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FieldInfo, { LegendInfo } from "@/components/form/FieldInfo";
import FieldCheck from "@/components/form/FieldCheck";
import {
  CinField,
  GstinField,
  PanField,
  TanField,
} from "@/components/form/fields";
import { numericField, uppercaseField } from "@/components/form/inputFilters";
import {
  clientTaxCrossErrors,
  clientTaxSchema,
  TDS_SECTIONS,
  type ClientTax,
} from "@/lib/domain/client";
import {
  TAX_ID_TYPES,
  taxIdType,
  taxIdTypeForCountry,
} from "@/lib/domain/taxIds/foreign";
import { entityTypeLabel } from "@/lib/domain/entityType";
import {
  entityTypeOfCin,
  gstinError,
  gstinPan,
} from "@/lib/domain/taxIds/india";
import { setClientEntityType } from "@/server/actions/clients";
import { Button } from "@/components/ui/button";
import { draftKey, useFormDraft } from "@/lib/draft";
import {
  StepForm,
  asOptionalNumber,
  pruneEmpty,
  useStepSave,
  type StepProps,
} from "./stepKit";

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
  /**
   * The entity type the cross-checks run against.
   *
   * Seeded from the record and only ever changed by accepting the CIN's answer
   * below. It is local state rather than the prop because the accept writes one
   * column server-side and this form has to re-validate against the new value
   * immediately; the record itself is already correct.
   */
  const [entityType, setEntityType] = useState(client?.entityType);
  const country = client?.addressParts?.country?.toUpperCase() || "IN";
  const isIndia = country === "IN";

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
      entityType,
    });

    if (!cross.gstin && !cross.pan && !cross.cin) return result;
    return {
      ...result,
      values: {},
      errors: {
        ...result.errors,
        ...(cross.gstin
          ? { gstin: { type: "manual", message: cross.gstin } }
          : {}),
        ...(cross.pan ? { pan: { type: "manual", message: cross.pan } } : {}),
        ...(cross.cin ? { cin: { type: "manual", message: cross.cin } } : {}),
      },
    };
  };

  const {
    register,
    control,
    setValue,
    watch,
    reset,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver,
    // Checked when a field is left, not only when the form is submitted. This
    // is the step where the app knows more than the operator does (a mod-36
    // check character, a PAN's holder type, a GSTIN that disagrees with the
    // address) and holding all of that back until submit wastes it.
    //
    // `onTouched`, not `onBlur`: first blur, and every keystroke after that.
    // Under `onBlur` the displayed state lagged the value by one blur, which is
    // how pasting a wrong PAN into a field already visited showed a green tick
    // until the field was left. The tick reads "no error recorded", and no
    // error had been recorded *yet*. The same lag held a red error on screen
    // while someone typed the correction.
    mode: "onTouched",
    defaultValues: {
      gstRegistered: client?.tax?.gstRegistered ?? isIndia,
      gstin: client?.tax?.gstin ?? client?.gstin ?? "",
      pan: client?.tax?.pan ?? "",
      sez: client?.tax?.sez ?? false,
      tdsApplicable: client?.tax?.tdsApplicable ?? false,
      tdsSection: client?.tax?.tdsSection ?? "",
      tdsRatePercent: client?.tax?.tdsRatePercent,
      tan: client?.tax?.tan ?? "",
      cin: client?.tax?.cin ?? "",
      taxIdType: client?.tax?.taxIdType ?? taxIdTypeForCountry(country),
      taxId: client?.tax?.taxId ?? "",
      reverseCharge: client?.tax?.reverseCharge ?? false,
      requiresTaxResidencyCertificate:
        client?.tax?.requiresTaxResidencyCertificate ?? false,
      requiresW8BenE: client?.tax?.requiresW8BenE ?? false,
    },
  });

  const gstRegistered = useWatch({ control, name: "gstRegistered" });
  const tdsApplicable = useWatch({ control, name: "tdsApplicable" });
  const selectedTaxIdType = useWatch({ control, name: "taxIdType" });

  /**
   * PAN, from the GSTIN that already contains it.
   *
   * A GSTIN carries the holder's PAN **verbatim** at characters 3–12. Not
   * derived from, not encoded in: those ten characters are the PAN. So for a
   * registered client this is not a guess that happens to be reliable, it is
   * the same string read out of a field the operator has already filled, and
   * `PRINCIPLES.md` rule 3 is unambiguous about a value the system already
   * knows: compute it, never store it as editable.
   *
   * So it is not a prefill any more. While a GSTIN that fully passes is in the
   * field above, the PAN **is** its characters 3–12 and the input is read-only.
   * Two bounds make that safe:
   *
   *  - **Only from a GSTIN that passes its check character.** The embedded PAN
   *    of a mistyped GSTIN is a mistyped PAN, and mod-36 is what tells the two
   *    apart. Clear or break the GSTIN and the field is typeable again, keeping
   *    what it held.
   *  - **It flashes** when it fills, the same signal a pincode gives when it
   *    fills city and state. A value that appears in a box nobody is looking at
   *    is a value nobody checks.
   *
   * What this removes is worth naming: the only way the PAN and the GSTIN could
   * disagree was for someone to type both, and typing the second one is what
   * this step now refuses to ask for. The holder-type check still runs on the
   * result, so a company's GSTIN on a record marked individual is still caught.
   */
  const gstinValue = String(useWatch({ control, name: "gstin" }) ?? "");
  const panValue = String(useWatch({ control, name: "pan" }) ?? "");
  const [panAutofilled, setPanAutofilled] = useState(false);
  const derivedPan =
    gstinValue && !gstinError(gstinValue) ? gstinPan(gstinValue) : null;

  useEffect(() => {
    if (!derivedPan || derivedPan === panValue) return;
    setValue("pan", derivedPan, { shouldValidate: true, shouldTouch: true });
    setPanAutofilled(true);
  }, [derivedPan, panValue, setValue]);

  /**
   * When the CIN and the entity type disagree, offer the CIN's answer.
   *
   * `cinEntityTypeError` already blocks the save and says the two disagree.
   * What it cannot do is resolve it: the entity type is a step-1 field, so the
   * only route out was to go back, re-submit the identity form and come
   * forward. For one column, on the step where the evidence is.
   *
   * **The CIN is the better source and still does not win by itself.** A
   * certificate of incorporation states the form of the company outright,
   * where the dropdown was picked from memory a minute earlier — so the offer
   * defaults to the CIN. But it is an offer. Deriving `entityType` from the CIN
   * would make `cinEntityTypeError` agree with itself by construction and take
   * `panHolderTypeError` down with it, which is the whole reason the field was
   * kept independent. A person accepts, or fixes the CIN instead.
   *
   * `router.refresh()` re-reads the client the server holds, and `trigger`
   * re-runs the resolver against the new entity type so the error clears
   * without needing the field touched again.
   */
  const cinValue = String(useWatch({ control, name: "cin" }) ?? "");
  const cinSaysType = entityTypeOfCin(cinValue);
  const offerEntityType =
    client?.id && cinSaysType && entityType && cinSaysType !== entityType
      ? cinSaysType
      : null;

  const [switching, startSwitch] = useTransition();

  const acceptCinEntityType = () => {
    if (!client?.id || !offerEntityType) return;
    startSwitch(async () => {
      const result = await setClientEntityType(client.id, offerEntityType);
      if (!result.success) return;
      // Held locally rather than waiting for the server component to re-render
      // with a fresh `client`. `revalidatePath` in the action has already made
      // the server's copy correct, so this is only about the form in front of
      // the reader — and it removes a race where `trigger` re-validated against
      // the old entity type and left the error up.
      setEntityType(offerEntityType);
    });
  };

  // Re-check the CIN against the type that was just accepted, so the refusal
  // clears without the field being touched again. It has to be an effect rather
  // than a line in the handler above: `trigger` runs the resolver, and the
  // resolver only closes over the new entity type once the render caused by
  // `setEntityType` has happened. The condition is what keeps it off the mount
  // pass, where the two are equal by construction.
  useEffect(() => {
    if (entityType !== client?.entityType) void trigger("cin");
  }, [entityType, client?.entityType, trigger]);

  // Restores what was typed but not saved, so a refresh or a hop to the other
  // profile comes back to the same half-filled form. Cleared on save.
  useFormDraft(draftKey(client?.id, "tax"), watch, reset);

  const { serverError, save } = useStepSave<FormValues>(
    client,
    "tax",
    onSaved,
    pruneEmpty,
  );

  return (
    <StepForm
      onSubmit={handleSubmit(save)}
      serverError={serverError}
      submitting={isSubmitting}
      submitLabel={submitLabel}
    >
      {isIndia ? (
        /*
          Two switched sections side by side, then the three identifiers.

          The switch sits *on* each section's heading rather than in a row of
          its own beneath it. A toggle that governs everything below it is a
          property of the heading, and giving it its own labelled row said the
          same thing twice ("TDS" / "They deduct TDS") while pushing the fields
          it controls a row further down.

          The identifiers come last. PAN belongs to the GST story and TAN to
          the TDS one, so those two sit with the SEZ flag directly under the
          sections that explain them. CIN belongs to neither, and the rule
          below them is there to say so.
        */
        <>
          {/*
            `gap-x-10` rather than the row's default 12px. These two columns are
            separate sections with their own headings and their own switch, not
            two fields of one thing, and at 12px the GSTIN and the TDS section
            read as one four-field row. Column gap only: stacked on a narrow
            screen they are consecutive sections and the vertical rhythm should
            not change.
          */}
          <FieldRow className="gap-x-10">
            <FieldSet>
              <LegendInfo
                info="An unregistered client is billed without GST. A registered one's GSTIN is where the place of supply on every invoice comes from."
                label="What does GST registration change?"
                action={
                  <Controller
                    control={control}
                    name="gstRegistered"
                    render={({ field }) => (
                      <Switch
                        id="client-gst-registered"
                        aria-label="GST registered"
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                }
              >
                GST registered
              </LegendInfo>

              {gstRegistered ? (
                // Revealed by the switch above, so it arrives rather than
                // appears: a field that pops into a form the eye has already
                // measured reads as a redraw, and the same field sliding down
                // reads as a response.
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <GstinField
                    control={control}
                    name="gstin"
                    id="client-gstin"
                  />
                </div>
              ) : null}
            </FieldSet>

            <FieldSet>
              <LegendInfo
                info="Most corporate clients deduct tax before paying. 194J is the usual section for professional services. It prints on the invoice as a memo and never changes the amount billed: the taxable value on a GST document is the full consideration."
                label="What does recording TDS do?"
                action={
                  <Controller
                    control={control}
                    name="tdsApplicable"
                    render={({ field }) => (
                      <Switch
                        id="client-tds"
                        aria-label="TDS deducted"
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                }
              >
                TDS
              </LegendInfo>

              {tdsApplicable ? (
                <FieldRow className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <Field>
                    <FieldLabel htmlFor="client-tds-section">
                      Section
                    </FieldLabel>
                    <Controller
                      control={control}
                      name="tdsSection"
                      render={({ field }) => (
                        <Combobox
                          id="client-tds-section"
                          size="form"
                          options={TDS_SECTIONS.map((s) => ({
                            value: s,
                            label: s,
                          }))}
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          placeholder="Select…"
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
                      {...numericField(
                        register("tdsRatePercent", asOptionalNumber),
                      )}
                    />
                    <FieldError errors={[errors.tdsRatePercent]} />
                  </Field>
                </FieldRow>
              ) : null}
            </FieldSet>
          </FieldRow>

          {/*
            TAN no longer hides behind the TDS switch. A company either holds
            one or it does not, and that is true whether or not this record has
            been told they deduct — the switch decides whether it is *required*
            (`clientTaxSchema`), which is a different question from whether it
            is worth recording.

            SEZ sits between them rather than up in the GST block. It is a
            property of *this party* in the same way the two numbers around it
            are, and the switched sections above are about what Qera does at
            billing time. Label and box share one line, level with the two
            inputs beside it: a one-line control given a label row of its own
            leaves a hole under it that reads as a field that failed to render.
          */}
          <FieldRow columns={3}>
            <PanField
              control={control}
              name="pan"
              id="client-pan"
              info="Ten characters. The 4th encodes the holder type, so it is checked against the entity type chosen on the previous step: a Private Limited's PAN is a C, an individual's a P. A GSTIN contains it verbatim, so a registered client's PAN is read from there rather than typed."
              inputClassName={panAutofilled ? "animate-fill-flash" : undefined}
              readOnly={Boolean(derivedPan)}
            />

            {/*
              The cell is built like its neighbours rather than aligned against
              them. `FieldRow` is `items-start`, so the row's box runs from the
              top of PAN's label to the bottom of its input, and centring
              against *that* lands above the inputs. A spacer label puts this
              line where PAN's input starts, and `h-9.5` (what `Input
              size="form"` resolves to) makes the checkbox share its midline.

              It also survives an error under PAN growing the row, which
              anything anchored to the row's middle or bottom would not.
            */}

            <TanField control={control} name="tan" id="client-tan" />

            <Field>
              <FieldLabel aria-hidden className="invisible select-none">
                SEZ
              </FieldLabel>
              <div className="flex h-9.5 flex align-center justify-center items-center align-center gap-2">
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
              </div>
            </Field>
          </FieldRow>

          <FieldSeparator />

          {/*
            CIN takes the full width, below the rule rather than above it.
            Everything above is what this company is *for tax*: whether they are
            registered, whether they deduct, and the three numbers that follow
            from those. A CIN is none of that — it is a registrar's fact about
            the company existing at all, the one identifier here that no tax
            treatment reads.

            The width is the second reason. At 21 characters it is the longest
            identifier by half again, and it is now the one carrying two decoded
            facts, so a third of a row had the value and its reading competing
            for the same space.
          */}
          <CinField
            control={control}
            name="cin"
            id="client-cin"
            label="CIN (optional)"
          />

          {/*
            Not the registrar box that used to hang under this field. That one
            fired on correct data, which is why it went. This appears only on a
            disagreement that already blocks the save, and it carries the fix,
            so it is news with an action rather than a standing caution.
          */}
          {offerEntityType ? (
            <Alert
              variant="warning"
              className="animate-in fade-in slide-in-from-top-1"
            >
              <TriangleAlert aria-hidden />
              <AlertDescription className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span>
                  This CIN says {entityTypeLabel(offerEntityType)}, and the
                  record says {entityTypeLabel(entityType) ?? "something else"}.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={switching}
                  onClick={acceptCinEntityType}
                >
                  {switching
                    ? "Changing…"
                    : `Change to ${entityTypeLabel(offerEntityType)}`}
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
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
                <FieldLabel htmlFor="client-tax-id-type">
                  Registration type
                </FieldLabel>
                <Controller
                  control={control}
                  name="taxIdType"
                  render={({ field }) => (
                    <Combobox
                      id="client-tax-id-type"
                      size="form"
                      options={TAX_ID_TYPES.map((t) => ({
                        value: t.code,
                        label: t.label,
                      }))}
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      placeholder="Select a type…"
                      emptyMessage="No matching types."
                    />
                  )}
                />
                <FieldError errors={[errors.taxIdType]} />
              </Field>

              {/*
                Built inline rather than in `form/fields.tsx`, and that is a
                decision rather than the one that got missed. Its label,
                placeholder and rule all change with the registration type
                chosen beside it, and this is its only caller anywhere. A
                component with one call site and no shared rule is an
                abstraction with nothing to share. It joins the others the day
                a second form asks for a foreign registration.

                These carry real check digits too: UK VAT is mod-97, an ABN
                mod-89. Same claim as the Indian identifiers, and the same
                limit on it.
              */}
              <Field>
                <FieldLabel htmlFor="client-tax-id">Number</FieldLabel>
                <div className="relative">
                  <Input
                    id="client-tax-id"
                    size="form"
                    className="pr-8"
                    placeholder={
                      taxIdType(selectedTaxIdType)?.placeholder ??
                      "Registration number"
                    }
                    {...uppercaseField(register("taxId"))}
                  />
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
              <FieldLabel htmlFor="client-trc">
                They need a tax residency certificate
              </FieldLabel>
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
              <FieldLabel htmlFor="client-w8">
                They will ask for a W-8BEN-E
              </FieldLabel>
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
