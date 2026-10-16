'use client';

import '@/lib/zod-config';
import { useEffect, useMemo, useState } from 'react';
import { useController, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Field, FieldError, FieldLabel, FieldSeparator, FieldSet } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import FieldInfo, { LegendInfo } from '@/components/patterns/FieldInfo';
import AddressFields from '@/components/form/AddressFields';
import PhoneField, { validatePhoneValue } from '@/components/form/PhoneField';
import { EmailField } from '@/components/form/fields';
import { clientInputSchema } from '@/lib/domain/registry';
import { composeAddress, emptyAddressParts } from '@/lib/domain/address';
import {
  clientKindOf,
  entityTypeSpec,
  entityTypesForClient,
  entityTypesForCountry,
  isNaturalPerson,
  type ClientKind,
} from '@/lib/domain/entityType';
import { emailSchema, phoneSchema } from '@/lib/domain/fields';
import { INDUSTRIES, INDUSTRY_KEYS } from '@/lib/domain/industry';
import { personNameSchema, textSchema } from '@/lib/domain/text';
import type { ClientContacts } from '@/lib/domain/client';
import { createClient, saveClientSection, updateClient } from '@/server/actions/clients';
import type { ClientRecord } from '@/lib/domain/types';
import { clearDraft, draftKey, useFormDraft } from '@/lib/draft';
import { pruneEmpty, StepForm, type StepProps } from './stepKit';

/**
 * Identity, plus the two things an individual has no separate step for.
 *
 * A person is their own contact, so the Contacts step is not shown to one
 * (`onboardingSteps`). What that step collected which the identity fields do
 * not already say is exactly this: what they call themselves, and whether
 * invoices go to somebody else. Both are stored in the existing `contacts`
 * group, so nothing downstream learns a new shape.
 *
 * Their name, email and phone are **not** collected again. They are already on
 * the record, and a copy would go stale the first time this step was edited
 * (`PRINCIPLES.md` rule 3). `clientContact` derives them on read.
 */
const identityFormSchema = clientInputSchema.extend({
  /*
    Re-stated without the transform `clientInputSchema` puts on it.

    That transform turns `''` into `undefined`, which is right for the action
    and wrong for a form: react-hook-form types a field by the schema's *input*,
    and a transform makes input and output differ, so the resolver stops
    matching the field a `Combobox` actually holds. The empty string is
    normalised on the way to the server, where the shared schema runs again.
  */
  industry: z.union([z.enum(INDUSTRY_KEYS), z.literal('')]).optional(),
  designation: textSchema(200).optional(),
  billingContact: z
    .object({
      name: personNameSchema(200).optional(),
      email: emailSchema().optional(),
      phone: phoneSchema().optional(),
    })
    .optional(),
});

type FormValues = z.infer<typeof identityFormSchema>;

/** `line2` is genuinely optional; the rest are what makes an address one. */
const REQUIRED_ADDRESS_PARTS = ['line1', 'city', 'state', 'pincode', 'country'] as const;

/**
 * Identity: the step that creates the record.
 *
 * The resolver carries the rules the shared schema cannot. The first two are
 * inherited verbatim from the form this replaces:
 *
 * 1. `address` is required — it is what documents print — but nobody types it.
 *    It is composed from the parts, so it has to be derived *before* zod sees
 *    the values or a perfectly filled address is rejected for an empty field.
 * 2. The schema's `phone` rule is deliberately lenient so records written
 *    before phones were structured stay editable; strict per-country validation
 *    belongs here, where it can be corrected. A resolver overrides any `rules`
 *    on a controller, so this is the only place it can live.
 * 3. A separate billing address, if there is one, has to be whole. See below.
 *
 * Entity type is required *here* and optional on the record — clients created
 * before onboarding existed have none, and a required column would make those
 * rows permanently un-saveable.
 */
