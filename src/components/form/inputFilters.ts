import type { UseFormRegisterReturn } from 'react-hook-form';
import { normalizeRupeeInput } from '@/lib/domain/money';

/**
 * Filters for registered inputs — wrappers round a `register()` result that
 * clean the value on its way into react-hook-form, so the *stored* value is
 * always the canonical one and not merely what is displayed.
 */

/**
 * Makes a registered field accept digits and nothing else.
 *
 * Wrap a `register()` result: `<Input {...numericField(register('daysPaid'))} />`.
 * A helper rather than a component because every form here already spreads
 * `register(...)`, and converting them all to `Controller` to gain a controlled
 * input would be a far larger change for the same result.
 *
 * The sanitising happens on the event, before react-hook-form sees it, so the
 * *stored* value is always clean — not merely the displayed one. That
 * distinction is the whole point, and it is the same reason `normalizeIfscInput`
 * upper-cases on change rather than with CSS `text-transform`: a field that only
 * looks right while holding something else is worse than one that looks wrong.
 *
 * The caret does not jump, because a rejected keystroke leaves the value
 * unchanged and the browser keeps the caret where it was. Reordering or
 * inserting characters (as digit *grouping* would) is what moves it — see the
 * separate, caret-restoring amount input in `DocumentFilters`, which is the only
 * place that displays grouped figures while typing.
 *
 * - `integer` — digits only. Day counts, GST rate, account and PF numbers.
 * - `money`   — digits and one decimal point, at most two places, via
 *               `normalizeRupeeInput`. Never a minus: no amount on any document
 *               here may be negative.
 */
export function numericField(
  registration: UseFormRegisterReturn,
  mode: 'integer' | 'money' = 'integer',
): UseFormRegisterReturn & { inputMode: 'numeric' | 'decimal' } {
  return {
    ...registration,
    inputMode: mode === 'money' ? 'decimal' : 'numeric',
    onChange: (event: { target: { value?: string } }) => {
      const raw = String(event.target.value ?? '');
      event.target.value =
        mode === 'money' ? normalizeRupeeInput(raw) : raw.replace(/\D/g, '');
      return registration.onChange(event);
    },
  };
}

/**
 * Upper-cased and unspaced: the canonical written form of an identifier.
 *
 * Exported so the controlled inputs in `form/fields.tsx` normalise identically
 * to the registered ones below. Two copies of this one line is how a PAN typed
 * into one form differs from the same PAN typed into another.
 */
export function upperNoSpace(value: string | undefined): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * Makes a registered field hold upper-case, unspaced text.
 *
 * For identifiers that have exactly one canonical written form — a PAN, a PF
 * account number — where lower case is not a variant but a typo. Upper-casing
 * on change rather than with CSS `text-transform` for the same reason
 * `numericField` sanitises on change: what is stored has to be what is read,
 * and these values print verbatim on a statutory wage slip.
 *
 * Spaces go too, because these are routinely copied out of a PDF or an SMS
 * with them, and a trailing space is invisible in an input and fatal to a
 * format check.
 */
export function uppercaseField(
  registration: UseFormRegisterReturn,
): UseFormRegisterReturn & {
  autoCapitalize: 'characters';
  autoCorrect: 'off';
  spellCheck: false;
} {
  return {
    ...registration,
    autoCapitalize: 'characters',
    autoCorrect: 'off',
    spellCheck: false,
    onChange: (event: { target: { value?: string } }) => {
      event.target.value = upperNoSpace(event.target.value);
      return registration.onChange(event);
    },
  };
}

/**
 * Makes a registered field write itself the way the value is conventionally
 * written: `83-0000000`, `51 824 753 556`, `PO-2026-0881`.
 *
 * The rule from `AGENTS.md`: a field types the way the value is written, on
 * every keystroke rather than on blur, because a formatted placeholder over an
 * unformatted value tells the reader two different things about one number.
 *
 * The `format` passed in must be **idempotent and prefix-safe**: it runs
 * against a value it has already formatted, and against half a number. The ones
 * in `taxIds/foreign.ts` strip their own separators first, which is what makes
 * that true.
 *
 * **The caret moves, and that is why this is separate from `uppercaseField`.**
 * Inserting a character shifts everything after it, so typing in the *middle*
 * of an already-formatted value would leave the caret behind. This puts it back
 * by counting the value characters before it rather than the raw offset, which
 * is the same technique the grouped amount input in `DocumentFilters` uses.
 */
export function formattedField(
  registration: UseFormRegisterReturn,
  format: ((value: string) => string) | undefined,
): UseFormRegisterReturn & {
  autoCapitalize: 'characters';
  autoCorrect: 'off';
  spellCheck: false;
} {
  return {
    ...registration,
    autoCapitalize: 'characters',
    autoCorrect: 'off',
    spellCheck: false,
    onChange: (event: { target: { value?: string; selectionStart?: number | null; setSelectionRange?: (a: number, b: number) => void } }) => {
      const raw = String(event.target.value ?? '');
      const next = format ? format(raw) : raw.toUpperCase();

      if (next !== raw && typeof event.target.selectionStart === 'number') {
        // How many characters that are not separators sit before the caret.
        // That count survives reformatting; a raw offset does not.
        const before = raw.slice(0, event.target.selectionStart).replace(/[^0-9A-Za-z]/g, '').length;
        let seen = 0;
        let caret = next.length;
        for (let i = 0; i < next.length; i += 1) {
          if (seen === before) {
            caret = i;
            break;
          }
          if (/[0-9A-Za-z]/.test(next[i])) seen += 1;
        }
        event.target.value = next;
        event.target.setSelectionRange?.(caret, caret);
      } else {
        event.target.value = next;
      }
      return registration.onChange(event);
    },
  };
}
