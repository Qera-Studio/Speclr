"use client";

import "@/lib/zod-config";
import {
  useForm,
  useWatch,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  FieldErrors,
  UseFormClearErrors,
  UseFormSetValue,
} from "react-hook-form";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { FieldRow } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { LegendInfo } from "@/components/form/FieldInfo";
import PhoneField from "@/components/form/PhoneField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clientContactsSchema,
  type ClientContacts,
  type ContactSource,
  type MirroredContactKey,
} from "@/lib/domain/client";
import { draftKey, useFormDraft } from "@/lib/draft";
import { StepForm, pruneEmpty, useStepSave, type StepProps } from "./stepKit";

type FormValues = ClientContacts;

type ContactKey = "primary" | MirroredContactKey;

/**
 * The Select's value for "this role names its own person".
 *
 * A `<Select>` needs a string for every choice, and the record's way of saying
 * this is the *absence* of a key. The sentinel lives only in the form; it is
 * turned back into an absent key before anything is stored.
 */
const OWN = "own";

/**
 * Contacts: three roles, because three are read.
 *
 * They are separated because they behave differently, not to pad the form. The
 * billing contact is usually not the primary one, and an invoice sent to the
 * wrong person is the most ordinary cause of a late payment. The signing
 * authority is a different thing again: it is whose name and designation go in
 * a contract's signature block.
 *
 * An escalation contact and a separate invoice-delivery inbox were asked for
 * here too, and were cut: nothing in the codebase read either one, speclr sends
 * no mail at all, and the billing contact's email takes `accounts@` as happily
 * as a person's address. A field nobody reads is a field nobody maintains.
 *
 * **"Same as primary" stores a flag, not a copy.** At most clients one person
 * is all three. Copying their details into two more groups means correcting a
 * changed email in three places and missing the third; the mirror is recorded
 * and `resolveContact` performs it on read, so there is exactly one set of
 * details and everything downstream, including the contract's signatory,
 * follows automatically. `PRINCIPLES.md` rule 3, applied to a form field.
 *
 * Every field is optional. A client with only a primary contact is a normal
 * client, and a form that refuses to save until every role is named is a form
 * people work around.
 *
 * Phone is `PhoneField`, the same one the identity step uses. These are the
 * client's own staff and they are not all in one country, so the country is
 * picked rather than remembered: the field validates against *that* country's
 * rule, not India's, and stores E.164.
 */
export default function ContactsStep({
  client,
  onSaved,
  submitLabel,
}: StepProps) {
  const {
    register,
    control,
    setValue,
    clearErrors,
    watch,
    reset,
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
    mode: "onTouched",
    resolver: zodResolver(clientContactsSchema),
    defaultValues: {
      primary: blankContact(client?.contacts?.primary),
      billing: blankContact(client?.contacts?.billing),
      signing: blankContact(client?.contacts?.signing),
      // `client.contacts && (… ?? {})`, not `client?.contacts?.roles ?? …`: on a
      // section somebody has already saved, an absent `roles` means both roles
      // name their own person, and falling back to the defaults there would
      // quietly discard the contacts they typed.
      roles: client?.contacts ? (client.contacts.roles ?? {}) : DEFAULT_ROLES,
    },
  });

  /**
   * A role that points elsewhere stores nothing of its own: the choice is the
   * record.
   *
   * `pruneEmpty` would keep whatever was typed into the group before the choice
   * changed, and that stale copy is exactly what this exists to avoid: the day
   * the primary contact's email changes, the untouched copy underneath would
   * still be there to be read by mistake.
   */
  const toPayload = (values: FormValues): FormValues => {
    const roles = values.roles ?? {};
    const cleaned = { ...values };
    for (const key of MIRRORABLE_CONTACTS) if (roles[key]) delete cleaned[key];
    // `pruneEmpty` recurses, so `roles` has to be carried by hand: it is a map
    // of choices rather than typed-in text, and an omitted key means something
    // different from an empty one.
    delete cleaned.roles;
    const pruned = pruneEmpty(cleaned);
    return Object.keys(roles).length > 0 ? { ...pruned, roles } : pruned;
  };

  // Restores what was typed but not saved, so a refresh or a hop to the other
  // profile comes back to the same half-filled form. Cleared on save.
  useFormDraft(draftKey(client?.id, "contacts"), watch, reset);

  const { serverError, save } = useStepSave<FormValues>(
    client,
    "contacts",
    onSaved,
    toPayload,
  );

  // The name the invoice would actually carry, so the choice reads as a fact
  // about this client rather than a generic "the company itself". Documents
  // print `companyName || name`, and this follows them.
  const companyLabel =
    client?.companyName?.trim() || client?.name?.trim() || "The company itself";

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
        info="Who the work is discussed with day to day. The two roles below can point at this person instead of repeating them."
        register={register}
        errors={errors}
        control={control}
        setValue={setValue}
        clearErrors={clearErrors}
      />

      <FieldSeparator />

      <ContactGroup
        name="billing"
        legend="Accounts / billing contact"
        info="Where the invoice goes: usually someone in their accounts payable rather than the person the work is discussed with, and an invoice sent to the wrong one is the most ordinary cause of a late payment. A shared inbox (accounts@, or a portal's intake address) is a perfectly good answer, with the name left blank."
        companyLabel={companyLabel}
        register={register}
        errors={errors}
        control={control}
        setValue={setValue}
        clearErrors={clearErrors}
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
        clearErrors={clearErrors}
      />
    </StepForm>
  );
}

