/**
 * One rule per named field, written once.
 *
 * The validators in `taxIds/` were already shared. `PAN_RE`, `gstinError`,
 * `cinError`, `tanError` each exist in exactly one place. What was *not* shared
 * is everything wrapped around them: the zod fragment, the message, the maximum
 * length, and whether a blank is allowed. Those were re-typed at every schema,
 * and they had drifted:
 *
 *  - PAN's rule was written three times, with two different messages, and only
 *    one of the three capped the length.
 *  - Email was written seven times, three different messages.
 *  - **Qera's own GSTIN and CIN were not validated at all** (`studioInputSchema`
 *    had `z.string().min(1).max(20)`), so the mod-36 check that guards a
 *    client's GSTIN never applied to the one printed on every invoice we issue.
 *
 * That last one is why this file exists rather than a note in a docstring. A
 * rule that has to be remembered at each call site is a rule that eventually
 * is not.
 *
 * **Each builder returns a bare string schema, blank-tolerant by default.**
 * Callers append `.optional()` where their record wants it, and pass
 * `required` where a blank is a failure. Required-ness is a property of the
 * form, not of the identifier: a client's PAN may be unknown for weeks, and
 * the studio's may not.
 *
 * The matching *inputs* are in `components/form/fields.tsx`, named to match.
 * Rules here (server and client), chrome there (client only).
 *
 * Client-safe: pure zod, no framework imports, so the wizard's resolvers and
 * the Server Actions share one definition and can never disagree.
 */

import { z } from 'zod';
import { IFSC_RE } from './bank';
import { isStoredPhone } from './phone';
import { cinError, gstinError, PAN_RE, panHolderTypeError, tanError } from './taxIds/india';
import { sanitizeText } from './text';

interface FieldOptions {
  /** Message to show when the value is blank. Omit to allow blank. */
  required?: string;
}

/**
 * The shape every identifier here shares: trimmed, length-capped, blank means
 * "not filled in yet", and anything else is handed to the validator that owns
 * the rule.
 *
 * `superRefine` rather than `.refine`, so the validator's **own** message
 * survives. The schemas this replaces collapsed every failure into one generic
 * line: a GSTIN with a transposed pair of characters reported "This GSTIN is
 * not valid" when the validator had already worked out that it was the check
 * character, which is the difference between a reader fixing it and a reader
 * retyping the same thing.
 *
 * `sanitizeText` first, and it earns its place here rather than only on free
 * text: these values are routinely copied out of a PDF certificate or an SMS,
 * which is where a soft hyphen or a zero-width space comes from. Without it a
 * GSTIN that reads as correct fails its format check, and the message sends the
 * reader to retype fifteen characters that were already right.
 */
function identifier(options: {
  max: number;
  /** Why this non-blank value is wrong, or null. */
  error: (value: string) => string | null;
  required?: string;
}) {
  return z
    .string()
    .transform((value) => sanitizeText(value))
    .pipe(
      z
        .string()
        .max(options.max)
        .superRefine((value, ctx) => {
          if (!value) {
            if (options.required) ctx.addIssue({ code: 'custom', message: options.required });
            return;
          }
          const message = options.error(value);
          if (message) ctx.addIssue({ code: 'custom', message });
        }),
    );
}

// ─── Email ────────────────────────────────────────────────────────────────────

export const EMAIL_MAX = 200;

/**
 * `z.email()` and not a regex of our own.
 *
 * Zod 4's is the WHATWG-aligned one, which is stricter than the RFC and looser
 * than the "one dot after the @" pattern people reach for. Neither extreme is
 * right: an address is only truly valid if mail to it is delivered, and every
 * hand-written pattern in this codebase's history rejected somebody real.
 */
export function emailSchema({ required }: FieldOptions = {}) {
  return identifier({
    max: EMAIL_MAX,
    error: (value) => (z.email().safeParse(value).success ? null : 'Enter a valid email.'),
    required,
  });
}

// ─── PAN ──────────────────────────────────────────────────────────────────────

export const PAN_MAX = 10;

/**
 * `holder` is the set of holder-type characters the 4th position may hold.
 *
 * Defaults to `['P']`, an individual, which is every employee. A **client**
 * passes `[]`, because its expected kind comes from the entity type on the
 * record, which this form cannot see, so the check runs in
 * `clientTaxCrossErrors` where the whole record is in hand. Passing `[]` means
 * "structure only" and is deliberate rather than an omission.
 */
export function panSchema({
  holder = ['P'],
  required,
}: FieldOptions & { holder?: readonly string[] } = {}) {
  return identifier({
    max: PAN_MAX,
    error: (value) => {
      const pan = value.toUpperCase();
      if (!PAN_RE.test(pan)) return 'Expected a PAN like AABCQ2864Q.';
      return holder.length ? panHolderTypeError(pan, holder) : null;
    },
    required,
  });
}

