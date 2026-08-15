'use client';

import '@/lib/zod-config';
import { useCallback, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AddButton } from '@/components/ui/add-button';
import { RemoveButton } from '@/components/ui/remove-button';
import { Combobox } from '@/components/ui/combobox';
import { Field, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import FieldInfo from '@/components/form/FieldInfo';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ACCESS_KINDS, type ClientAccessRef } from '@/lib/domain/client';
import { StepForm, useStepSave, type StepProps } from './stepKit';

const KIND_LABELS: Record<string, string> = {
  brand_assets: 'Brand assets — logos, fonts, guidelines',
  domain_registrar: 'Domain registrar',
  dns: 'DNS',
  hosting: 'Hosting',
  analytics: 'Analytics',
  search_console: 'Search Console',
  ad_account: 'Ad account',
  social: 'Social handle',
  repository: 'Repository',
  deployment: 'Deployment',
  other: 'Other',
};

let nextId = 0;
const newId = () => `access-${Date.now()}-${(nextId += 1)}`;

/**
 * Delivery & access — where each account lives.
 *
 * **The field is called “Where it lives”, and that is the entire design.** It
 * records a *pointer* — a vault name, an admin console, the person who holds
 * it — and never a credential. speclr has no secret storage, no envelope
 * encryption and no rotation; a password typed into a client record would turn
 * a document tool into a breach, and would sit in plain text in Postgres,
 * in every backup, and in every future export.
 *
 * The warning is on the page rather than in a comment because the person who
 * would paste a password is the operator, not the next developer.
 */
export default function AccessStep({ client, onSaved, submitLabel }: StepProps) {
  const [rows, setRows] = useState<ClientAccessRef[]>(() => client?.access ?? []);
  const [submitting, setSubmitting] = useState(false);

  const toPayload = useCallback(
    () => rows.filter((row) => row.label.trim() !== '' && row.location.trim() !== ''),
    [rows],
  );
  const { serverError, save } = useStepSave<void>(client, 'access', onSaved, toPayload);

  const update = (id: string, patch: Partial<ClientAccessRef>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    await save(undefined as void);
    setSubmitting(false);
  };

  return (
    <StepForm
      onSubmit={onSubmit}
      serverError={serverError}
      submitting={submitting}
      submitLabel={submitLabel}
    >
      {/* `variant="warning"`, not `note`: this one is a rule, and breaking it
          turns a document tool into a breach. */}
      <Alert variant="warning">
        <ShieldAlert aria-hidden />
        <AlertDescription>
          Record <strong>where</strong> a credential lives — a vault, an admin
          console, a person. Never the credential itself: nothing here is
          encrypted, and a password typed in would sit in plain text in every
          backup.
        </AlertDescription>
      </Alert>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing here yet. Add the accounts this engagement will touch — the
          domain, the DNS, the hosting, the analytics — so nobody has to go
          looking when the work starts.
        </p>
      ) : null}

      {rows.map((row, index) => (
        <FieldSet key={row.id} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <FieldLegend variant="label">Access {index + 1}</FieldLegend>
            <RemoveButton
              label={`Remove access ${index + 1}`}
              onConfirm={() => setRows((current) => current.filter((r) => r.id !== row.id))}
            />
          </div>

          <FieldRow>
            <Field>
              <FieldInfo
                htmlFor={`${row.id}-kind`}
                label="Kind"
                info="What sort of account this is — the domain registrar, the DNS, the hosting, an ad account. Pick the closest; “Other” is fine."
                infoLabel="What is Kind?"
              />
              <Combobox
                id={`${row.id}-kind`}
                size="form"
                options={ACCESS_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
                value={row.kind}
                onValueChange={(value) =>
                  update(row.id, { kind: value as ClientAccessRef['kind'] })
                }
                placeholder="Select a kind…"
                emptyMessage="No matching kinds."
              />
            </Field>

            <Field>
              <FieldInfo
                htmlFor={`${row.id}-label`}
                label="What it is"
                info="The account's own name, so it can be told apart from the others of its kind — the domain itself, the handle, the property name."
                infoLabel="What goes in “What it is”?"
              />
              <Input
                id={`${row.id}-label`}
                size="form"
                placeholder="clayora.com"
                value={row.label}
                onChange={(event) => update(row.id, { label: event.target.value })}
              />
            </Field>
          </FieldRow>

          <Field>
            <FieldInfo
              htmlFor={`${row.id}-location`}
              label="Who holds it, or where it is kept"
              info="A pointer, never the credential. A vault name, an admin console, or simply the person who has it — “Their IT lead holds it” is a complete answer."
              infoLabel="What goes here?"
            />
            <Input
              id={`${row.id}-location`}
              size="form"
              placeholder="1Password → Clayora vault"
              value={row.location}
              onChange={(event) => update(row.id, { location: event.target.value })}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={`${row.id}-notes`}>Notes</FieldLabel>
            <Textarea
              id={`${row.id}-notes`}
              rows={2}
              placeholder="Transfer lock comes off after 60 days."
              value={row.notes ?? ''}
              onChange={(event) => update(row.id, { notes: event.target.value })}
            />
          </Field>
        </FieldSet>
      ))}

      <AddButton
        type="button"
        onClick={() =>
          setRows((current) => [
            ...current,
            { id: newId(), kind: 'other', label: '', location: '', notes: '' },
          ])
        }
      >
        Add access
      </AddButton>
    </StepForm>
  );
}
