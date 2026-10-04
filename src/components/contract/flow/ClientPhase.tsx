'use client';

import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import FieldInfo from '@/components/form/FieldInfo';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * Who the contract is for, and when it runs.
 *
 * **Picking the client is what creates the draft**, exactly as onboarding's
 * identity step creates the client row: the autosave writes the moment a
 * recipient exists, and every later phase is an update. That is why this is the
 * only phase with `needsRecord: false`.
 *
 * The source is a client today. Leads are the eventual source — somebody is a
 * lead until they sign, which is what a contract is for — and when that lands
 * this picker takes a different list and nothing else in the flow changes.
 */
export default function ClientPhase({
  clients,
  clientId,
  issueDate,
  effectiveDate,
  termMonths,
  onChange,
}: {
  clients: ClientRecord[];
  clientId: string;
  issueDate: string;
  effectiveDate?: string;
  termMonths?: number;
  onChange: (patch: {
    clientId?: string;
    issueDate?: string;
    effectiveDate?: string;
    termMonths?: number;
  }) => void;
}) {
  return (
    /*
      `FieldGroup`, not a bare `div`, and that is a bug fix rather than a tidy.

      `FieldRow`'s columns are a *container* query against `field-group`, so
      without this wrapper the query has nothing to resolve against and every
      row silently stacks at one column — which is exactly what the three date
      fields below were doing despite asking for `columns={3}`. An element
      cannot answer its own container query; the answer has to come from an
      ancestor, and this is it (`ui/field-row.tsx`).

      `size="form"` so the labels and controls take the flow's larger type,
      which is what the rest of the phase already asks for per control.
    */
    /*
      The width this phase wants is `CLIENT_PHASE_WIDTH`, passed to `FlowShell`
      by `ContractFlow` so the *panel* narrows with the form rather than the
      form floating in a card 116px wider than anything in it.
    */
    <FieldGroup size="form">
      <Field>
        <FieldLabel htmlFor="con-client">Client</FieldLabel>
        <Combobox
          id="con-client"
          size="form"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          value={clientId}
          onValueChange={(id) => onChange({ clientId: id })}
          placeholder="Select a client…"
          emptyMessage="No matching clients."
        />
      </Field>

      {/*
        `fit`, because all three controls here carry their own width: the two
        date fields are capped at the calendar they open, and the term is a
        two-digit number. Equal tracks sized every column to the widest one and
        left 24px of unused space inside each date cell, which pushed the row
        wider than anything in it needed.
      */}
      {/*
        `gap-4`, because `FieldRow`'s default `gap-8` does not fit here and the
        row is `fit`, so `max-content` tracks cannot absorb the difference by
        shrinking. Measured: the three controls are 240 + 240 + 196 = 676, and
        two 32px gaps put the row at 740 inside a 700px panel, which is the
        40px the term field hung past the combobox above it. 16px lands the row
        at 708, and `CLIENT_PHASE_WIDTH` is derived from that rather than the
        gap being taken off the scale (`docs/design.md` §1.2).
      */}
      <FieldRow columns={3} fit className="gap-4">
        <Field>
          <FieldLabel htmlFor="con-issue-date">Agreement date</FieldLabel>
          <DatePicker
            id="con-issue-date"
            size="form"
            value={issueDate}
            onValueChange={(date) => onChange({ issueDate: date })}
          />
        </Field>

        <Field>
          <FieldInfo
            htmlFor="con-effective-date"
            label="Effective date"
            optional
            info="When the work actually starts, if that is not the day the agreement is dated. It may be earlier: work often begins on a handshake and the paperwork catches up. Leave it empty and the agreement date is the effective date."
          />
          <DatePicker
            id="con-effective-date"
            size="form"
            value={effectiveDate ?? ''}
            onValueChange={(date) => onChange({ effectiveDate: date || undefined })}
          />
        </Field>

        <Field>
          <FieldInfo
            htmlFor="con-term-months"
            label="Term in months"
            optional
            info="How many months the engagement runs. Seeded from the client's recorded term, and editable here: what was agreed at onboarding is a starting point for this contract, not a fact about every contract."
          />
          <Input
            id="con-term-months"
            size="form"
            inputMode="numeric"
            value={termMonths === undefined ? '' : String(termMonths)}
            onChange={(e) => {
              // Digits only, sanitised on the way in rather than rejected
              // afterwards (`AGENTS.md`, input rules).
              const digits = e.target.value.replace(/\D/g, '');
              onChange({ termMonths: digits === '' ? undefined : Number(digits) });
            }}
            placeholder="12"
          />
        </Field>
      </FieldRow>
    </FieldGroup>
  );
}

/**
 * How wide this phase's panel is, handed to `FlowShell` by `ContractFlow`.
 *
 * The row below is two calendar-wide date fields (240px each, see
 * `CALENDAR_WIDTH`), two 16px gaps, and a term field wide enough for a label
 * reading "Term in months optional", which comes to 708. This is 788, because
 * it caps the **panel** and the panel carries `p-10`: 40px of padding on each
 * side that the form inside does not get. Capping at the row's own width left
 * it 80px short and squeezed the very fields this exists to fit.
 *
 * **The gaps are the row's, not this arithmetic's**, and that is what went
 * wrong once: `FieldRow` defaults to `gap-8`, so the row measured 740 inside a
 * 700px panel and the term field hung 40px past the combobox above it. The row
 * is `fit`, so `max-content` tracks cannot shrink to absorb it. The gap is
 * stated there and the cap derived from it here; they are checked by
 * measurement in `e2e/contract-flow.spec.ts` rather than by this sum.
 *
 * It lives here rather than in the shell because it is a fact about this
 * form's controls, and it is a number rather than a shrink-to-fit because the
 * panel cannot shrink to its content: every step inside it is `w-full`, so
 * `w-fit` and `w-max` both collapse the pair to the padding alone. See
 * `FlowShell`'s `width`.
 *
 * Checked by measurement, not by this arithmetic: `e2e/contract-flow.spec.ts`
 * asserts the combobox and the row below it end together, which is the thing
 * actually worth holding.
 */
export const CLIENT_PHASE_WIDTH = 'max-w-[788px]';