const makeResolver = (kind: ClientKind, saved?: string, hasRecord = false): Resolver<FormValues> => async (values, context, options) => {
  const composed = composeAddress(values.addressParts ?? emptyAddressParts);
  /**
   * The kind the *submitted* form describes, which on a saved record is not
   * necessarily the one it arrived with: the entity type is editable across the
   * axis there, and it is what the kind is derived from. Judging the rules below
   * against the incoming prop would reject the very correction being made.
   */
  const submitted = values.entityType ? clientKindOf(values.entityType) : kind;
  /**
   * An individual has no legal name apart from their own.
   *
   * `companyName` is what every sheet prints (`companyName || name`), and it is
   * required, so it is derived here for the same reason `address` is: the field
   * is not rendered, and a required field nobody can see is a form that cannot
   * be submitted. A proprietorship or a sole trader *does* type one — their
   * trading name — and only while the entity type says so, or switching back to
   * a plain individual would keep printing a business name they no longer use.
   */
  const trades = entityTypeSpec(values.entityType)?.tradingName === true;
  const companyName =
    submitted === 'individual' && !(trades && values.companyName?.trim())
      ? values.name
      : values.companyName;

  const withAddress = { ...values, address: composed || values.address, companyName };
  const result = await zodResolver(identityFormSchema)(withAddress, context, options);

  const errors = { ...result.errors };
  let failed = false;

  /**
   * A separate billing address is complete or it is not there.
   *
   * `addressPartsSchema` is blank-tolerant, which is right for a step that
   * saves against a half-filled row, but a *second* address is opt-in: ticking
   * the box is a statement that one exists. Half of one would print on a tax
   * invoice as an address that goes nowhere, so the missing parts are named
   * and the alternative is to untick, which removes it entirely.
   */
  const billing = values.billingAddressParts;
  if (billing) {
    const blanks = REQUIRED_ADDRESS_PARTS.filter((key) => !String(billing[key] ?? '').trim());
    if (blanks.length > 0) {
      errors.billingAddressParts = Object.fromEntries(
        blanks.map((key) => [
          key,
          { type: 'manual', message: 'Needed for a separate billing address.' },
        ]),
      );
      failed = true;
    }
  }

  const phoneError = validatePhoneValue(values.phone);
  if (phoneError) {
    errors.phone = { type: 'manual', message: phoneError };
    failed = true;
  }
  // Checked against the forms *this country and this kind* offer, not merely
  // against empty. Moving the address abroad leaves an Indian selection in the
  // field with nothing showing in the list, and a person saved as a private
  // limited is a wrong record rather than a cosmetic one.
  //
  // The form already on the record is passed through, so the rule matches the
  // dropdown: a US corporation addressed in London stays saveable, an Indian
  // form on a foreign address still does not.
  // A saved record may cross the kind axis (see `entityOptions` below), so the
  // rule matches the dropdown there too: the country filter still applies, the
  // kind filter does not.
  const offered = hasRecord
    ? entityTypesForCountry(values.addressParts?.country, saved)
    : entityTypesForClient(values.addressParts?.country, kind, saved);
  if (!values.entityType || !offered.some((e) => e.value === values.entityType)) {
    errors.entityType = { type: 'manual', message: 'Choose the entity type.' };
    failed = true;
  }

  return failed ? { ...result, values: {}, errors } : result;
};

