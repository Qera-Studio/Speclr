'use client';

import type { Ref } from 'react';
import { Check } from 'lucide-react';
import {
  get,
  useFormState,
  useWatch,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { identifierFact, identifierPasses, type IdentifierKind } from '@/lib/domain/taxIds/decode';

/**
 * A tick inside a field's trailing edge, once the value has passed its check,
 * and — where the identifier has one — the single fact it decodes to.
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
 * **The fact is the tick's working, shown.** "Uttar Pradesh" beside a GSTIN can
 * be checked against the letterhead it was copied from by the person who copied
 * it, which is a stronger assurance than any mark, because the reader does the
 * confirming. It is decoded from the characters in the field, never fetched,
 * and there deliberately is no loading state in front of it: a spinner ahead of
 * a local computation implies a lookup that does not happen, and the operator
 * who believes the MCA confirmed this PAN is the one who puts a well-formed
 * wrong number on an invoice retained 72 months.
 *
 * It shares the tick's condition rather than carrying its own, so the two can
 * never contradict each other. `identifierFact` returns null for anything it
 * cannot read, so the tick still appears alone on a TAN.
 *
 * **It appears while the field still has focus.** The worry that used to hold
 * it back until blur was flicker, and the worry was unfounded: every prefix of
 * a GSTIN, a PAN or a CIN fails its own format check, so the mark cannot appear
 * until the last character lands. Waiting instead cost the thing the mark is
 * for — confirmation at the moment of typing — and left a reloaded form with no
 * mark at all on values it had already accepted.
 *
 * Two conditions, and the order matters. `identifierPasses` decides on the
 * characters alone, which is what makes the mark immediate; a recorded form
 * error vetoes it, which is what keeps the cross-record rules (a GSTIN against
 * the address, a PAN against the entity type) able to take it away again. A
 * field with no `kind` has nothing to decide locally and still waits to be
 * touched.
 *
 * Silent to assistive tech. A screen reader is told about a field when it is
 * *wrong*, through `FieldError`'s live region, and "no error" is the default
 * state of every form control on earth. Announcing it would be a second
 * interruption per field for no news.
 *
 * Wrap the input in `<div className="relative">` and give it `pr-8`, the same
 * shape `FieldSpinner` uses. A caller passing `kind` must instead reserve room
 * for the measured width — `IdentifierField` does this with the `ref`, because
 * "Uttar Pradesh" is not a fixed number of pixels and a value running under it
 * is worse than no fact at all.
 */
export default function FieldCheck<T extends FieldValues>({
  control,
  name,
  kind,
  ref,
}: {
  control: Control<T>;
  name: Path<T>;
  /** Which decoding to read back beside the tick. Omit for no fact. */
  kind?: IdentifierKind;
  ref?: Ref<HTMLSpanElement>;
}) {
  const value = useWatch({ control, name });
  const { errors, touchedFields } = useFormState({ control, name });

  const text = String(value ?? '');
  const settled = kind ? identifierPasses(kind, text) : Boolean(get(touchedFields, name));
  const show = text.trim() !== '' && settled && !get(errors, name);
  if (!show) return null;

  const fact = kind ? identifierFact(kind, text) : null;

  return (
    <span
      ref={ref}
      className="animate-in fade-in text-primary pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1.5 text-xs duration-300"
    >
      <Check aria-hidden className="animate-in zoom-in-50 size-4 shrink-0" />
      {/*
        Hidden from assistive tech for the same reason the tick is: this is
        confirmation of the expected, and `FieldError`'s live region is reserved
        for news. A screen-reader user has the value itself, which is the source
        every one of these facts is decoded from.
      */}
      {fact ? <span aria-hidden>{fact}</span> : null}
    </span>
  );
}
