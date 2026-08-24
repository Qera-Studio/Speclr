"use client";

import "@/lib/zod-config";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { TriangleAlert } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Field,
  FieldError,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { FieldRow } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldLabel } from "@/components/ui/field";
import { DerivedNote } from "@/components/ui/derived-note";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FieldInfo, { InfoTip, LegendInfo } from "@/components/form/FieldInfo";
import FieldCheck from "@/components/form/FieldCheck";
import {
  CinField,
  GstinField,
  PanField,
  TanField,
} from "@/components/form/fields";
import {
  formattedField,
  numericField,
  uppercaseField,
} from "@/components/form/inputFilters";
import {
  clientTaxCrossErrors,
  clientTaxSchema,
  TDS_SECTIONS,
  type ClientTax,
} from "@/lib/domain/client";
import {
  taxIdType,
  taxIdTypeForCountry,
  taxIdTypesForCountry,
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
 * The three things a foreign client's finance team routinely asks a supplier
 * for. A table rather than three near-identical blocks: they differ only in
 * name, label and whether the term needs explaining.
 *
 * Named as the paperwork itself. "They will ask for a W-8BEN-E" is a sentence
 * where a label belongs, and the checkbox already carries the question.
 */
const REQUIREMENTS: {
  name: keyof FormValues;
  id: string;
  label: string;
  info?: string;
  infoLabel?: string;
  /**
   * Where the paperwork exists at all. Absent means everywhere.
   *
   * Scoped for the same reason the registration types are: the country is on
   * the record, and offering a UK client a US withholding form is a question
   * with no true answer. It only ever filters what is *offered* — a flag
   * already ticked stays ticked and stays saved, because a client who moved
   * country did not thereby stop having asked for it.
   */
  applies?: (country: string) => boolean;
}[] = [
  {
    name: "reverseCharge",
    id: "client-reverse-charge",
    label: "Reverse charge",
    info: "The recipient accounts for the tax in their own country. For Qera this changes nothing computed — the supply is already a zero-rated export — but it is what their finance team will expect the invoice to state.",
    infoLabel: "What is reverse charge?",
    // A concept of VAT and GST regimes. The US has neither: its sales tax is
    // charged by the seller at the point of sale and has no reverse-charge
    // mechanism for imported services, so the box would never be ticked.
    applies: (country) => country !== "US",
  },
  {
    name: "requiresTaxResidencyCertificate",
    id: "client-trc",
    label: "Tax residency certificate",
    info: "Proof that Qera is tax-resident in India, which lets the client withhold at the treaty rate under the DTAA instead of their domestic rate. Any country with a treaty may ask, so this one is offered everywhere.",
    infoLabel: "What is a tax residency certificate?",
  },
  {
    name: "requiresW8BenE",
    id: "client-w8",
    label: "W-8BEN-E",
    info: "The US form on which a foreign entity certifies it is not a US person, so the payer withholds at the treaty rate rather than 30%. A US client's accounts payable asks for it before the first payment.",
    infoLabel: "What is a W-8BEN-E?",
    // A US IRS form, asked for by a US payer. Nobody else has one.
    applies: (country) => country === "US",
  },
  /**
   * Last, because it is the one that reveals a field. The rate appears under
   * this row when it is ticked.
   *
   * It belongs here rather than in a section of its own: the two items before
   * it are what decide *what rate* a treaty allows, and a rule plus a legend
   * around a single number is more furniture than the number is worth.
   */
  {
    name: "tdsApplicable",
    id: "client-withholding",
    label: "Withholds tax",
    info: "Many foreign clients withhold before remitting, usually at the rate their country's treaty with India sets rather than their domestic one. Recorded so the smaller payment reconciles against the invoice instead of looking short. It prints as a memo and never changes the amount billed.",
    infoLabel: "What does recording this do?",
  },
];

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
export default function TaxStep({
  client,
  onSaved,
  submitLabel,
  kind = "company",
}: StepProps) {
  const individual = kind === "individual";
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
      country,
    });

    // Mapped over whatever came back rather than field by field. Every key that
    // function returns is a field on this form, and spelling them out here is
    // how a rule added there goes unshown until somebody remembers this line.
    // eslint-disable-next-line no-console
    const entries = Object.entries(cross);
    if (entries.length === 0) return result;
    return {
      ...result,
      values: {},
      errors: {
        ...result.errors,
        ...Object.fromEntries(
          entries.map(([field, message]) => [field, { type: "manual", message }]),
        ),
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
      registrationNumber: client?.tax?.registrationNumber ?? "",
      reverseCharge: client?.tax?.reverseCharge ?? false,
      requiresTaxResidencyCertificate:
        client?.tax?.requiresTaxResidencyCertificate ?? false,
      requiresW8BenE: client?.tax?.requiresW8BenE ?? false,
    },
  });

  const gstRegistered = useWatch({ control, name: "gstRegistered" });
  const tdsApplicable = useWatch({ control, name: "tdsApplicable" });
  const selectedTaxIdType = useWatch({ control, name: "taxIdType" });
  const values = useWatch({ control });

  /**
   * The registration types this country issues, plus whatever is already saved.
   *
   * The saved one is kept whatever the country says, or a record whose address
   * was corrected afterwards would open with the picker blank and quietly drop
   * the number beside it on the next save.
   */
  const taxIdOptions = useMemo(() => {
    const offered = taxIdTypesForCountry(country);
    const held = taxIdType(selectedTaxIdType);
    return held && !offered.includes(held) ? [...offered, held] : offered;
  }, [country, selectedTaxIdType]);

  /** Filtered by country, and never hiding a box that is already ticked. */
  const requirements = REQUIREMENTS.filter(
    (item) =>
      !item.applies || item.applies(country) || Boolean(values[item.name]),
  );

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
      allOptional
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
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
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
                <FieldRow className="animate-in fade-in slide-in-from-top-2 duration-200">
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
            {/*
              PAN and its note are one cell, not two. `FieldRow` is a grid, so
              every child is a column: rendered as a sibling the note took
              column 2 for itself, pushing TAN across and SEZ onto a row of its
              own. It belongs under the input it explains anyway.
            */}
            <div>
              <PanField
                control={control}
                name="pan"
                id="client-pan"
                info="Ten characters. The 4th encodes the holder type, so it is checked against the entity type chosen on the previous step: a Private Limited's PAN is a C, an individual's a P. A GSTIN contains it verbatim, so a registered client's PAN is read from there rather than typed."
                inputClassName={panAutofilled ? "animate-fill-flash" : undefined}
                readOnly={Boolean(derivedPan)}
              />
              {/* The flash says something happened; this says what. A field that
                  fills itself and then refuses to be typed in is the one place
                  the reason cannot be optional, because the only other way to
                  find it out is to try to correct it and fail. */}
              {derivedPan ? (
                <DerivedNote className="mt-1.5">
                  Read from the GSTIN above, which contains it verbatim. Change
                  the GSTIN to change this.
                </DerivedNote>
              ) : null}
            </div>

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

          {/*
            No CIN for an individual. There is no registrar and no certificate:
            a proprietor is registered for GST and for income tax under their
            own PAN, and a field for a number that cannot exist is a field
            somebody will eventually put something else in.
          */}
          {individual ? null : (
            <>
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
                label="CIN"
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
                      record says{" "}
                      {entityTypeLabel(entityType) ?? "something else"}.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      pending={switching}
                      onClick={acceptCinEntityType}
                    >
                      {`Change to ${entityTypeLabel(offerEntityType)}`}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : null}
            </>
          )}
        </>
      ) : (
        <>
          <FieldSet>
            {/*
              The banner became an icon, but the disclosure did not.

              `PRINCIPLES.md` §4 forbids a second jurisdiction; §7 logs the
              override and bounds it at "collected, validated, snapshotted and
              printed; nothing computes from it". Saying so where the operator
              can see it is part of that bound, the same way the clause library
              states on the page that nothing there has been reviewed. So the
              claim itself stays on the page and only its *reasoning* moved to
              hover: an explanation nobody has to open is a disclosure, an
              explanation nobody can see is not.
            */}
            <LegendInfo
              info="Qera invoices an overseas client as a zero-rated export of services under an LUT, so no foreign tax is calculated here and no rate or second tax line comes from this. The registration is the recipient’s, printed where a GSTIN would be."
              label="Why is nothing computed from this?"
            >
              Tax registration
            </LegendInfo>
            <p className="-mt-2 text-xs text-muted-foreground">
              Recorded and printed on their documents. Nothing is computed from
              it.
            </p>

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
                      options={taxIdOptions.map((t) => ({
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
                    // Formatted as the country writes it, on every
                    // keystroke. `taxIdError` bares the value before checking,
                    // so the separators are display and never a second value.
                    {...formattedField(
                      register("taxId"),
                      taxIdType(selectedTaxIdType)?.format,
                    )}
                  />
                  <FieldCheck control={control} name="taxId" />
                </div>
                <FieldError errors={[errors.taxId]} />
              </Field>
            </FieldRow>
          </FieldSet>

          {/*
            A company's registration number, in the same place and for the same
            reason CIN sits at the foot of the Indian branch: it is the one
            identifier here that no tax treatment reads, a registrar's fact
            about the company existing at all.

            A separate field from the tax registration beside it because they
            are separate numbers. A UK company's Companies House number is not
            its VAT number, and typing one into the other runs a mod-97 check
            against a value that was never going to pass. Singapore's UEN
            happens to be both, which is why it is typed once into each rather
            than shared.

            No individual: a sole trader has no register, exactly as a
            proprietor has no CIN.
          */}
          {individual ? null : (
            <>
              <FieldSeparator />
              <Field>
                <FieldInfo
                  htmlFor="client-registration-number"
                  label="Company registration number"
                  info="The number the company register issued when the entity was formed: a Companies House number in the UK, a state file number in the US, a UEN in Singapore, or the local equivalent. Not their tax registration, which is the field above. It is what confirms the entity a contract is signed with exists under that name."
                  infoLabel="Which number is this?"
                />
                {/*
                  **No tick, deliberately, and this is a fix rather than an
                  omission.** `FieldCheck` says "this was checked and it
                  passed". This field has no format rule to check against: a
                  company registration number differs per country and, in the
                  United States, per state, so nine digits and eleven are
                  equally plausible and there is nothing here that can tell
                  them apart. A tick on that is the app claiming to have
                  verified a number it cannot verify, which is worse than
                  saying nothing.
                */}
                <Input
                  id="client-registration-number"
                  size="form"
                  placeholder="Whatever their register issued"
                  {...uppercaseField(register("registrationNumber"))}
                />
                <FieldError errors={[errors.registrationNumber]} />
              </Field>
            </>
          )}

          <FieldSeparator />

          <FieldSet>
            <LegendInfo
              info="What this client's finance team does before it pays, and what it will ask a foreign supplier for. Recorded so the paperwork is known before the invoice, not after it."
              label="Why record these?"
            >
              Their requirements
            </LegendInfo>

            {/*
              One flex row, not a `FieldRow` of horizontal `Field`s. Both of
              those work against a tight cluster: the row is a grid of equal
              tracks, and a horizontal `Field` gives its label `flex-auto`,
              which is what pushed each checkbox to the far side of its column.
              Here the box sits directly against the words it governs, the way
              a checkbox reads everywhere else, and `flex-wrap` handles the
              narrow case.

              Named as the paperwork itself. "They will ask for a W-8BEN-E" is
              a sentence where a label belongs; the checkbox already carries
              the "is this required" question.
            */}
            <div className="flex w-full flex-wrap items-center justify-between gap-y-3">
              {requirements.map((item, i) => (
                <Fragment key={item.id}>
                  {/*
                    A hairline rather than a `FieldSeparator`: these three sit
                    on one line and the divider is only there to stop the eye
                    running a label into the checkbox before it. It is a flex
                    child, so `justify-between` centres it in the gap it
                    divides instead of hanging off one item's edge.
                  */}
                  {i > 0 ? (
                    <span
                      aria-hidden
                      className="h-4 w-px shrink-0 bg-border/60"
                    />
                  ) : null}
                  <div className="flex items-center gap-2">
                    <FieldLabel htmlFor={item.id}>{item.label}</FieldLabel>
                    {/* No `info`, no icon — `InfoTip` renders nothing. */}
                    <InfoTip
                      info={item.info}
                      label={item.infoLabel ?? item.label}
                    />
                    <Controller
                      control={control}
                      name={item.name}
                      render={({ field }) => (
                        <Checkbox
                          id={item.id}
                          checked={Boolean(field.value)}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                </Fragment>
              ))}
            </div>

            {/*
              The one item in that row that carries a figure, so it reveals a
              field rather than only a flag. It sits under the row instead of
              in a section of its own: a rule and a legend for one number is
              more furniture than the number is worth, and withholding belongs
              beside the two treaty items that decide its rate.

              No section and no TAN. Those are Indian apparatus, demanded in
              `clientTaxCrossErrors` where the country is in hand.
            */}
            {tdsApplicable ? (
              <FieldRow
                columns={3}
                className="animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <Field>
                  <FieldLabel htmlFor="client-withholding-rate">
                    Withholding rate (%)
                  </FieldLabel>
                  <Input
                    id="client-withholding-rate"
                    size="form"
                    placeholder="15"
                    {...numericField(
                      register("tdsRatePercent", asOptionalNumber),
                    )}
                  />
                  <FieldError errors={[errors.tdsRatePercent]} />
                </Field>
              </FieldRow>
            ) : null}
          </FieldSet>
        </>
      )}
    </StepForm>
  );
}
