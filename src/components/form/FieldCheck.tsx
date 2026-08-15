'use client';

import { Check } from 'lucide-react';
import {
  get,
  useFormState,
  useWatch,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';

/**
 * A tick inside a field's trailing edge, once the value has passed its check.
 *
 * **Only for fields the app can actually verify.** A GSTIN carries a mod-36
 * check character, a PAN encodes its holder type, a CIN carries a registrar and
 * a year. Those are facts the operator cannot confirm by looking, so confirming
 * them is worth a mark. A tick beside "Name" would say only that the field is
 * not empty, which the field already says by having something in it, and a page
 * of ticks is a page of noise.
 *
 * What the tick claims is exactly "this is well-formed", never "this exists".
 * There is no registry call behind any of it (see `taxIds/india.ts` on why we
 * deliberately make none), and the copy around these fields must not imply one.
 *
 * Touched, not merely valid: a tick that appears the instant the last character
 * lands is a tick that flickers through every wrong prefix on the way. It waits
 * for the field to be left.
 *
 * Silent to assistive tech. A screen reader is told about a field when it is
 * *wrong*, through `FieldError`'s live region, and "no error" is the default
 * state of every form control on earth. Announcing it would be a second
 * interruption per field for no news.
 *
 * Wrap the input in `<div className="relative">` and give it `pr-8`, the same
 * shape `FieldSpinner` uses.
 */
export default function FieldCheck<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: Path<T>;
}) {
  const value = useWatch({ control, name });
  const { errors, touchedFields } = useFormState({ control, name });

  const filled = String(value ?? '').trim() !== '';
  const show = filled && get(touchedFields, name) && !get(errors, name);
  if (!show) return null;

  return (
    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
      <Check
        aria-hidden
        className="animate-in zoom-in-50 fade-in size-4 text-primary duration-300"
      />
    </span>
  );
}
