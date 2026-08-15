'use client';

import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FieldInfo from '@/components/form/FieldInfo';
import FieldCheck from '@/components/form/FieldCheck';
import { upperNoSpace } from '@/components/form/inputFilters';
import { cinStateHint } from '@/lib/domain/taxIds/india';

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
  className,
  wrapperClassName = 'relative',
  children,
}: IdentifierProps<T> & {
  label: string;
  infoLabel: string;
  /** The identifier's real character count, so the browser stops typing there. */
  maxLength: number;
  /** Extra classes for the `Field` wrapper. */
  className?: string;
  /** Classes for the box holding the input and the tick. */
  wrapperClassName?: string;
}) {
  const { field, fieldState } = useController({ control, name });

  return (
    <Field className={className}>
      <FieldInfo htmlFor={id} label={label} info={info} infoLabel={infoLabel} />
      <div className={wrapperClassName}>
        <Input
          id={id}
          size="form"
          className="pr-8"
          maxLength={maxLength}
          placeholder={placeholder}
          autoCapitalize="characters"
          autoCorrect="off"
          // Nothing the browser has stored is a PAN. Left on, it offers the
          // last email typed into any field named the same thing.
          autoComplete="off"
          spellCheck={false}
          {...field}
          value={String(field.value ?? '')}
          onChange={(event) => field.onChange(upperNoSpace(event.target.value))}
        />
        <FieldCheck control={control} name={name} />
      </div>
      {children}
      <FieldError errors={[fieldState.error]} />
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
      {...props}
    />
  );
}

/**
 * CIN, plus the registrar hint when an address is available to compare against.
 *
 * The hint travels with the field rather than with the caller: it is a property
 * of a CIN, and the geometry below took two rounds in a real browser to get
 * right. Copying it to a second caller is how one of the two would end up
 * subtly wrong.
 */
export function CinField<T extends FieldValues>({
  addressState,
  ...props
}: IdentifierProps<T> & {
  /** The state on the same record, if known. Enables the registrar hint. */
  addressState?: string;
}) {
  const { field } = useController({ control: props.control, name: props.name });
  const value = String(field.value ?? '');
  const hint = value ? cinStateHint(value, addressState) : null;

  return (
    <IdentifierField
      label="CIN"
      infoLabel="What is a CIN?"
      info="The Corporate Identity Number from the certificate of incorporation. 21 characters, and only companies have one. Some contracts ask for it."
      placeholder="U62099UP2026PTC254312"
      maxLength={21}
      /*
        `isolate` so the two z-indexes below are compared against each other and
        nothing else. Without it they are settled in whatever stacking context
        the page happens to provide, which is how the notice ended up painting
        over the field it is supposed to hide behind.
      */
      className="isolate"
      /*
        Lifted above the notice, and opaque in its own right.

        The wrapper carries the background rather than leaning on the input's:
        the autofill rule in globals.css sets `background-clip: text` on an
        autofilled field, which is exactly what stops Chrome painting its blue,
        and it would just as happily stop the field painting the white that
        hides the notice's top half. One class here and "behind" no longer
        depends on the input being opaque.
      */
      wrapperClassName="relative z-10 rounded-md bg-background"
      {...props}
    >
      {hint ? (
        <>
          {/*
            A warning box, not red text: nothing is blocked and nothing is
            refused. The registrar pair is a *hint*, since the published ROC
            codes are not exhaustive, so a real CIN can disagree with this and
            still be correct.

            It hangs out from behind the field rather than sitting in the flow
            below it. Five classes make that work and they are interlocking, so
            none of them is arbitrary:

              `z-0`       behind the input, explicitly. The `Alert` primitive is
                          itself `relative`, so leaving this to source order put
                          a later sibling in front of an earlier `z-10` one.
                          Zero rather than a negative: Tailwind emits `-z-10` as
                          `z-index: calc(10 * -1)`, and a *negative* layer is the
                          one case engines disagree on once the drop animation's
                          transform has promoted this box to its own compositing
                          layer. 0 against 10 is the boring comparison every
                          engine agrees about.
              `max-w`     80% of the field, so it reads as hanging *from* the
                          field rather than as the form's next row. A max-width,
                          not a width: `Field` is `flex-col *:w-full`, and that
                          variant sorts after plain `w-*` in the sheet, so it
                          wins any straight fight over `width`. `max-width` has
                          no such competitor.
              `mx-auto`   centred. An auto cross-axis margin also turns off the
                          flex container's default `stretch`, which is the other
                          half of why `w-auto` alone did nothing.
              `-mt-6`     24px up, against the 8px `Field` gap: 16px of the box
                          ends up behind the input.
              `pt-4`      the same 16px, so the text clears the input's bottom
                          edge exactly and none of it is hidden.

            The fall itself is `drop-in` in globals.css.
          */}
          <Alert variant="warning" className="animate-drop-in z-0 mx-auto -mt-6 max-w-[80%] pt-4">
            <TriangleAlert aria-hidden />
            <AlertDescription>{hint}</AlertDescription>
          </Alert>
          {/* Colour is not announced; this is. */}
          <span role="status" className="sr-only">
            {hint}
          </span>
        </>
      ) : null}
    </IdentifierField>
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