/** The roles that point somewhere else rather than naming their own person. */
const MIRRORABLE_CONTACTS = ["billing", "signing"] as const;

/**
 * What each role does before anyone chooses.
 *
 * Billing is the company: an invoice is addressed to the entity, and naming a
 * person is the exception rather than the rule. Signing is the primary contact,
 * because a contract is signed by a human and the person the work is discussed
 * with is usually the one who signs it. Both are also the safe answers: a
 * forgotten signing role prints an empty rule where a name belongs.
 *
 * Applied only to a section nobody has saved. Once `contacts` exists, whatever
 * is in `roles` is a decision someone made.
 */
const DEFAULT_ROLES: ClientContacts["roles"] = {
  billing: "company",
  signing: "primary",
};

/** What each role can point at, in the order the choices are offered. */
const ROLE_OPTIONS: Record<
  MirroredContactKey,
  { value: string; label: string }[]
> = {
  billing: [
    { value: "company", label: "The company itself" },
    { value: "primary", label: "Same as primary" },
    { value: OWN, label: "Someone else" },
  ],
  signing: [
    { value: "primary", label: "Same as primary" },
    { value: OWN, label: "Someone else" },
  ],
};

function blankContact(contact: ClientContacts[ContactKey] | undefined) {
  return {
    name: contact?.name ?? "",
    designation: contact?.designation ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
  };
}

const PLACEHOLDERS: Record<
  ContactKey,
  { name: string; designation: string; email: string }
> = {
  primary: {
    name: "Anaya Rao",
    designation: "Founder",
    email: "anaya@clayora.com",
  },
  billing: {
    name: "Rahul Menon",
    designation: "Accounts Payable",
    email: "ap@clayora.com",
  },
  signing: {
    name: "Anaya Rao",
    designation: "Director",
    email: "anaya@clayora.com",
  },
};

