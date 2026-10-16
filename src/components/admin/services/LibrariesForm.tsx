'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { partSectionLabel } from '@/lib/domain/contract/completeness';
import type { ContractService, LibraryLine } from '@/lib/domain/service';
import { useSectionSave } from './useSectionSave';

/**
 * What can be ticked: every live line, plus any archived line this Service
 * still cites. Archived means "leaves new contracts", so it is not offered;
 * but a Service already naming it needs to keep seeing it, or there is no way
 * to untick it. The same union `ServiceDialog` applies on a contract.
 */
const candidates = (lines: LibraryLine[], cited: string[]) =>
  lines.filter((line) => !line.archived || cited.includes(line.id));

function TickList({
  legend,
  lines,
  chosen,
  onToggle,
}: {
  legend: string;
  lines: LibraryLine[];
  chosen: Set<string>;
  onToggle: (id: string, on: boolean) => void;
}) {
  return (
    <FieldSet>
      <FieldLegend>{legend}</FieldLegend>
      <ul className="flex flex-col">
        {lines.map((line) => (
          <li key={line.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-body hover:bg-accent/50">
              <Checkbox
                className="mt-0.5"
                checked={chosen.has(line.id)}
                onCheckedChange={(on) => onToggle(line.id, Boolean(on))}
              />
              <span className="min-w-0 flex-1">{line.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </FieldSet>
  );
}

/**
 * Which exclusion and client-input lines a Service names.
 *
 * Two tick lists over the shared libraries, the `ServiceDialog` shape. Posts
 * the libraries section and nothing else, so the wording, the menu and the
 * rate are out of its reach (`saveServiceSection`).
 */
export default function LibrariesForm({
  service,
  exclusions,
  clientInputs,
}: {
  service: ContractService;
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
}) {
  const { pending, serverError, save } = useSectionSave(service.code, 'libraries');
  const [excluded, setExcluded] = useState(() => new Set(service.exclusionIds));
  const [provided, setProvided] = useState(() => new Set(service.clientInputIds));

  const toggle = (set: (f: (prev: Set<string>) => Set<string>) => void) => (id: string, on: boolean) =>
    set((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save({
          exclusionIds: [...excluded].sort(),
          clientInputIds: [...provided].sort(),
        });
      }}
      noValidate
      className="flex flex-col gap-6"
    >
      <TickList
        legend={partSectionLabel('exclusions', service.scheduleKey)}
        lines={candidates(exclusions, service.exclusionIds)}
        chosen={excluded}
        onToggle={toggle(setExcluded)}
      />
      <TickList
        legend={partSectionLabel('clientInputs', service.scheduleKey)}
        lines={candidates(clientInputs, service.clientInputIds)}
        chosen={provided}
        onToggle={toggle(setProvided)}
      />

      {serverError ? (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button variant="primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save libraries'}
        </Button>
      </div>
    </form>
  );
}
