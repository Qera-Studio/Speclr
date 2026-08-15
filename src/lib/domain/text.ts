/**
 * What a text field accepts, written once.
 *
 * `fields.ts` owns the *named identifiers* (PAN, GSTIN, email). This owns
 * everything else: the ordinary name, address line, description and note that
 * make up most of a document. Those were all `z.string().trim().max(n)` (length
 * and presence, nothing about content) which is how a person's name came to
 * accept a digit and a run of invisible control characters.
 *
 * ## What this is not
 *
 * It is **not** what stops SQL injection or XSS, and treating it as such would
 * be the dangerous reading. Both are already structurally impossible here:
 * Drizzle parameterises every query (there is no string-built SQL anywhere in
 * `src/db/`) and React escapes every interpolation (no raw-HTML escape hatch is
 * used anywhere in `src/`). A `<script>` typed into a field is stored as those
 * characters and printed as those characters. **Validation is the second lock,
 * never the first** — if it were the only thing between an input and the
 * database, the architecture would already be wrong.
 *
 * What this owns is the layer above that: whether what reaches a legal document
 * is *the thing someone meant to type*.
 *
 * ## The three jobs
 *
 * **1. Remove what cannot be seen.** This is the one with teeth. A right-to-left
 * override (U+202E) reorders how the rest of a line *renders* without changing
 * a byte of what is stored, so an invoice can display one payee and hold
 * another (Trojan Source, CVE-2021-42574). A zero-width space makes two
 * identical client names into two different clients. A soft hyphen survives a
 * copy out of a PDF and breaks the GSTIN it was pasted into. None of these are
 * visible in an input, so none of them can be found by the person who has to
 * fix them, which is exactly why they are stripped rather than rejected:
 * removing a character nobody can see changes nothing anybody meant.
 *
 * **2. Settle on one spelling.** NFC, plus real spaces for the sixteen
 * characters that merely look like one. "José" typed on a Mac and "José" pasted
 * from Windows are different byte strings; without this the second one is a
 * second client and neither search finds the other.
 *
 * **3. Refuse what is visibly wrong.** A digit in a person's name, an angle
 * bracket in a company's. These *are* rejected, with the offending character
 * named, because they are visible and therefore fixable.
 *
 * The split is the rule: **invisible is stripped, visible is refused.** Silently
 * editing something the reader can see would be worse than either.
 *
 * ## Where the line sits on free text
 *
 * `textSchema` and `multilineSchema` are sanitised but keep every visible
 * character, including `<`. That is deliberate. They back notes, terms clauses
 * and letter paragraphs, where "amounts < ₹5,000" is ordinary and legitimate,
 * and where blocking a bracket would buy nothing: React escapes it on the way
 * to the screen and to print. Narrow the character set where the field has a
 * known shape (a name, an entity) and leave prose alone.
 */

import { z } from 'zod';

// ─── Sanitising ───────────────────────────────────────────────────────────────

/**
 * Bidi controls and invisible formatting: the ones with a security story.
 *
 * U+202A–U+202E and U+2066–U+2069 are the Trojan Source pair (embeddings and
 * isolates). They change the *visual* order of a rendered line while leaving
 * the stored bytes alone, which on a printed invoice means the payee shown is
 * not the payee recorded. U+200E/U+200F/U+061C are their single-character
 * cousins. The rest (soft hyphen, BOM, zero-width space, word joiner) are
 * invisible passengers picked up from PDFs and spreadsheets.
 *
 * **U+200C and U+200D are deliberately absent from this list.** ZWNJ and ZWJ
 * are load-bearing in Devanagari and every other Indic script, so stripping
 * them would corrupt a name written in Hindi. They carry no bidi behaviour, so
 * they are not the problem the rest of this list is.
 */