// ─── GSTIN ────────────────────────────────────────────────────────────────────

/** 15 characters. The cap is loose so a pasted value with stray spaces still
 *  reaches the validator, which produces a better message than a length error. */
export const GSTIN_MAX = 20;

/**
 * Structure, state-code membership and the mod-36 check character.
 *
 * The two *cross-record* checks (the GSTIN against the address state, and its
 * embedded PAN against the PAN on the record) are not here, for the same
 * reason PAN's holder type is not: they need facts from outside this field.
 * `clientTaxCrossErrors` runs them with the whole record in hand.
 */
export function gstinSchema({ required }: FieldOptions = {}) {
  return identifier({ max: GSTIN_MAX, error: (value) => gstinError(value), required });
}

// ─── TAN ──────────────────────────────────────────────────────────────────────

export const TAN_MAX = 10;

export function tanSchema({ required }: FieldOptions = {}) {
  return identifier({ max: TAN_MAX, error: tanError, required });
}

// ─── SAC ──────────────────────────────────────────────────────────────────────

export const SAC_MAX = 6;

/**
 * A Service Accounting Code — the GST classification of a thing sold.
 *
 * Six digits, and the first two are always `99`: SACs live in Chapter 99 of the
 * scheme, which is the services chapter, and a code that does not start there is
 * a *goods* HSN typed into the wrong field. That is the one mistake worth
 * catching, and it is caught by the two characters rather than by a table.
 *
 * **Deliberately not checked against the published list.** The list is long,
 * revised by notification, and a rule that rejects a code CBIC issued last
 * quarter blocks a real invoice, which `AGENTS.md` puts as the worse failure.
 * The shape is checked; the classification is a judgement, and it belongs to
 * whoever signs the return.
 */
export function sacSchema({ required }: FieldOptions = {}) {
  return identifier({
    max: SAC_MAX,
    error: (value) =>
      /^99\d{4}$/.test(value)
        ? null
        : 'Expected a six-digit SAC beginning 99, like 998314.',
    required,
  });
}

// ─── Bank ─────────────────────────────────────────────────────────────────────

export const IFSC_MAX = 11;

/**
 * `IFSC_RE` was shared; this wrapper was not, and the two copies had already
 * diverged on blank-tolerance — the employee's allowed an empty string, the
 * studio's did not, with the same message on both. Exactly the drift this file
 * exists to end.
 */
export function ifscSchema({ required }: FieldOptions = {}) {
  return identifier({
    max: IFSC_MAX,
    error: (value) =>
      IFSC_RE.test(value.toUpperCase()) ? null : 'Expected an IFSC like KKBK0000677.',
    required,
  });
}

/**
 * A UPI handle: `name@bank`, per the NPCI addressing spec.
 *
 * Had no rule at all — `z.string().max(120)` on the studio's, which is the
 * handle printed on every invoice for a client to pay into. A typo there is not
 * a validation nicety: the money goes somewhere else, or nowhere.
 *
 * The local part allows the dot, hyphen and underscore banks actually issue;
 * the handle after the `@` is letters only, which is what every PSP uses.
 */
const UPI_RE = /^[A-Z0-9][A-Z0-9.\-_]{0,80}@[A-Z]{2,64}$/;

export function upiSchema(max = 120, { required }: FieldOptions = {}) {
  return identifier({
    max,
    error: (value) =>
      UPI_RE.test(value.toUpperCase()) ? null : 'Expected a UPI ID like qera@okhdfcbank.',
    required,
  });
}

// ─── Phone ────────────────────────────────────────────────────────────────────

/** E.164 caps at 15 digits; the cap is loose so a pasted value still reaches
 *  the validator, which explains itself better than a length error. */
export const PHONE_MAX = 30;

/**
 * The stored E.164 value, checked against libphonenumber's plan for its country.
 *
 * This rule existed only in `PhoneField` — the schemas behind every phone in
 * the app were `z.string().max(30)`, so the number printed on an invoice was
 * whatever reached the action. `IfscField` and `PhoneField` were the pattern
 * this whole file generalises; the phone *rule* is the half that never made the
 * trip across the wire.
 */
export function phoneSchema({ required }: FieldOptions = {}) {
  return identifier({
    max: PHONE_MAX,
    error: (value) =>
      isStoredPhone(value) ? null : 'Enter a valid phone number, including the country code.',
    required,
  });
}

// ─── CIN ──────────────────────────────────────────────────────────────────────

export const CIN_MAX = 21;

/**
 * Structure, the MCA ownership triple and a plausible year of incorporation.
 *
 * The ROC state pair is deliberately not checked — `cinError` says why. What a
 * CIN *is* cross-checked against is the entity type, in `cinEntityTypeError`,
 * which runs where the whole record is in hand.
 */
export function cinSchema({ required }: FieldOptions = {}) {
  return identifier({ max: CIN_MAX, error: cinError, required });
}
