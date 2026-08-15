'use client';

import '@/lib/zod-config';
import { useForm, useWatch, type Control, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import FieldInfo, { LegendInfo } from '@/components/form/FieldInfo';
import {
  clientContactsSchema,
  MIRRORABLE_CONTACTS,
  type ClientContacts,
  type MirroredContactKey,
} from '@/lib/domain/client';
import { draftKey, useFormDraft } from '@/lib/draft';
import { StepForm, pruneEmpty, useStepSave, type StepProps } from './stepKit';

type FormValues = ClientContacts;

type ContactKey = 'primary' | MirroredContactKey;

/**
 * Contacts — four roles and an inbox.
 *
 * They are separated because they behave differently, not to pad the form. The
 * billing contact is usually not the primary one, and an invoice sent to the
 * wrong person is the most ordinary cause of a late payment. The signing
 * authority is a different thing again: it is whose name and designation go in
 * a contract's signature block.
 *
 * **"Same as primary" stores a flag, not a copy.** At most clients one person
 * is all four. Copying their details into three more groups means correcting a
 * changed email in four places and missing the fourth; the mirror is recorded
 * and `resolveContact` performs it on read, so there is exactly one set of
 * details and everything downstream — including the contract's signatory —
 * follows automatically. `PRINCIPLES.md` rule 3, applied to a form field.
 *
 * Every field is optional. A client with only a primary contact is a normal
 * client, and a form that refuses to save until an escalation contact exists
 * is a form people work around.
 *
 * Phone is a plain input here rather than `PhoneField`: these are the client's
 * own staff, often overseas, and forcing E.164 through the Indian-mobile rule
 * would reject a perfectly good foreign number. The record's *own* phone, on
 * the identity step, keeps the strict treatment.
 */
export default function ContactsStep({ client, onSaved, submitLabel }: StepProps) {
  const {
    register,
    control,
    setValue,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // Errors land when a field is left, not only at submit. Seven steps of
    // silence followed by one page of red is a worse trade than being told
    // where you are as you go.
    mode: 'onBlur',
    resolver: zodResolver(clientContactsSchema),
    defaultValues: {
      primary: blankContact(client?.contacts?.primary),
      billing: blankContact(client?.contacts?.billing),
      signing: blankContact(client?.contacts?.signing),
      escalation: blankContact(client?.contacts?.escalation),
      invoiceEmail: client?.contacts?.invoiceEmail ?? '',
      sameAsPrimary: client?.contacts?.sameAsPrimary ?? [],
    },
  });

  /**
   * A mirrored role stores nothing of its own — the flag is the record.
   *
   * `pruneEmpty` would keep whatever was typed into the group before the box
   * was ticked, and that stale copy is exactly what the mirror exists to avoid:
   * the day the primary contact's email changes, the untouched copy underneath
   * would still be there to be read by mistake.
   */
  const toPayload = (values: FormValues): FormValues => {
    const mirrored = values.sameAsPrimary ?? [];
    const cleaned = { ...values };
    for (const key of mirrored) delete cleaned[key];
    // `pruneEmpty` passes arrays through, so an empty one has to go by hand —
    // storing `sameAsPrimary: []` would make the section look filled in.
    delete cleaned.sameAsPrimary;
    const pruned = pruneEmpty(cleaned);
    return mirrored.length ? { ...pruned, sameAsPrimary: mirrored } : pruned;
  };

  // Restores what was typed but not saved, so a refresh or a hop to the other
  // profile comes back to the same half-filled form. Cleared on save.
  useFormDraft(draftKey(client?.id, 'contacts'), watch, reset);

  const { serverError, save } = useStepSave<FormValues>(client, 'contacts', onSaved, toPayload);

  return (
    <StepForm
      onSubmit={handleSubmit(save)}
      serverError={serverError}
      submitting={isSubmitting}
      submitLabel={submitLabel}
    >
      <ContactGroup
        name="primary"
        legend="Primary contact"
        info="Who the work is discussed with day to day. The three roles below can point at this person instead of repeating them."
        register={register}
        errors={errors}
        control={control}
        setValue={setValue}
      />

      <FieldSeparator />

      <ContactGroup
        name="billing"
        legend="Accounts / billing contact"
        info="The person on their side who receives the invoice and puts it through for payment — usually someone in their accounts payable, not the person the work is discussed with. An invoice sent to the wrong one is the most ordinary cause of a late payment."
        register={register}
        errors={errors}
        control={control}
        setValue={setValue}
      />

      <FieldSeparator />

      <ContactGroup
        name="signing"
        legend="Signing authority"
        info="Whose name and designation print in a contract's signature block. Left blank, the contract prints an empty rule."
        register={register}
        errors={errors}
        control={control}
        setValue={setValue}
      />

      <FieldSeparator />

      <ContactGroup
        name="escalation"
        legend="Escalation contact"
        info="Who to reach when the usual route has stopped answering."
        register={register}
        errors={errors}
        control={control}
        setValue={setValue}
      />

      <FieldSeparator />

      <Field>
        <FieldInfo
          htmlFor="client-invoice-email"
          label="Invoice delivery email"
          info="Often a shared inbox rather than a person — accounts payable, a ticketing address, or a portal's intake address. Kept separate from the billing contact because the two are frequently different."
          infoLabel="Why is this separate from the billing contact?"
        />
        <Input
          id="client-invoice-email"
          size="form"
          type="email"
          placeholder="accounts@clayora.com"
          {...register('invoiceEmail')}
        />
        <FieldError errors={[errors.invoiceEmail]} />
      </Field>
    </StepForm>
  );
}