const INVISIBLE =
  /[\u00AD\u061C\u180E\u200B\u200E\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** C0 controls except tab and newline, DEL, and the C1 block. */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/** The characters that render as a space and do not compare as one. */
const ODD_SPACE = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

/** Line and paragraph separators: real breaks that also break a JS string literal. */
const ODD_BREAK = /[\u2028\u2029]/g;

/**
 * The canonical form of a value: what gets stored, searched and printed.
 *
 * Runs before every rule below, and before the identifier rules in `fields.ts`,
 * so a validator never has to reason about a character the reader cannot see.
 * Exported because the *inputs* normalise identically on change: a value that
 * only becomes canonical on submit is one the tick beside the field can
 * disagree with.
 */
export function sanitizeText(value: string, { multiline = false } = {}): string {
  const base = value
    .normalize('NFC')
    .replace(CONTROL, '')
    .replace(INVISIBLE, '')
    .replace(ODD_SPACE, ' ');

  if (!multiline) return base.replace(ODD_BREAK, ' ').replace(/\s+/g, ' ').trim();

  return base
    .replace(/\r\n?/g, '\n')
    .replace(ODD_BREAK, '\n')
    // Horizontal runs collapse; vertical ones are meaningful up to one blank line.
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[^\S\n]*\n[^\S\n]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── The shared shape ─────────────────────────────────────────────────────────

export interface TextOptions {
  /** Message to show when the value is blank. Omit to allow blank. */
  required?: string;
}

/**
 * Sanitise, cap, then apply whatever rule the field has.
 *
 * `.transform()` before the checks, so the length cap and the character rule
 * both see the value as it will be stored rather than as it was typed. Pasting
 * a 200-character name padded with zero-width spaces should not fail on length.
 *
 * `superRefine` for the same reason `fields.ts` uses it: the rule below has
 * already worked out *which* character is the problem, and collapsing that into
 * "invalid" makes the reader hunt for it.
 */
function textRule(options: {
  max: number;
  multiline?: boolean;
  required?: string;
  /** Why this non-blank value is wrong, or null. */
  error?: (value: string) => string | null;
}) {
  return z
    .string()
    .transform((value) => sanitizeText(value, { multiline: options.multiline }))
    .pipe(
      z
        .string()
        .max(options.max, `Keep this to ${options.max} characters or fewer.`)
        .superRefine((value, ctx) => {
          if (!value) {
            if (options.required) ctx.addIssue({ code: 'custom', message: options.required });
            return;
          }
          const message = options.error?.(value);
          if (message) ctx.addIssue({ code: 'custom', message });
        }),
    );
}

// ─── Free text ────────────────────────────────────────────────────────────────

/**
 * One line of ordinary text: a description, a reference, a bank branch.
 *
 * Sanitised and capped, every visible character kept. Newlines become spaces,
 * because a single-line field that stores a newline prints as a broken row.
 */
export function textSchema(max: number, { required }: TextOptions = {}) {
  return textRule({ max, required });
}

/**
 * A paragraph: notes, terms, a letter body, a clause.
 *
 * Keeps newlines and collapses runs of three or more into a blank line. This is
 * the only place a `\n` survives, which is what makes `textSchema` safe to use
 * everywhere else without thinking about it.
 */
export function multilineSchema(max: number, { required }: TextOptions = {}) {
  return textRule({ max, multiline: true, required });
}

// ─── Names ────────────────────────────────────────────────────────────────────

/**
 * Everything a person's name may contain.
 *
 * `\p{L}` and `\p{M}` rather than `A-Za-z`, so Devanagari, Tamil and every
 * accented Latin name pass. The punctuation is the set that appears in real
 * names and no more: O'Brien, Jean-Luc, J. R. R., D'Souza, and the typographic
 * apostrophe that every word processor substitutes for the straight one.
 *
 * No digits, which is the rule as asked for, and a real one on a document that
 * names a signatory. No angle bracket, quote, backslash or semicolon either:
 * none of them appear in a name, so allowing them only widens what a future
 * consumer of this string has to survive.
 */
const NAME_DISALLOWED = /[^\p{L}\p{M} .'’-]/u;

/** A company may be "3M" or "Section 8 Foundation", so digits belong here. */
const ORG_DISALLOWED = /[^\p{L}\p{M}\p{N} .,&'’()/+-]/u;

/**
 * Names the offending character rather than calling the whole value invalid.
 *
 * Digits get their own sentence, because "0 is not allowed" reads as a glitch
 * when the actual rule is that names do not contain numbers, and because it is
 * far and away the most common way to fail this check.
 */
function disallowedCharError(value: string, pattern: RegExp, noun: string): string | null {
  const found = value.match(pattern);
  if (!found) return null;
  const char = found[0];
  if (/\p{N}/u.test(char)) return `A ${noun} cannot contain numbers.`;
  return `“${char}” is not allowed in a ${noun}.`;
}

/** At least one letter, so " . " and "--" are not names. */
const HAS_LETTER = /\p{L}/u;

/**
 * A person: an employee, a contact, a signatory.
 *
 * Not used for a company (see `orgNameSchema`). The two are separate because
 * the digit rule is the whole difference between them, and a single "name"
 * schema would have to allow digits and therefore allow them on a person.
 */
export function personNameSchema(max = 200, { required }: TextOptions = {}) {
  return textRule({
    max,
    required,
    error: (value) =>
      disallowedCharError(value, NAME_DISALLOWED, 'name') ??
      (HAS_LETTER.test(value) ? null : 'Enter a name.'),
  });
}

/**
 * A legal entity: the client's registered name, the studio's, a bank's.
 *
 * The character set is close to what the MCA itself permits in a company name,
 * which is where most of these values are copied from.
 */
export function orgNameSchema(max = 200, { required }: TextOptions = {}) {
  return textRule({
    max,
    required,
    error: (value) =>
      disallowedCharError(value, ORG_DISALLOWED, 'company name') ??
      (HAS_LETTER.test(value) ? null : 'Enter a company name.'),
  });
}

// ─── Reference codes ──────────────────────────────────────────────────────────

/**
 * A reference somebody else assigned: a PO number, a TDS section, a service
 * code, a foreign tax registration.
 *
 * Upper-cased, because these have one canonical written form and lower case is
 * a typo rather than a variant — the same rule `uppercaseField` applies in the
 * browser, applied again where it is binding. The character set is deliberately
 * narrow: a code that arrives with a quote or an angle bracket in it is a paste
 * accident, not a code.
 *
 * Not for the identifiers that have a real validator. A PAN is `panSchema`; the
 * point of this one is the fields where the format belongs to a third party and
 * we cannot know it.
 */
export function codeSchema(max: number, { required }: TextOptions = {}) {
  return z
    .string()
    .transform((value) => sanitizeText(value).toUpperCase())
    .pipe(
      z
        .string()
        .max(max, `Keep this to ${max} characters or fewer.`)
        .superRefine((value, ctx) => {
          if (!value) {
            if (required) ctx.addIssue({ code: 'custom', message: required });
            return;
          }
          if (!/^[A-Z0-9][A-Z0-9 ./-]*$/.test(value)) {
            ctx.addIssue({
              code: 'custom',
              message: 'Use letters, digits, spaces and - . / only.',
            });
          }
        }),
    );
}

// ─── URLs ─────────────────────────────────────────────────────────────────────

/**
 * `https:` only, and that is the point of having this at all.
 *
 * `z.url()` accepts `javascript:alert(1)`, which is a well-formed URL. Nothing
 * renders this field as a link *today*, so that is not a live vulnerability; it
 * is one waiting for the entirely reasonable change that makes a vendor portal
 * clickable. Checking the scheme where the value enters the system costs
 * nothing and means that change cannot introduce it.
 *
 * `http:` is refused as well. A vendor portal that takes an invoice and a bank
 * detail over plaintext is a finding in its own right.
 */
export function httpsUrlSchema(max = 500, { required }: TextOptions = {}) {
  return textRule({
    max,
    required,
    error: (value) => {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return 'Enter a full URL, starting with https://.';
      }
      if (url.protocol !== 'https:') return 'The URL must start with https://.';
      return null;
    },
  });
}