export default function IdentityStep({
  client,
  onSaved,
  submitLabel,
  kind = 'company',
  country: chosenCountry,
}: StepProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  // What the record already says, not what the field currently holds: the
  // exemption is for a form that was saved, and a fresh pick has to pass on its
  // own merits.
  const savedEntityType = client?.entityType;
  const resolver = useMemo(
    () => makeResolver(kind, savedEntityType, Boolean(client)),
    [client, kind, savedEntityType],
  );
  const {
    register,
    control,
    watch,
    reset,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver,
    // Errors land when a field is left, not only at submit. Seven steps of
    // silence followed by one page of red is a worse trade than being told
    // where you are as you go.
    //
    // `onTouched` rather than `onBlur`: first blur, then every keystroke. Under
    // `onBlur` the displayed state lagged the value by a whole blur, so a field
    // already visited kept its tick while wrong and kept its error while being
    // corrected. See the longer note in `TaxStep`.
    mode: 'onTouched',
    defaultValues: client
      ? {
          name: client.name,
          companyName: client.companyName ?? '',
          address: client.address,
          addressParts: client.addressParts ?? { ...emptyAddressParts },
          billingAddressParts: client.billingAddressParts,
          email: client.email,
          phone: client.phone,
          entityType: client.entityType ?? '',
          industry: client.industry ?? '',
          designation: client.contacts?.primary?.designation ?? '',
          billingContact: client.contacts?.roles?.billing ? undefined : client.contacts?.billing,
        }
      : {
          name: '',
          companyName: '',
          address: '',
          // Seeded from the country chosen before this step. It is an ordinary
          // default on an ordinary field: the picker below is still here, still
          // editable, and still the one place the answer lives.
          addressParts: {
            ...emptyAddressParts,
            country: chosenCountry || emptyAddressParts.country,
          },
          billingAddressParts: undefined,
          email: '',
          phone: '',
          entityType: '',
          industry: '',
          designation: '',
          billingContact: undefined,
        },
  });

  // The country drives which legal forms are offered, and it comes from the
  // address rather than a field of its own — one place to say where a client is.
  const country = useWatch({ control, name: 'addressParts.country' });
  const entityType = useController({ control, name: 'entityType' });
  const industry = useController({ control, name: 'industry' });

  /**
   * The fifty, as options. Built once: the list is a module constant, so
   * rebuilding it per render would allocate fifty objects on every keystroke in
   * any field on this step.
   */
  const industryOptions = useMemo(
    () => INDUSTRIES.map((i) => ({ value: i.key, label: i.label })),
    [],
  );
  // The whole second address is one value, present or absent, so the checkbox
  // is the field rather than a piece of state beside it. Nothing to keep in
  // step, and a draft restored from sessionStorage comes back ticked.
  const billingAddress = useController({ control, name: 'billingAddressParts' });
  // Same shape as the second address: one value, present or absent, held by the
  // field rather than by state beside it.
  const billingContact = useController({ control, name: 'billingContact' });
  /**
   * On the create path the kind chooser has just been answered, so the list is
   * narrowed to it. On a **saved** record both kinds are offered, because the
   * entity type is the only thing that says which kind this is: an Indian sole
   * proprietor entered as "a company" is never offered proprietorship (it is a
   * natural-person form), and there is no other control that could fix it.
   * Changing it here re-derives the kind, and with it the step list.
   *
   * The country filter still applies in both cases: a person is a person
   * anywhere, but they are not a form from another country's register.
   *
   * **Except while the kind is being crossed from the row above.** The row
   * above the step tracker offers the other kind on a saved record too. The
   * kind is derived from the entity type, so "make this a company" can only
   * mean "pick a company form", and the shell brings the choice here as a
   * `kind` that disagrees with the record. While it does, the list is the
   * chosen kind's forms alone and the saved form is not kept: it is the
   * wrong kind by definition, and keeping it would be keeping the mistake.
   * The record catches up on save, which is when the shell stops carrying
   * the override.
   */
  const crossing = Boolean(client) && kind !== clientKindOf(savedEntityType);
  const entityOptions = useMemo(
    () =>
      (client && !crossing
        ? entityTypesForCountry(country, savedEntityType)
        : entityTypesForClient(country, kind, crossing ? undefined : savedEntityType)
      ).map((e) => ({ value: e.value, label: e.label })),
    [client, country, crossing, kind, savedEntityType],
  );

  /**
   * A form the list no longer offers is emptied, not left holding a value the
   * reader cannot see. The list narrows when the kind or the country changes
   * in the row above, and the old answer would otherwise sit invisibly on the
   * form until the resolver refused the save. A blank field says what it
   * needs; a full field that looks blank does not.
   */
  const chosenEntityType = entityType.field.value;
  const clearEntityType = entityType.field.onChange;
  useEffect(() => {
    if (chosenEntityType && !entityOptions.some((e) => e.value === chosenEntityType)) {
      clearEntityType('');
    }
  }, [chosenEntityType, clearEntityType, entityOptions]);

  /**
   * One option is filled in, but the field still shows.
   *
   * A sole trader is the only form a foreign individual has, so nobody should
   * have to open a one-row dropdown to agree with it. It is set here instead,
   * and the resolver still checks the submitted value against what is offered,
   * so this fills the field rather than bypassing the rule.
   *
   * Hiding the field as well was a mistake and read as one: a company in a
   * country this table names no form for got no entity type control at all, so
   * the only way to learn the record said "Other" was to save it and look. The
   * whole point of the field is that the record states its own legal form.
   */
  const onlyOption = entityOptions.length === 1 ? entityOptions[0].value : null;
  useEffect(() => {
    if (onlyOption && chosenEntityType !== onlyOption) {
      setValue('entityType', onlyOption, { shouldValidate: true });
    }
  }, [chosenEntityType, onlyOption, setValue]);

  /**
   * Whether this step is describing a person, read from the field rather than
   * from the `kind` prop.
   *
   * The prop is derived from what the record *was* and only updates after a
   * save. On a saved record the entity type is editable across the kind axis, so
   * the layout has to follow the selection the moment it is made, otherwise
   * picking Sole Proprietorship on a company record still asks for a legal
   * entity name and still hides the designation. Before anything is chosen the
   * prop is the answer, which is the create path.
   */
  const individual = chosenEntityType
    ? isNaturalPerson(String(chosenEntityType))
    : kind === 'individual';

  /** A proprietorship bills under a business name; a plain individual does not. */
  const tradesUnderName = entityTypeSpec(String(chosenEntityType ?? ''))?.tradingName === true;
  // Name, optionally the legal/trading name, entity type, industry.
  const showSecondName = !individual || tradesUnderName;
  const nameColumns = (3 + (showSecondName ? 1 : 0)) as 3 | 4;

  // Restores what was typed but not saved, so a refresh or a hop to the other
  // profile comes back to the same half-filled form. Cleared on save.
  //
  // In create mode the key is `new:identity`, because there is no record yet.
  // That is exactly the case that needed this most: everywhere else an
  // interrupted step still has a row to fall back on, and this one does not.
  const key = draftKey(client?.id, 'identity');
  useFormDraft(key, watch, reset);

  /**
   * The country is answered in the row above the step tracker, and this form
   * follows it rather than asking again. Before the first save it arrives as
   * the `country` prop (the URL); after it, as `addressParts.country` on the
   * record, which `setClientCountry` writes. Either way it lands on the field
   * that has always held it, so nothing downstream learned a new shape.
   *
   * Declared after the draft restore on purpose: effects run in order, and a
   * draft that remembers the old country must lose to the row, which is the
   * one place the answer is given.
   */
  const recordCountry = client?.addressParts?.country;
  const hasRecord = Boolean(client);
  useEffect(() => {
    const next = hasRecord ? recordCountry : chosenCountry;
    if (next) setValue('addressParts.country', next);
  }, [chosenCountry, hasRecord, recordCountry, setValue]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const { designation, billingContact: billTo, ...identity } = values;
    const result = client
      ? await updateClient(client.id, identity)
      : await createClient(identity);

    if (!result.success || !result.id) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }

    /**
     * An individual's contacts, saved as a second call against the row this
     * one just wrote. Ordinary `saveClientSection`, not a new action: by here
     * the record exists, which is the only thing that call needs.
     *
     * What is stored is only what the record does not already say — the
     * designation, and a billing person if there is one. Both roles otherwise
     * point at `primary`, which `clientContact` resolves to the client
     * themselves rather than to a copy.
     */
    let contacts: ClientContacts | undefined;
    if (individual) {
      const billing = billTo ? (pruneEmpty(billTo) as ClientContacts['billing']) : undefined;
      const named = billing && Object.keys(billing).length > 0 ? billing : undefined;
      contacts = {
        ...(designation?.trim() ? { primary: { designation: designation.trim() } } : {}),
        ...(named ? { billing: named } : {}),
        roles: { signing: 'primary', ...(named ? {} : { billing: 'primary' as const }) },
      };
      const saved = await saveClientSection(result.id, 'contacts', contacts);
      if (!saved.success) {
        setServerError(saved.error ?? 'Something went wrong.');
        return;
      }
    }

    clearDraft(key);
    const now = Date.now();
    onSaved({
      ...(client ?? { createdAt: now }),
      ...identity,
      ...(contacts ? { contacts } : {}),
      id: result.id,
      updatedAt: now,
    } as ClientRecord);
  };

  return (
    <StepForm
      onSubmit={handleSubmit(onSubmit)}
      serverError={serverError}
      submitting={isSubmitting}
      submitLabel={submitLabel}
    >
      {/*
        The identity facts on one line. Entity type used to be fourteen radio
        cards at the bottom of the step — a third of the page to say one word,
        and a word that belongs beside the names it qualifies. A dropdown of
        fourteen is a dropdown; a grid of fourteen is a wall.

        **The country is not on this page.** It decides which legal forms the
        entity type is allowed to offer, so it once led this row, and before
        that it sat at the foot of the address block where the filter above it
        only worked for somebody who already knew to scroll down and set it
        first. It now lives in the row above the step tracker (`ClientAxes`),
        beside the kind, which is the other answer this page is filled in
        under: in view on every step, and the one editor for both. This form
        only *follows* it, in the effect after the draft restore.

        An individual drops the columns that do not apply rather than blanking
        them: no legal entity name (they are the entity), and no entity type
        where the country offers only one form. The row narrows to match, so
        two fields are two fields and not two fields and a gap.
      */}
      <FieldRow columns={nameColumns}>
        <Field>
          <FieldInfo
            htmlFor="client-name"
            label={individual ? 'Full name' : 'Name'}
            info={
              individual
                ? "Their own name, as it appears on their PAN. It is what documents print unless they trade under a business name."
                : "The short name, used in lists, the client picker and this page's heading. Documents print the legal entity name instead."
            }
            infoLabel={individual ? 'Whose name is this?' : 'Where is the short name used?'}
          />
          {/* Placeholders name the *kind* of value, not an example of one. A
              plausible example sitting in an empty field reads as filled in. */}
          <Input id="client-name" size="form" placeholder="Full name" {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>

        {showSecondName ? (
          <Field>
            <FieldInfo
              htmlFor="client-company-name"
              label={individual ? 'Business / trading name' : 'Legal entity name'}
              info={
                individual
                  ? 'What they invoice under, if that is not their own name. Left empty, documents print the name above.'
                  : 'What documents print. CGST Rule 46 wants the recipient’s legal name on a tax invoice, which is rarely the name anyone says out loud.'
              }
              infoLabel={
                individual ? 'What is a trading name?' : 'Why is the legal name separate?'
              }
              /* A company's legal name is required and a person's trading name
                 is not, and the same field is both. The placeholder used to
                 carry that by saying 'Optional', which named the rule instead
                 of the value. */
              optional={individual}
            />
            <Input
              id="client-company-name"
              size="form"
              placeholder={individual ? 'Trading name' : 'Registered name'}
              {...register('companyName')}
            />
            <FieldError errors={[errors.companyName]} />
          </Field>
        ) : null}

        <Field>
            <FieldInfo
              htmlFor="client-entity-type"
              label="Entity type"
              info="The legal form, which decides what identifiers apply: an Indian entity's PAN encodes its own kind, so this is what turns a shape check into a real one. The list follows the country chosen at the start of this row."
              infoLabel="Why does the entity type matter?"
            />
            {/*
              `aria-invalid` so the control is marked, not merely described.

              A combobox is picked with a click and never blurs the way an
              input does, so "Choose the entity type." can only ever arrive at
              submit, in a pile with whatever else was untouched. Without this
              the message printed underneath while the control itself looked
              untouched: no red border, and nothing for `focusFirstInvalid` in
              `flow/stepKit` to find when it goes looking for the first thing
              to fix. The error was already computed; only the marking was
              missing.
            */}
            <Combobox
              id="client-entity-type"
              size="form"
              options={entityOptions}
              value={String(entityType.field.value ?? '')}
              onValueChange={entityType.field.onChange}
              placeholder="Select…"
              aria-invalid={Boolean(errors.entityType)}
            />
            <FieldError errors={[errors.entityType]} />
        </Field>

        {/*
          What they do. Beside the entity type because the two are the same kind
          of question, asked in the same breath: what sort of thing is this, and
          what trade is it in.

          A `Combobox` rather than a select, because fifty options is a list
          somebody types at rather than scrolls. Optional, and the only field in
          this row that is: a client whose trade is nobody's business is a real
          client, where one with no name or no legal form is an unfinished
          record.
        */}
        <Field>
          <FieldInfo
            htmlFor="client-industry"
            label="Industry"
            info="What they do, from a fixed list rather than free text. It is what lets the clients list group and filter by trade; five spellings of the same industry would make that impossible. Nothing about it reaches a document."
            infoLabel="What is the industry used for?"
            optional
          />
          <Combobox
            id="client-industry"
            size="form"
            options={industryOptions}
            value={String(industry.field.value ?? '')}
            onValueChange={industry.field.onChange}
            placeholder="Select…"
          />
          <FieldError errors={[errors.industry]} />
        </Field>
      </FieldRow>

      {/* An individual's designation rides with their email and phone, because
          it describes the same person. A company's belongs to whichever contact
          holds it, which is the Contacts step. */}
      <FieldRow columns={individual ? 3 : 2}>
        <EmailField
          control={control}
          name="email"
          id="client-email"
          placeholder="example@gmail.com"
        />

        {/* Starts on the country chosen at the top of this step. Their phone
            is almost always in the country they are registered in, and
            defaulting to India meant answering that question twice. */}
        <PhoneField
          control={control}
          name="phone"
          id="client-phone"
          defaultCountry={country}
        />

        {individual ? (
          <Field>
            <FieldInfo
              htmlFor="client-designation"
              label="Designation"
              info="How they describe themselves, printed under their name in a contract's signature block. A signature works without one."
              infoLabel="Where does the designation print?"
              optional
            />
            <Input
              id="client-designation"
              size="form"
              placeholder="Proprietor, Consultant…"
              {...register('designation')}
            />
            <FieldError errors={[errors.designation]} />
          </Field>
        ) : null}
      </FieldRow>

      <FieldSeparator />

      <FieldSet>
        <LegendInfo
          info="Rule 46 wants the recipient's address on a tax invoice. The country it is in was asked at the top of this step, because the rest of the form follows from it."
          label="Why is the address required?"
        >
          Registered address
        </LegendInfo>
        <AddressFields control={control} name="addressParts" idPrefix="client" hideCountry />
        {/*
          `address` is derived from the parts, not typed — but it is what
          documents print, so a failure on it needs somewhere to surface.
        */}
        <FieldError errors={[errors.address]} />
      </FieldSet>

      {/* No separator: the billing address is a variation on the address above
          it, not a section of its own, and a rule between them read as one. */}
      <FieldSet>
        <div className="flex items-center justify-between gap-3">
          <LegendInfo
            info="Only when invoices go somewhere other than the registered office, which is usually an accounts department at another site. It changes who the invoice is addressed to and nothing else: the GST place of supply follows the client's registration, not where the invoice is posted."
            label="When is a separate billing address needed?"
          >
            Billing address
          </LegendInfo>
          <div className="flex items-center gap-2">
            <FieldLabel
              htmlFor="client-separate-billing"
              className="text-muted-foreground font-normal"
            >
              Different from the registered address
            </FieldLabel>
            <Checkbox
              id="client-separate-billing"
              checked={Boolean(billingAddress.field.value)}
              onCheckedChange={(checked) =>
                billingAddress.field.onChange(
                  // Ticking starts from the registered country, which is right
                  // far more often than blank. Unticking removes the address
                  // rather than blanking it: absent is what "same as
                  // registered" means on the record.
                  checked ? { ...emptyAddressParts, country: country ?? '' } : undefined,
                )
              }
            />
          </div>
        </div>

        {billingAddress.field.value ? (
          <AddressFields control={control} name="billingAddressParts" idPrefix="client-billing" />
        ) : null}
      </FieldSet>

      {/*
        An individual is their own contact, so there is no Contacts step and
        this is the only question it asked that the fields above do not already
        answer: does the invoice go to them, or to somebody who pays on their
        behalf — an accountant, an agency, a manager.

        Unticked stores `roles.billing = 'primary'`, which resolves to the
        person themselves. Nothing is copied, so correcting their email above
        corrects it here too.
      */}
      {individual ? (
        <FieldSet>
          <div className="flex items-center justify-between gap-3">
            <LegendInfo
              info="Invoices go to the person above unless somebody else pays on their behalf — an accountant, an agency or a manager. It changes where the invoice is sent and nothing else: it is still their supply and still their place of supply."
              label="When is a separate billing contact needed?"
            >
              Billing contact
            </LegendInfo>
            <div className="flex items-center gap-2">
              <FieldLabel
                htmlFor="client-separate-billing-contact"
                className="text-muted-foreground font-normal"
              >
                Someone else handles invoices
              </FieldLabel>
              <Checkbox
                id="client-separate-billing-contact"
                checked={Boolean(billingContact.field.value)}
                onCheckedChange={(checked) =>
                  billingContact.field.onChange(checked ? {} : undefined)
                }
              />
            </div>
          </div>

          {billingContact.field.value ? (
            <FieldRow columns={3}>
              <Field>
                <FieldLabel htmlFor="client-billing-contact-name">Name</FieldLabel>
                <Input
                  id="client-billing-contact-name"
                  size="form"
                  placeholder="Full name"
                  {...register('billingContact.name')}
                />
                <FieldError errors={[errors.billingContact?.name]} />
              </Field>

              <EmailField
                control={control}
                name="billingContact.email"
                id="client-billing-contact-email"
                placeholder="accounts@example.com"
              />

              <PhoneField
                control={control}
                name="billingContact.phone"
                id="client-billing-contact-phone"
                defaultCountry={country}
              />
            </FieldRow>
          ) : null}
        </FieldSet>
      ) : null}
    </StepForm>
  );
}