function blankContact(contact: ClientContacts[ContactKey] | undefined) {
  return {
    name: contact?.name ?? '',
    designation: contact?.designation ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
  };
}

const PLACEHOLDERS: Record<ContactKey, { name: string; designation: string; email: string }> = {
  primary: { name: 'Anaya Rao', designation: 'Founder', email: 'anaya@clayora.com' },
  billing: { name: 'Rahul Menon', designation: 'Accounts Payable', email: 'ap@clayora.com' },
  signing: { name: 'Anaya Rao', designation: 'Director', email: 'anaya@clayora.com' },
  escalation: { name: 'Priya Nair', designation: 'Operations Head', email: 'priya@clayora.com' },
};

function ContactGroup({
  name,
  legend,
  info,
  register,
  errors,
  control,
  setValue,
}: {
  name: ContactKey;
  legend: string;
  info: string;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}) {
  const group = errors[name];
  const mirrorable = (MIRRORABLE_CONTACTS as readonly string[]).includes(name);
  const mirrored = useWatch({ control, name: 'sameAsPrimary' }) ?? [];
  /**
   * The four leaves, not `name: 'primary'`.
   *
   * Watching the group returns the *same object reference* each render — RHF
   * mutates it in place — so React saw no change and the mirrored fields stayed
   * blank while the primary contact was being typed. An array of paths returns
   * a fresh array, which is what makes the mirror live.
   */
  const [pName, pDesignation, pEmail, pPhone] = useWatch({
    control,
    name: ['primary.name', 'primary.designation', 'primary.email', 'primary.phone'],
  });
  const isMirrored = mirrorable && mirrored.includes(name as MirroredContactKey);
  const hint = PLACEHOLDERS[name];

  /**
   * A live mirror, so the fields *show* the primary contact while ticked and
   * go read-only rather than disabled — a disabled input is skipped by screen
   * readers, and someone checking who signs the contract should still be able
   * to read the answer.
   */
  const shown = isMirrored
    ? { name: pName, designation: pDesignation, email: pEmail, phone: pPhone }
    : undefined;

  const toggle = (checked: boolean) => {
    const next = checked
      ? [...mirrored, name as MirroredContactKey]
      : mirrored.filter((k) => k !== name);
    setValue('sameAsPrimary', next, { shouldDirty: true });
  };

  return (
    <FieldSet>
      <div className="flex items-center justify-between gap-3">
        <LegendInfo info={info} label={`About the ${legend.toLowerCase()}`}>
          {legend}
        </LegendInfo>

        {mirrorable ? (
          <div className="flex items-center gap-2">
            <FieldLabel htmlFor={`${name}-same`} className="text-muted-foreground font-normal">
              Same as primary
            </FieldLabel>
            <Checkbox
              id={`${name}-same`}
              checked={isMirrored}
              onCheckedChange={(checked) => toggle(Boolean(checked))}
            />
          </div>
        ) : null}
      </div>

      <FieldRow>
        <ContactInput
          id={`${name}-name`}
          label="Name"
          placeholder={hint.name}
          mirrored={isMirrored}
          mirroredValue={shown?.name}
          field={register(`${name}.name`)}
          error={group?.name}
        />
        <ContactInput
          id={`${name}-designation`}
          label="Designation"
          placeholder={hint.designation}
          mirrored={isMirrored}
          mirroredValue={shown?.designation}
          field={register(`${name}.designation`)}
          error={group?.designation}
        />
      </FieldRow>

      <FieldRow>
        <ContactInput
          id={`${name}-email`}
          label="Email"
          type="email"
          placeholder={hint.email}
          mirrored={isMirrored}
          mirroredValue={shown?.email}
          field={register(`${name}.email`)}
          error={group?.email}
        />
        <ContactInput
          id={`${name}-phone`}
          label="Phone"
          type="tel"
          placeholder="+91 98765 43210"
          mirrored={isMirrored}
          mirroredValue={shown?.phone}
          field={register(`${name}.phone`)}
          error={group?.phone}
        />
      </FieldRow>
    </FieldSet>
  );
}

/**
 * One field of a contact, in one of two entirely separate states.
 *
 * **The mirrored input is not the registered one.** Handing react-hook-form's
 * `register()` a `value` prop as well switches the input from uncontrolled to
 * controlled mid-life, which React declines to apply — the field stayed
 * stubbornly blank while showing `readonly`. So a mirrored field renders as a
 * plain read-only input with no registration at all, which is also the honest
 * description of it: it is a *view of the primary contact*, not an input.
 *
 * Read-only rather than disabled, because a disabled input is skipped by screen
 * readers and who signs the contract is worth being able to read.
 */
function ContactInput({
  id,
  label,
  type,
  placeholder,
  mirrored,
  mirroredValue,
  field,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  mirrored: boolean;
  mirroredValue?: string;
  field: ReturnType<UseFormRegister<FormValues>>;
  error?: { message?: string };
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {/*
        The `key` is load-bearing. Without it React keeps the same DOM node
        across the branch, and an input that begins life uncontrolled will not
        start honouring a `value` prop later — the field showed `readonly` and
        stayed stubbornly blank. Two keys, two elements, each controlled or not
        for its whole life.
      */}
      {mirrored ? (
        <Input
          key="mirrored"
          id={id}
          size="form"
          type={type}
          readOnly
          aria-readonly
          className="text-muted-foreground"
          value={mirroredValue ?? ''}
          onChange={() => {}}
        />
      ) : (
        <Input
          key="editable"
          id={id}
          size="form"
          type={type}
          placeholder={placeholder}
          {...field}
        />
      )}
      <FieldError errors={[error]} />
    </Field>
  );
}
