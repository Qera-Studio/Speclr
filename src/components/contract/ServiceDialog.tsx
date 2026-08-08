'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { blankValue, isUnfilled, type BlankValues } from '@/lib/domain/contract/blanks';
import { contractScopes, type BlankScope } from '@/lib/domain/contract/completeness';
import { SCHEDULE_BY_KEY } from '@/lib/domain/contract/schedules';
import type { ContractService, LibraryLine } from '@/lib/domain/contract/service';

interface ServiceDialogProps {
  /** The library Service. Its lists are what can be ticked back on. */
  service: ContractService;
  /** The copy already on the contract, when this is an edit rather than an add. */
  part?: ContractService;
  /** The contract's blank values — the ones this Part owns are seeded from here. */
  blanks: BlankValues;
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
  onClose: () => void;
  onCommit: (part: ContractService, blanks: BlankValues) => void;
}

/**
 * One Service, configured on its own.
 *
 * The rail used to hold every Part's blanks, its twenty-odd exclusions and its
 * client inputs all at once, which meant four services made a sidebar nobody
 * could read. Here it is one Service at a time, wide enough that an exclusion
 * gets a whole line to itself.
 *
 * **Nothing is committed until the button.** The dialog edits a local copy of
 * the Part and its blank values, so Cancel genuinely cancels — including on an
 * edit, where the contract keeps what it had. The cost is that the A4 preview
 * does not move while the dialog is open; it is a modal over a dimmed page, so
 * there is nothing to watch anyway.
 *
 * Mounted only while open, and keyed on the Service, so opening one always
 * starts from what the contract currently holds rather than from whatever was
 * left in state last time.
 */
export default function ServiceDialog({
  service,
  part,
  blanks,
  exclusions,
  clientInputs,
  onClose,
  onCommit,
}: ServiceDialogProps) {
  const editing = part !== undefined;
  const [draft, setDraft] = useState<ContractService>(() => ({ ...(part ?? service) }));
  const [values, setValues] = useState<BlankValues>(() =>
    Object.fromEntries(
      Object.entries(blanks).filter(([key]) => key.startsWith(`part.${service.code}.`)),
    ),
  );

  /**
   * The blank-bearing sections of this Part alone. `contractScopes` wants a
   * whole contract, so it gets one holding just this Part — reusing the single
   * enumeration the sheet and the finalize guard read, rather than a second
   * list that could come to disagree with them.
   */
  const scopes: BlankScope[] = useMemo(
    () =>
      contractScopes({ parts: [draft], blanks: values }).filter((s) =>
        s.scope.startsWith('part.'),
      ),
    [draft, values],
  );

  const schedule = SCHEDULE_BY_KEY[draft.scheduleKey];
  const toggle = (key: 'exclusionIds' | 'clientInputIds', id: string, on: boolean) =>
    setDraft((prev) => ({
      ...prev,
      [key]: on ? [...prev[key], id].sort() : prev[key].filter((x) => x !== id),
    }));

  /**
   * What can be ticked: what the Service names, plus anything this Part still
   * carries. The union matters on an edit — a line unticked last time has to
   * stay on the list, or there is no way to put it back.
   */
  const candidates = (lines: LibraryLine[], ids: string[], chosen: string[]) =>
    lines.filter((line) => ids.includes(line.id) || chosen.includes(line.id));

  const lineList = (
    heading: string,
    note: string | null,
    lines: LibraryLine[],
    key: 'exclusionIds' | 'clientInputIds',
  ) => (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      <ul className="flex flex-col">
        {lines.map((line) => (
          <li key={line.id}>
            <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent/50">
              <Checkbox
                className="mt-0.5"
                checked={draft[key].includes(line.id)}
                onCheckedChange={(on) => toggle(key, line.id, Boolean(on))}
              />
              <span className="min-w-0 flex-1">{line.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-3xl" aria-label={draft.name}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <DialogTitle className="text-base">
              <span className="mr-2 text-muted-foreground tabular-nums">{draft.code}</span>
              {draft.name}
            </DialogTitle>
            <Badge variant="outline" className="shrink-0">
              {schedule.name}
            </Badge>
          </div>
          <DialogDescription>{draft.overview[0]}</DialogDescription>
          <dl className="mt-1 flex gap-6 text-xs">
            {[
              ['Included', draft.included.length],
              ['Excluded', draft.exclusionIds.length],
              ['Client inputs', draft.clientInputIds.length],
            ].map(([label, count]) => (
              <div key={label} className="flex gap-1.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </DialogHeader>

        <div className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto border-y py-4">
          {scopes.map((scope) => (
            <section key={scope.scope} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-muted-foreground">{scope.label}</h3>
              {scope.parsed.flatMap((parsed, i) =>
                parsed.blanks.map((blank, j) => (
                  <Field key={blank.key} orientation="horizontal">
                    <FieldLabel htmlFor={blank.key}>
                      {scope.rowLabels?.[i] ??
                        `${scope.label}${parsed.blanks.length > 1 ? ` (${j + 1})` : ''}`}
                    </FieldLabel>
                    <Input
                      id={blank.key}
                      size="form"
                      className="w-56 shrink-0"
                      aria-invalid={isUnfilled(values, blank) || undefined}
                      value={blankValue(values, blank)}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [blank.key]: e.target.value }))
                      }
                    />
                  </Field>
                )),
              )}
            </section>
          ))}

          {/*
            Pre-ticked as excluded, and you untick to bring something into scope
            (contract-system.md §6). That inversion is the point: forgetting to
            exclude something no longer means owing it.
          */}
          {lineList(
            'What is not included',
            'Untick to bring into scope — then price it in.',
            candidates(exclusions, service.exclusionIds, draft.exclusionIds),
            'exclusionIds',
          )}

          {lineList(
            'What the Client provides',
            null,
            candidates(clientInputs, service.clientInputIds, draft.clientInputIds),
            'clientInputIds',
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onCommit(draft, values)}>
            {editing ? 'Save changes' : 'Add to contract'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
