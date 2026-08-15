'use client';

import { useEffect, useRef, useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import type { CountryCode } from 'libphonenumber-js/min';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  countryByIso2,
  capNationalDigits,
  formatNationalDigits,
  isValidPhone,
  parsePhone,
  phoneHintFor,
  toE164,
} from '@/lib/domain/phone';

/**
 * Country selector + national number, stored as one E.164 string.
 *
 * The stored value stays a single field (see lib/domain/phone.ts for why —
 * splitting it would change the shape of every document snapshot already
 * written). The country here is a view over that string, derived on load.
 *
 * Validation is per country: India requires a 10-digit mobile starting 6–9.
 * An invalid number is reported through RHF but still kept in the input, so a
 * legacy value can be corrected in place rather than silently discarded.
 */

/**
 * Flag and name on the left, dial code in its own right-hand column — the codes
 * then line up down the list instead of trailing each name at a different
 * offset. Once chosen, the field shows the flag alone: the dial code belongs in
 * front of the digits it is part of, and showing it here as well printed the
 * same `+91` twice, side by side.
 */
const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  value: c.iso2,
  label: `${c.flag} ${c.name}`,
  trailing: `+${c.dialCode}`,
  selectedLabel: c.flag,
}));

/**
 * Room for the dial code sitting in front of the number. Sized per code length
 * rather than fixed, because a fixed inset that clears `+91` runs straight
 * through `+971`.
 */
const PREFIX_PADDING: Record<number, string> = { 1: 'pl-9', 2: 'pl-11', 3: 'pl-13' };

/**
 * The strict phone check, for a form's resolver to call.
 *
 * It lives here rather than in the shared zod schema because that schema
 * re-validates whole records on every edit, and records written before phones
 * were structured would become permanently un-editable under a strict rule.
 * Returns an error message, or null when the value is acceptable.
 */
export function validatePhoneValue(
  value: unknown,
  { required = true }: { required?: boolean } = {},
): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return required ? 'Phone is required.' : null;
  const { iso2, national } = parsePhone(raw);
  return isValidPhone(national, iso2) ? null : phoneHintFor(iso2);
}

interface PhoneFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  id: string;
  label?: string;
  size?: 'default' | 'form';
  required?: boolean;
}

export default function PhoneField<T extends FieldValues>({
  control,
  name,
  id,
  label = 'Phone',
  size = 'form',
  required = true,
}: PhoneFieldProps<T>) {
  /**
   * No `rules` here on purpose: a form-level resolver overrides them entirely,
   * and every form using this field has one. Phone validation lives in each
   * form's resolver — see the note in ClientForm — and surfaces back through
   * `fieldState.error` below.
   */
  const { field, fieldState } = useController({ control, name });

  const stored = String(field.value ?? '');

  // Local editing state, seeded from the stored value. Kept separate so a
  // half-typed number isn't thrown away by a re-parse on every keystroke.
  const [iso2, setIso2] = useState<CountryCode>(() => parsePhone(stored).iso2);
  const [national, setNational] = useState(() => parsePhone(stored).national);

  const dialCode =
    countryByIso2(iso2)?.dialCode ?? countryByIso2(DEFAULT_COUNTRY)!.dialCode;

  /**
   * The last value this field wrote, so the effect below can tell an outside
   * change from its own write coming back.
   *
   * This is what kept the country from sticking. A half-typed number has no
   * E.164 form, so we store the bare digits — and re-parsing bare digits falls
   * back to India by design (see `parsePhone`). The effect therefore reset the
   * country to India on the first keystroke after choosing any other one:
   * pick the UAE, type a digit, and you were back in India.
   */
  const pushed = useRef<string | null>(null);

  // Re-seed when the form is reset or a different record is loaded, but never
  // from our own write — that value came from this state in the first place.
  useEffect(() => {
    if (stored === pushed.current) return;
    const parsed = parsePhone(stored);
    setIso2(parsed.iso2);
    setNational(parsed.national);
    // Only when the stored value changes from the outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const push = (nextNational: string, nextIso2: CountryCode) => {
    // Keep the raw digits when they don't yet form a valid number, so the
    // validator can explain what's wrong instead of the field looking empty.
    const composed = toE164(nextNational, nextIso2) ?? nextNational;
    pushed.current = composed;
    field.onChange(composed);
  };

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex w-full items-start gap-2">
        <Combobox
          id={`${id}-country`}
          size={size}
          className="w-[4.25rem] shrink-0"
          options={COUNTRY_OPTIONS}
          value={iso2}
          onValueChange={(next) => {
            const nextIso2 = (next || DEFAULT_COUNTRY) as CountryCode;
            // The cap is per country, so switching to a shorter one has to
            // trim what is already there — otherwise the field keeps a number
            // the new country could never hold.
            const trimmed = capNationalDigits(national, nextIso2);
            setIso2(nextIso2);
            setNational(trimmed);
            push(trimmed, nextIso2);
          }}
          placeholder="Country"
          aria-label="Phone country"
        />
        {/*
          The dial code sits in front of the digits, in the same ink as them,
          because together they are one number. Muted, it read as placeholder
          text in an empty field. It is `aria-hidden` and outside the input:
          the stored value already carries the code, so a screen reader would
          otherwise hear it twice, and it must not be selectable or deletable.
        */}
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 flex items-center select-none',
              size === 'form' ? 'pl-3 text-sm' : 'pl-2 text-xs/relaxed',
            )}
          >
            +{dialCode}
          </span>
          <Input
            id={id}
            size={size}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            aria-invalid={fieldState.error ? true : undefined}
            className={PREFIX_PADDING[dialCode.length] ?? 'pl-13'}
            value={formatNationalDigits(national, iso2)}
            onBlur={field.onBlur}
            onChange={(event) => {
              // Digits only, and never more than the country could hold — an
              // 11th digit on an Indian number is not a number being typed, it
              // is a mistake, and letting it in only to report it afterwards
              // lets someone tab away from a field that already looks filled.
              // The state holds bare digits; grouping is put back on render.
              const digits = capNationalDigits(event.target.value, iso2);
              setNational(digits);
              push(digits, iso2);
            }}
          />
        </div>
      </div>
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}
