'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import FieldInfo from '@/components/form/FieldInfo';
import FieldCheck from '@/components/form/FieldCheck';
import type { IdentifierKind } from '@/lib/domain/taxIds/decode';
import { upperNoSpace } from '@/components/form/inputFilters';

/**
 * The identifier inputs, each owning everything about itself.
 *
 * The rules live in `lib/domain/fields.ts` and are shared by the server; this
 * is the other half: the label, the placeholder, the maximum length, the
 * normalisation, the tick, the info copy and the error slot. Together they mean
 * a PAN field is declared in exactly two places instead of being rebuilt from
 * eight primitives at every call site, which is how the employee PAN ended up
 * without a length cap and the studio GSTIN without any validation at all.
 *
 * **Controlled, via `useController`, not `register`.** Two reasons, both
 * following `IfscField` and `PhoneField`, which already work this way:
 * normalisation has to happen before react-hook-form stores the value (a field
 * that merely *looks* upper-cased while holding something else is worse than
 * one that looks wrong), and the tick needs the field's own error state. The
 * re-render per keystroke is scoped to this component, not the form.
 *
 * The info copy is a default, not a fixture. Every field takes an `info`
 * override for the one caller with something more specific to say.
 */

interface IdentifierProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  /** Input id, unique per form. */
  id: string;
  label?: string;
  /** Overrides the default explanation behind the info icon. */
  info?: string;
  /** Overrides the accessible name of the info button. */
  infoLabel?: string;
  placeholder?: string;
  /**
   * Extra classes for the `<input>` itself. Exists for one thing: the
   * `animate-fill-flash` a caller adds when the app filled the field in, the
   * same signal `AddressFields` gives when a pincode fills city and state.
   */
  inputClassName?: string;
  /**
   * Derived from something else on the form and not typed here.
   *
   * `readOnly`, never `disabled`: a disabled input is skipped by the keyboard,
   * greyed to the same colour as "you may not do this yet", and dropped from a
   * native submit. A read-only one is still focusable, still selectable, still
   * copyable, and still submitted — which is what a value that is *correct and
   * fixed* should be.
   */
  readOnly?: boolean;
  /** Rendered after the input, inside the same `Field`. */
  children?: ReactNode;
}

/**
 * The body all of them share: an upper-cased, unspaced input with a tick on the
 * trailing edge and its error underneath.
 *
 * Upper-casing on change rather than with CSS `text-transform`, for the reason
 * `inputFilters` gives at length: these values print verbatim on documents that
 * are retained for 72 months, so what is stored has to be what is read. Spaces
 * go too, because identifiers are routinely copied out of a PDF with them and a
 * trailing space is invisible in an input and fatal to a format check.
 */
