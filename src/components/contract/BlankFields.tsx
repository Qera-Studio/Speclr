'use client';

import { Info } from 'lucide-react';
import { Field, FieldLabel } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  blankKind,
  blankValue,
  isUnfilled,
  sanitiseBlank,
  type Blank,
  type BlankKind,
  type BlankValues,
} from '@/lib/domain/contract/blanks';
import { blankMeta } from '@/lib/domain/contract/blankMeta';
import type { BlankScope } from '@/lib/domain/contract/completeness';

/** Which on-screen keyboard a figure wants. Free text gets the ordinary one. */
const KEYBOARD: Record<BlankKind, 'decimal' | 'numeric' | undefined> = {
  money: 'decimal',
  percent: 'decimal',
  count: 'numeric',
  text: undefined,
};

interface BlankFieldProps {
  blank: Blank;
  /** The Limits/Fee row this figure sits in, where it is one. */
  rowLabel?: string;
  /** The paragraph it came from — the fallback label if no copy is written. */
  text: string;
  /** Its position in a row holding more than one figure. 0 where it is alone. */
  ordinal: number;
  values: BlankValues;
  onChange: (key: string, value: string) => void;
}

/**
 * One figure, as a form field.
 *
 * The label is two or three words and the sentence behind it moves into the ⓘ
 * (`blankMeta`). That is not only for width: a figure's consequence — that going
 * past a Limit is Additional Work, that a Timeline runs from the Client's inputs
 * — is the thing worth saying, and no label of any length says it.
 *
 * The ⓘ is a real focusable button rather than a `title=` attribute, which is
 * what the browser was drawing before. `title` cannot be reached by keyboard,
 * cannot be styled, and takes a second to appear with no way to say otherwise.
 *
 * The label row is a fixed height and truncates, so three fields side by side
 * always start their inputs on the same line — a one-line heading beside a
 * two-line one was pushing its input a row up.
 */
export function BlankField({
  blank,
  rowLabel,
  text,
  ordinal,
  values,
  onChange,
}: BlankFieldProps) {
  const kind = blankKind(blank, rowLabel);
  const { title, help } = blankMeta(blank.key, rowLabel, text);
  // Only a table row needs numbering: two figures in one row share its label,
  // where two in one sentence are written up separately.
  const label = rowLabel !== undefined && ordinal > 0 ? `${title} (${ordinal})` : title;

  return (
    <Field>
      <div className="flex h-5 w-full items-center gap-1.5">
        <FieldLabel htmlFor={blank.key} className="min-w-0 truncate">
          {label}
        </FieldLabel>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={`About ${label}`}
                className="shrink-0 rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              />
            }
          >
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{help}</TooltipContent>
        </Tooltip>
      </div>
      <Input
        id={blank.key}
        size="form"
        inputMode={KEYBOARD[kind]}
        aria-invalid={isUnfilled(values, blank) || undefined}
        value={blankValue(values, blank)}
        onChange={(e) => onChange(blank.key, sanitiseBlank(kind, e.target.value))}
      />
    </Field>
  );
}

/**
 * One section of figures — a Part's Limits, a clause's periods — three to a row.
 *
 * `FieldRow` measures the enclosing `FieldGroup`, not itself, so every caller
 * must put one above this.
 */
export function BlankSection({
  scope,
  values,
  onChange,
  heading = scope.label,
}: {
  scope: BlankScope;
  values: BlankValues;
  onChange: (key: string, value: string) => void;
  heading?: string;
}) {
  return (
    <section aria-label={heading} className="flex flex-col gap-3">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      <FieldRow columns={3}>
        {scope.parsed.flatMap((parsed, i) =>
          parsed.blanks.map((blank, j) => (
            <BlankField
              key={blank.key}
              blank={blank}
              rowLabel={scope.rowLabels?.[i]}
              text={scope.texts[i]}
              ordinal={parsed.blanks.length > 1 ? j + 1 : 0}
              values={values}
              onChange={onChange}
            />
          )),
        )}
      </FieldRow>
    </section>
  );
}
