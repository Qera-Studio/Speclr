'use client';

import { useEffect, useRef, useState } from 'react';
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
  type PathValue,
  type UseFormSetValue,
} from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FieldSpinner } from '@/components/ui/spinner';
import { useMinimumDuration } from '@/lib/useMinimumDuration';
import { IFSC_LENGTH, isIfsc, normalizeIfscInput } from '@/lib/domain/bank';

/**
 * The IFSC input, shared by the employee and studio bank blocks.
 *
 * Two jobs. First, the value is normalised on every keystroke — alphanumerics
 * only, uppercased, capped at 11 — so a lowercase or punctuated IFSC can never
 * be stored. (CSS `text-transform` would only *look* right while saving the raw
 * text; money moves against this string.)
 *
 * Second, a complete IFSC is looked up and the bank name and branch filled in.
 * That lookup mirrors the pincode one in `AddressFields`: debounced, aborted
 * when superseded, silent on failure, and it never overwrites something already
 * typed. Both fields stay editable by hand — a down upstream can't block a save.
 */

const DEBOUNCE_MS = 400;

interface IfscFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Path of the IFSC field itself. */
  name: Path<T>;
  /** Path of the bank-name field to fill in when a lookup succeeds. */
  bankNameField: Path<T>;
  /** Path of the branch field to fill in when a lookup succeeds. */
  branchField: Path<T>;
  /**
   * The form's `setValue`. Writing through the controller's own `onChange`
   * would update form state but leave a `register`-ed bank-name input showing
   * its old text — both forms register that field uncontrolled.
   */
  setValue: UseFormSetValue<T>;
  /** Input id, unique per form. */
  id: string;
  label?: string;
  size?: 'default' | 'form';
}

export default function IfscField<T extends FieldValues>({
  control,
  name,
  bankNameField,
  branchField,
  setValue,
  id,
  label = 'IFSC',
  size = 'form',
}: IfscFieldProps<T>) {
  const ifsc = useController({ control, name });
  const bankName = useController({ control, name: bankNameField });
  const branch = useController({ control, name: branchField });

  const [lookingUp, setLookingUp] = useState(false);
  // Held for half a second — see the note in `AddressFields`.
  const busy = useMinimumDuration(lookingUp);

  const value = String(ifsc.field.value ?? '');

  // Read the latest values inside the effect without depending on them —
  // otherwise typing a bank name would restart the lookup.
  const latest = useRef({ bankName: '', branch: '' });
  latest.current = {
    bankName: String(bankName.field.value ?? ''),
    branch: String(branch.field.value ?? ''),
  };

  useEffect(() => {
    if (!isIfsc(value)) {
      setLookingUp(false);
      return;
    }

    const controller = new AbortController();
    setLookingUp(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/ifsc/${value}`, { signal: controller.signal });
        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        const result = data as { ok?: boolean; bank?: string; branch?: string };
        if (!result?.ok) return;

        // Only fill what's empty. Someone who typed a bank name meant it.
        if (result.bank && !latest.current.bankName.trim()) {
          setValue(bankNameField, result.bank as PathValue<T, Path<T>>, { shouldDirty: true });
        }
        if (result.branch && !latest.current.branch.trim()) {
          setValue(branchField, result.branch as PathValue<T, Path<T>>, { shouldDirty: true });
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
  }, [value, setValue, bankNameField, branchField]);

  const hintId = `${id}-hint`;

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          size={size}
          maxLength={IFSC_LENGTH}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={hintId}
          className={busy ? 'pr-8' : undefined}
          {...ifsc.field}
          value={value}
          onChange={(event) => ifsc.field.onChange(normalizeIfscInput(event.target.value))}
        />
        <FieldSpinner show={busy} />
      </div>
      <span id={hintId} className="sr-only" role="status">
        {lookingUp ? 'Looking up bank…' : ''}
      </span>
      <FieldError errors={[ifsc.fieldState.error]} />
    </Field>
  );
}