function ContactGroup({
  name,
  legend,
  info,
  companyLabel,
  register,
  errors,
  control,
  setValue,
  clearErrors,
}: {
  name: ContactKey;
  legend: string;
  info: string;
  /** Only the billing role can point at the company, so only it passes one. */
  companyLabel?: string;
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  clearErrors: UseFormClearErrors<FormValues>;
}) {
  const group = errors[name];
  const mirrorable = (MIRRORABLE_CONTACTS as readonly string[]).includes(name);
  const roles = useWatch({ control, name: "roles" }) ?? {};
  /**
   * The leaves, not `name: 'primary'`.
   *
   * Watching the group returns the *same object reference* each render, since
   * RHF mutates it in place, so React saw no change and the summary below stayed
   * stale while the primary contact was being typed. An array of paths returns
   * a fresh array, which is what makes the mirror live.
   */
  const [pName, pDesignation, pEmail, pPhone] = useWatch({
    control,
    name: [
      "primary.name",
      "primary.designation",
      "primary.email",
      "primary.phone",
    ],
  });
  const source = mirrorable ? (roles[name as MirroredContactKey] ?? OWN) : OWN;
  const namesItsOwn = source === OWN;
  const hint = PLACEHOLDERS[name];
  const options = mirrorable
    ? ROLE_OPTIONS[name as MirroredContactKey].map((option) =>
        option.value === "company" && companyLabel
          ? { ...option, label: companyLabel }
          : option,
      )
    : [];

  /**
   * Choosing anything but "someone else" empties the group as well.
   *
   * `toPayload` already discards the details of a role that points elsewhere,
   * so nothing is lost that would have been stored. What the emptying prevents
   * is a save blocked by a field nobody can see: the resolver validates the
   * whole object, so a half-typed email left behind under a collapsed section
   * would fail silently with no input on screen to point at.
   */
  const choose = (value: string) => {
    const key = name as MirroredContactKey;
    const next = { ...roles };
    // Written per key rather than through one index, because the two are not
    // the same type: signing can only ever point at the primary contact.
    if (value === OWN) delete next[key];
    else if (key === "signing") next.signing = "primary";
    else next.billing = value as ContactSource;
    setValue("roles", next, { shouldDirty: true });
    if (value !== OWN) {
      setValue(key, blankContact(undefined), { shouldDirty: true });
      clearErrors(name);
    }
  };

  return (
    <FieldSet>
      <div className="flex items-center justify-between gap-3">
        <LegendInfo info={info} label={`About the ${legend.toLowerCase()}`}>
          {legend}
        </LegendInfo>

        {mirrorable ? (
          <div className="flex items-center gap-2">
            <FieldLabel
              htmlFor={`${name}-source`}
              className="text-muted-foreground font-normal"
            >
              Address it to
            </FieldLabel>
            <Select
              value={source}
              onValueChange={(value) => choose(value ?? OWN)}
            >
              <SelectTrigger id={`${name}-source`} size="form" className="w-56">
                {/*
                  The label, not the value. `SelectValue` renders what is stored
                  when it is given nothing else, and the trigger would read
                  "company" rather than "The company itself".
                */}
                <SelectValue>
                  {options.find((o) => o.value === source)?.label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent size="form">
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {!namesItsOwn ? (
        <RoleSummary
          role={name as MirroredContactKey}
          source={source as ContactSource}
          parts={[pName, pDesignation, pEmail, pPhone]}
        />
      ) : (
        <>
          <FieldRow>
            <ContactInput
              id={`${name}-name`}
              label="Name"
              placeholder={hint.name}
              field={register(`${name}.name`)}
              error={group?.name}
            />
            <ContactInput
              id={`${name}-designation`}
              label="Designation"
              placeholder={hint.designation}
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
              field={register(`${name}.email`)}
              error={group?.email}
            />
            {/*
              The same field the identity step uses, country selector included:
              a client's staff are not all in one country, and a bare box makes
              the operator remember to type the code. `required={false}` because
              every contact field here is optional.
            */}
            <PhoneField
              control={control}
              name={`${name}.phone`}
              id={`${name}-phone`}
              required={false}
            />
          </FieldRow>
        </>
      )}
    </FieldSet>
  );
}

/**
 * Where a role points, in place of the four fields it replaces.
 *
 * The fields collapse rather than going read-only: a role pointing elsewhere
 * has nothing of its own to show, so four boxes repeating the section above
 * them are four more things to read and one more place someone might try to
 * type. The line stays live as the primary contact is filled in, so the choice
 * is never a leap of faith about whose name ends up on the contract.
 *
 * The billing line says what the invoice will *say*, not what the record holds,
 * because that is the question being answered. Naming a person there does not
 * change who is billed, only that the invoice is marked for their attention.
 */
function RoleSummary({
  role,
  source,
  parts,
}: {
  role: MirroredContactKey;
  source: ContactSource;
  parts: (string | undefined)[];
}) {
  // The choice beside it already names the company. A line repeating it back is
  // one more thing to read that says nothing new.
  if (role === "billing" && source === "company") return null;

  const filled = parts.map((p) => p?.trim()).filter(Boolean);
  // Nothing typed above yet, so there is nothing to report. A line saying so
  // would only restate the choice beside it.
  if (filled.length === 0) return null;

  return (
    <p className="text-muted-foreground text-sm">
      {role === 'billing' ? `Marked for the attention of ${filled[0]}.` : filled.join(' · ')}
    </p>
  );
}

/** One field of a contact. */
function ContactInput({
  id,
  label,
  type,
  placeholder,
  field,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder: string;
  field: ReturnType<UseFormRegister<FormValues>>;
  error?: { message?: string };
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        size="form"
        type={type}
        placeholder={placeholder}
        {...field}
      />
      <FieldError errors={[error]} />
    </Field>
  );
}