function IdentifierField<T extends FieldValues>({
  control,
  name,
  id,
  label,
  info,
  infoLabel,
  placeholder,
  maxLength,
  kind,
  inputClassName,
  readOnly,
  children,
}: IdentifierProps<T> & {
  label: string;
  infoLabel: string;
  /** The identifier's real character count, so the browser stops typing there. */
  maxLength: number;
  /** Which decoding `FieldFacts` reads out once the value passes. */
  kind: IdentifierKind;
}) {
  const { field, fieldState } = useController({ control, name });

  /**
   * Read on **every** render, not only when it is about to be shown.
   *
   * This line is a bug fix, and the bug was invisible in the ordinary case.
   * `formState` is a proxy that records which keys a component reads and
   * re-renders it only for those; a controller that has never read `errors` is
   * never told when its own error arrives. The display used to be written
   * `errors={showError ? [fieldState.error] : []}`, so a field that had not yet
   * been left or filled never read it, never subscribed, and afterwards
   * rendered off a snapshot taken before the error existed.
   *
   * What that looked like: on the tax step, once **any** identifier was showing
   * an error, none of the others would ever show theirs. React Hook Form had
   * them all, correctly, and the form still refused to submit; the reader was
   * simply never told which field was wrong. Reproduced by blurring an empty
   * GSTIN (whose "a registered client has a GSTIN" lands immediately) and then
   * typing a bad TAN or PAN. Pinned in `fields.test.tsx`.
   */
  const error = fieldState.error;

  const value = String(field.value ?? '');

  /**
   * When the reader is told they are wrong.
   *
   * The form validates from the first keystroke (see `onChange` below), which
   * is what lets the tick appear without the field being left first. Showing
   * every intermediate error that comes with that would put "Expected a
   * 15-character GSTIN" under a field for the fourteen characters it takes to
   * type one, which trains people to ignore the line.
   *
   * So the message waits for the value to be *finished*: the identifier's full
   * length, or the field actually left. Both are moments where the reader has
   * stopped, and neither can hide a real failure — a value too short to be
   * complete is one the form still refuses at submit.
   */
  const [blurred, setBlurred] = useState(false);
  const showError = blurred || value.length >= maxLength;

  /**
   * Room on the trailing edge for whatever `FieldCheck` is currently showing.
   *
   * The tick alone is a known 16px, but the fact beside it is not: "Uttar
   * Pradesh" and "INC 2026" are different widths, in a font that is not loaded
   * when the first paint happens, at a text size the user can change. A fixed
   * `pr-*` sized for the longest one wastes the space on every other field and
   * still loses to a fact added later — so the width is measured from the thing
   * itself and paid as padding, which is the only version that cannot overlap.
   *
   * Measured in a layout effect so it lands before paint, and unconditionally
   * on every render because the fact changes with the value. Setting the same
   * number twice is a no-op in React, so this settles rather than looping.
   */
  const trailing = useRef<HTMLSpanElement>(null);
  const [trailingWidth, setTrailingWidth] = useState(0);
  useLayoutEffect(() => {
    setTrailingWidth(trailing.current?.offsetWidth ?? 0);
  });

  return (
    <Field>
      <FieldInfo htmlFor={id} label={label} info={info} infoLabel={infoLabel} />
      <div className="relative">
        <Input
          id={id}
          size="form"
          // `right-2` on the badge, plus the same again as a gutter before the
          // value. Falls back to the tick's own width when nothing is showing.
          style={{ paddingRight: (trailingWidth || 16) + 16 }}
          maxLength={maxLength}
          placeholder={placeholder}
          readOnly={readOnly}
          // Not `disabled`, and not a colour change either: the value is real
          // and correct, so it should look like every other value on the page.
          // The cursor is the only signal it is not yours to edit.
          className={cn(inputClassName, readOnly && 'cursor-default')}
          autoCapitalize="characters"
          autoCorrect="off"
          // Nothing the browser has stored is a PAN. Left on, it offers the
          // last email typed into any field named the same thing.
          autoComplete="off"
          spellCheck={false}
          {...field}
          value={value}
          onChange={(event) => {
            field.onChange(upperNoSpace(event.target.value));
            // Marks the field touched, which under the form's `onTouched` mode
            // is what makes it validate on every keystroke from here on. Until
            // this ran, a field being typed into for the first time was not
            // being checked at all, so nothing could be reported about it and
            // nothing could be confirmed about it. It does not move focus.
            field.onBlur();
          }}
          onBlur={() => {
            setBlurred(true);
            field.onBlur();
          }}
        />
        <FieldCheck control={control} name={name} kind={kind} ref={trailing} />
      </div>
      {children}
      <FieldError errors={showError ? [error] : []} />
    </Field>
  );
}

export function GstinField<T extends FieldValues>(props: IdentifierProps<T>) {
  return (
    <IdentifierField
      label="GSTIN"
      infoLabel="Why does the GSTIN matter?"
      info="The first two digits are the state of registration, and they become the place of supply on every invoice. They are checked against the address so the two can never disagree."
      placeholder="09AABCQ2864Q1ZQ"
      maxLength={15}
      kind="gstin"
      {...props}
    />
  );
}

