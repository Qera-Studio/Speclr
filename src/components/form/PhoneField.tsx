'use client';

import { useEffect, useState } from 'react';
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

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  value: c.iso2,
  label: `${c.flag} ${c.name} +${c.dialCode}`,
}));

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
  const { field, fieldState } = useController({
    control,
    name,
    rules: {
      validate: (value) => {
        const raw = String(value ?? '').trim();
        if (!raw) return required ? 'Phone is required.' : true;
        const { iso2, national } = parsePhone(raw);
        return isValidPhone(national, iso2) || phoneHintFor(iso2);
      },
    },
  });

  const stored = String(field.value ?? '');

  // Local editing state, seeded from the stored value. Kept separate so a
  // half-typed number isn't thrown away by a re-parse on every keystroke.
  const [iso2, setIso2] = useState<CountryCode>(() => parsePhone(stored).iso2);
  const [national, setNational] = useState(() => parsePhone(stored).national);

  // Re-seed when the form is reset or a different record is loaded, but not
  // while the user is mid-edit (the stored value already matches what we sent).
  useEffect(() => {
    const composed = toE164(national, iso2);
    if (composed === stored) return;
    if (!stored && !national) return;
    const parsed = parsePhone(stored);
    setIso2(parsed.iso2);
    setNational(parsed.national);
    // Only when the stored value changes from the outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const push = (nextNational: string, nextIso2: CountryCode) => {
    const composed = toE164(nextNational, nextIso2);
    // Keep the raw digits when they don't yet form a valid number, so the
    // validator can explain what's wrong instead of the field looking empty.
    field.onChange(composed ?? nextNational);
  };

  const dialCode = countryByIso2(iso2)?.dialCode ?? countryByIso2(DEFAULT_COUNTRY)?.dialCode;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex w-full items-start gap-2">
        <Combobox
          id={`${id}-country`}
          size={size}
          className="w-[9.5rem] shrink-0"
          options={COUNTRY_OPTIONS}
          value={iso2}
          onValueChange={(next) => {
            const nextIso2 = (next || DEFAULT_COUNTRY) as CountryCode;
            setIso2(nextIso2);
            push(national, nextIso2);
          }}
          placeholder="Country"
          aria-label="Phone country"
        />
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 flex items-center text-muted-foreground',
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
            autoComplete="tel-national"
            aria-invalid={fieldState.error ? true : undefined}
            className={size === 'form' ? 'pl-13' : 'pl-10'}
            value={national}
            onBlur={field.onBlur}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '');
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
