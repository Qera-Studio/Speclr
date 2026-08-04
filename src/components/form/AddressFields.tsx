'use client';

import { useEffect, useRef, useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Info } from 'lucide-react';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isIndianPincode } from '@/lib/domain/address';
import { COUNTRIES } from '@/lib/domain/phone';

/**
 * The structured address block, shared by the client and employee forms.
 *
 * Typing a 6-digit Indian pincode fills in city and state. That lookup is
 * strictly an enhancement: it is debounced, it aborts when superseded, it fails
 * silently, and it never overwrites something already typed. Every field stays
 * editable by hand, so a slow or down third party can't stop anyone saving.
 */

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({
  value: c.iso2,
  label: `${c.flag} ${c.name}`,
}));

const DEBOUNCE_MS = 400;

const LOCK_HINT = 'City and state filled from this pincode. Change it to edit them.';

interface AddressFieldsProps<T extends FieldValues> {
  control: Control<T>;
  /** Field-name prefix, so both forms can nest this under `addressParts`. */
  name: Path<T>;
  /** Prefix for input ids, keeping them unique when two forms share a page. */
  idPrefix: string;
  size?: 'default' | 'form';
}

export default function AddressFields<T extends FieldValues>({
  control,
  name,
  idPrefix,
  size = 'form',
}: AddressFieldsProps<T>) {
  const line1 = useController({ control, name: `${name}.line1` as Path<T> });
  const line2 = useController({ control, name: `${name}.line2` as Path<T> });
  const city = useController({ control, name: `${name}.city` as Path<T> });
  const state = useController({ control, name: `${name}.state` as Path<T> });
  const pincode = useController({ control, name: `${name}.pincode` as Path<T> });
  const country = useController({ control, name: `${name}.country` as Path<T> });

  const [lookingUp, setLookingUp] = useState(false);
  /**
   * Which fields the postal lookup filled in. Those go read-only, so a typo
   * can't leave a client's city and pincode disagreeing.
   *
   * Read-only rather than disabled: a disabled input is skipped on submit and
   * is skipped by screen readers. And the lock is always escapable — editing or
   * clearing the pincode clears these flags (see the effect below), so a wrong
   * district from India Post is never something you're stuck with.
   */
  const [autofilled, setAutofilled] = useState({ city: false, state: false });
  const locked = autofilled.city || autofilled.state;

  const pincodeValue = String(pincode.field.value ?? '');
  const countryValue = String(country.field.value ?? 'IN');

  // Read the latest city/state inside the effect without making them
  // dependencies — otherwise typing a city would restart the lookup.
  const latest = useRef({ city: '', state: '' });
  latest.current = {
    city: String(city.field.value ?? ''),
    state: String(state.field.value ?? ''),
  };
  const setCity = city.field.onChange;
  const setState = state.field.onChange;

  useEffect(() => {
    // A new pincode (or leaving India) invalidates whatever the last one filled
    // in — unlock first, then look up again.
    setAutofilled({ city: false, state: false });

    if (countryValue !== 'IN' || !isIndianPincode(pincodeValue)) {
      setLookingUp(false);
      return;
    }

    const controller = new AbortController();
    setLookingUp(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/pincode/${pincodeValue}`, {
          signal: controller.signal,
        });
        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        const result = data as { ok?: boolean; city?: string; state?: string };
        if (!result?.ok) return;

        // Only fill what's empty. Someone who has typed a city meant it, and a
        // postal database shouldn't overrule them.
        const filledCity = Boolean(result.city) && !latest.current.city.trim();
        const filledState = Boolean(result.state) && !latest.current.state.trim();
        if (filledCity) setCity(result.city);
        if (filledState) setState(result.state);
        if (filledCity || filledState) {
          setAutofilled({ city: filledCity, state: filledState });
        }
      } catch {
        // Aborted, offline, or upstream down — all no-ops by design.
      } finally {
        if (!controller.signal.aborted) setLookingUp(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pincodeValue, countryValue, setCity, setState]);

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-line1`}>Building / flat</FieldLabel>
        <Input
          id={`${idPrefix}-line1`}
          size={size}
          autoComplete="address-line1"
          {...line1.field}
          value={String(line1.field.value ?? '')}
        />
        <FieldError errors={[line1.fieldState.error]} />
      </Field>

      <Field>
        <FieldLabel htmlFor={`${idPrefix}-line2`}>Street / area (optional)</FieldLabel>
        <Input
          id={`${idPrefix}-line2`}
          size={size}
          autoComplete="address-line2"
          {...line2.field}
          value={String(line2.field.value ?? '')}
        />
        <FieldError errors={[line2.fieldState.error]} />
      </Field>

      <FieldRow>
        <Field>
          {/* The icon sits beside the label, never inside it — anything within
              a `<label>` becomes part of the input's accessible name. */}
          <div className="flex items-center gap-1.5">
            <FieldLabel htmlFor={`${idPrefix}-pincode`}>Pincode</FieldLabel>
            {/*
              A standing warning line under the field pushed the layout around
              and shouted at someone who had done nothing wrong. The icon says
              "there is something to know here" without taking a row.

              It is a real button, not a hover-only affordance, so the
              explanation is reachable by keyboard; the same sentence also
              stays in the live region below, which is what actually announces
              the lock to a screen reader.
            */}
            {locked ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      aria-label="Why are city and state locked?"
                      className="text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground"
                    />
                  }
                >
                  <Info className="size-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>{LOCK_HINT}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <Input
            id={`${idPrefix}-pincode`}
            size={size}
            inputMode="numeric"
            autoComplete="postal-code"
            aria-describedby={`${idPrefix}-pincode-hint`}
            {...pincode.field}
            value={pincodeValue}
          />
          <span id={`${idPrefix}-pincode-hint`} className="sr-only" role="status">
            {locked ? LOCK_HINT : lookingUp ? 'Looking up city and state…' : ''}
          </span>
          <FieldError errors={[pincode.fieldState.error]} />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-city`}>City</FieldLabel>
          <Input
            id={`${idPrefix}-city`}
            size={size}
            autoComplete="address-level2"
            readOnly={autofilled.city}
            aria-readonly={autofilled.city || undefined}
            className={autofilled.city ? 'text-muted-foreground' : undefined}
            {...city.field}
            value={String(city.field.value ?? '')}
          />
          <FieldError errors={[city.fieldState.error]} />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-state`}>State</FieldLabel>
          <Input
            id={`${idPrefix}-state`}
            size={size}
            autoComplete="address-level1"
            readOnly={autofilled.state}
            aria-readonly={autofilled.state || undefined}
            className={autofilled.state ? 'text-muted-foreground' : undefined}
            {...state.field}
            value={String(state.field.value ?? '')}
          />
          <FieldError errors={[state.fieldState.error]} />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-country`}>Country</FieldLabel>
          <Combobox
            id={`${idPrefix}-country`}
            size={size}
            options={COUNTRY_OPTIONS}
            value={countryValue}
            onValueChange={country.field.onChange}
            placeholder="Select a country…"
          />
          <FieldError errors={[country.fieldState.error]} />
        </Field>
      </FieldRow>
    </>
  );
}