export function PanField<T extends FieldValues>(props: IdentifierProps<T>) {
  return (
    <IdentifierField
      label="PAN"
      infoLabel="What is checked about the PAN?"
      info="Ten characters. The 4th encodes the holder type, so it is checked against the kind of party this record is: a Private Limited's PAN is a C, an individual's a P."
      placeholder="AABCQ2864Q"
      maxLength={10}
      kind="pan"
      {...props}
    />
  );
}

export function TanField<T extends FieldValues>(props: IdentifierProps<T>) {
  return (
    <IdentifierField
      label="TAN"
      infoLabel="What is a TAN?"
      info="The account number the deduction is filed against. Anyone deducting TDS is required to hold one."
      placeholder="DELQ12345F"
      maxLength={10}
      // Nothing to decode: no check digit, and its city prefix has no published
      // table. `identifierFacts` returns nothing and the field shows no line.
      kind="tan"
      {...props}
    />
  );
}

/**
 * CIN.
 *
 * It used to carry a registrar hint in a box hanging out from under the field,
 * comparing the CIN's ROC state letters against the address. That is gone, and
 * the check behind it with it: the pair disagrees honestly whenever a company
 * is incorporated in one state and operates from another, and it disagreed on
 * Qera's own `UW`. A warning that fires on correct data teaches people to
 * ignore warnings. What a CIN *is* checked against now is the entity type,
 * which is a closed set with no honest exception (`cinEntityTypeError`).
 */
export function CinField<T extends FieldValues>(props: IdentifierProps<T>) {
  return (
    <IdentifierField
      label="CIN"
      infoLabel="What is a CIN?"
      info="The Corporate Identity Number from the certificate of incorporation. 21 characters, and only companies have one. Characters 13 to 15 say what kind, and are checked against the entity type on this record."
      placeholder="U62099UP2026PTC254312"
      maxLength={21}
      kind="cin"
      {...props}
    />
  );
}

/**
 * SAC — the GST classification of a thing sold.
 *
 * Digits only, and filtered on the way into react-hook-form rather than
 * complained about afterwards, per the standing rule for numeric inputs: a
 * value that only *looks* clean while holding something else is the worse of
 * the two failures.
 *
 * **No tick.** `sacSchema` checks that this is six digits beginning 99, which
 * is a shape and not a classification — the code could be well-formed and still
 * be the wrong one for the work. A mark here would claim the app had confirmed
 * something it cannot see, which is the one thing `FieldCheck` exists not to do.
 */
export function SacField<T extends FieldValues>({
  control,
  name,
  id,
  label = 'SAC',
  info = 'The Service Accounting Code this work is classified under. Six digits, always beginning 99, and the 9983 group is taxed at 18%. Which code fits is a judgement for whoever signs the return.',
  infoLabel = 'What is a SAC?',
  placeholder = '998314',
}: IdentifierProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <Field>
      <FieldInfo htmlFor={id} label={label} info={info} infoLabel={infoLabel} />
      <Input
        id={id}
        size="form"
        inputMode="numeric"
        maxLength={6}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        {...field}
        value={String(field.value ?? '')}
        onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ''))}
      />
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

/**
 * Email.
 *
 * No tick and no normalisation, and both absences are deliberate. There is
 * nothing to verify about an address short of sending mail to it, so a tick
 * would claim more than the check knows (see `FieldCheck`). And the local part
 * of an address is case-sensitive by the RFC, so upper-casing it the way the
 * identifiers above are upper-cased would be changing somebody's address.
 */
export function EmailField<T extends FieldValues>({
  control,
  name,
  id,
  label = 'Email',
  info,
  infoLabel = 'About this email',
  placeholder = 'name@example.com',
}: IdentifierProps<T>) {
  const { field, fieldState } = useController({ control, name });

  return (
    <Field>
      <FieldInfo htmlFor={id} label={label} info={info} infoLabel={infoLabel} />
      <Input
        id={id}
        size="form"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCorrect="off"
        spellCheck={false}
        placeholder={placeholder}
        {...field}
        value={String(field.value ?? '')}
      />
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}
