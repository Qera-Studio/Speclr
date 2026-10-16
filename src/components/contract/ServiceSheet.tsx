'use client';

import { Fragment, useMemo, useState } from 'react';
import { DrawerSheet } from '@/components/ui/drawer-sheet';
import { DrawerToolbar } from '@/components/patterns/DrawerToolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldGroup, FieldSeparator } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { BlankSection } from '@/components/contract/BlankFields';
import { blanksOf, isUnfilled, type BlankValues } from '@/lib/domain/contract/blanks';
import { contractScopes, type BlankScope } from '@/lib/domain/contract/completeness';
import { SCHEDULE_BY_KEY } from '@/lib/domain/contract/schedules';
import type { ContractService, LibraryLine } from '@/lib/domain/service';

interface ServiceSheetProps {
  /** The library Service. Its lists are what can be ticked back on. */
  service: ContractService;
  /** The copy already on the contract, when this is an edit rather than an add. */
  part?: ContractService;
  /** The contract's blank values — the ones this Part owns are seeded from here. */
  blanks: BlankValues;
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
  /**
   * Every service on the contract, in the order the list shows, for the pager.
   *
   * Paging exists here for the same reason it does in the clause drawer: the
   * phase's job is to work through every service, and doing that by closing
   * the sheet, finding the next row and opening it is three actions for one
   * thought.
   */
  siblings?: ContractService[];
  /**
   * Expanded into a dialog-sized panel, or the ordinary side drawer.
   *
   * Owned by the caller, because this component is keyed on the service and
   * would lose the state on every page. Same bug and same fix as
   * `ClauseLibrary`'s `expanded`.
   */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Shows another service in this sheet. The pager's whole job. */
  onOpen?: (code: string) => void;
  onClose: () => void;
  onCommit: (part: ContractService, blanks: BlankValues) => void;
}

/**
 * One Service, configured on its own, in a drawer beside the ledger it came
 * from.
 *
 * **This was a dialog, and the change is not cosmetic.** A modal dimmed the
 * ledger it was opened from, which is the list of every other service still
 * waiting: the one thing worth seeing while deciding whether this one is done.
 * A `md` sheet is 60% of the inset card (`docs/design.md` §2.11), so the rows
 * behind it stay legible.
 *
 * **The commit gate is relaxed, and that is the important half.** The dialog
 * refused to commit until every blank on the Part was filled, which made "a
 * Part joins the contract complete or not at all" true by construction. Parts
 * seeded from the client record never pass through this button, so that
 * guarantee moved to the phase (`contract/ledger.ts`): the ledger counts what
 * is missing and phase 3 refuses to advance. Keeping the old gate as well would
 * mean a seeded Part could not be edited at all without being finished in one
 * sitting, which is the opposite of what the ledger is for.
 *
 * **The fee is here**, since 18 September 2026. It was excluded on the
 * grounds that it belonged to "the phase that decides what things cost", and
 * no such phase ever rendered it: see the `scopes` docblock below for the four
 * files that each handed it to a neighbour.
 *
 * Mounted only while open, and keyed on the Service, so opening one always
 * starts from what the contract currently holds rather than from whatever was
 * left in state last time.
 */
export default function ServiceSheet({
  service,
  part,
  blanks,
  exclusions,
  clientInputs,
  siblings = [],
  expanded = false,
  onExpandedChange,
  onOpen,
  onClose,
  onCommit,
}: ServiceSheetProps) {
  const [draft, setDraft] = useState<ContractService>(() => ({ ...(part ?? service) }));
  const [values, setValues] = useState<BlankValues>(() =>
    Object.fromEntries(
      Object.entries(blanks).filter(([key]) => key.startsWith(`part.${service.code}.`)),
    ),
  );

  /**
   * The blank-bearing sections of this Part alone, **fee included**.
   *
   * `contractScopes` wants a whole contract, so it gets one holding just this
   * Part — reusing the single enumeration the sheet and the finalize guard
   * read, rather than a second list that could come to disagree with them.
   *
   * **The fee used to be filtered out here, and that was the bug.** This file
   * said it "belongs to the phase that decides what things cost"; `ScopePhase`
   * said it "stays with the terms phase"; `summary.ts` excluded it too; and
   * `ContractFlow` dropped every `part.` scope from the terms form. Four
   * locally reasonable deferrals, and between them the fee had no screen at
   * all, while `phases.ts` went on requiring it to advance. So Terms asked for
   * a figure that could not be typed anywhere and its button could never
   * enable.
   *
   * This sheet is the right home because it is the one surface *both* routes
   * reach: a service picked on the Services phase opens it on selection, and a
   * service seeded from the client record or a quotation is opened from the
   * Scope ledger's pencil. A fee field on the picker alone would miss every
   * seeded service, which is the case that never passes through a chooser.
   */
  const scopes: BlankScope[] = useMemo(
    () =>
      contractScopes({ parts: [draft], blanks: values }).filter((s) =>
        s.scope.startsWith('part.'),
      ),
    [draft, values],
  );

  /** What is still empty, reported rather than enforced. See the docblock. */
  const missing = scopes.flatMap((s) => blanksOf(s.parsed)).filter((b) => isUnfilled(values, b));

  /**
   * The service either side of this one, in the order the list shows.
   *
   * By position, not by code: a contract holds an arbitrary subset of the
   * catalogue, so arithmetic on `code` would page into a service that is not
   * on it.
   */
  const at = siblings.findIndex((s) => s.code === service.code);
  const previous = at > 0 ? siblings[at - 1] : undefined;
  const next = at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : undefined;

  /**
   * Paging commits first.
   *
   * This sheet saves on a button rather than a debounce, so leaving it any
   * other way would silently drop whatever was typed. The clause drawer
   * flushes its autosave at exactly this point and for exactly this reason;
   * here the equivalent of a flush is the commit itself.
   */
  const page = (to: ContractService) => {
    onCommit(draft, values);
    onOpen?.(to.code);
  };

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
    <DrawerSheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      /*
        The clause drawer's chrome, and now literally the same component
        rather than a copy of it. This file used to say "the clause drawer's
        chrome, exactly" and then rebuild it; `DrawerSheet` and
        `DrawerToolbar` are what that comment was pointing at.
      */
      size={expanded ? 'lg' : 'md'}
      float
      overlayClassName={cn(
        'supports-backdrop-filter:backdrop-blur-none',
        expanded ? 'bg-black/40' : 'bg-black/10',
      )}
      aria-label={draft.name}
      title={draft.name}
      /*
        The code sits with the Schedule rather than prefixing the name, so the
        two identifiers are together instead of one of them in the title.
      */
      titleAside={
        <>
          <Badge variant="outline" className="tabular-nums">
            {draft.code}
          </Badge>
          <Badge variant="outline">{schedule.name}</Badge>
        </>
      }
      description={draft.overview[0]}
      toolbar={
        <DrawerToolbar
          data-testid="service-controls"
          onBack={onClose}
          backLabel="Back to the service list"
          expanded={onExpandedChange ? expanded : undefined}
          onExpandedChange={onExpandedChange}
          expandLabel="this service"
          /*
            By position in the list, never by code arithmetic: service codes
            are catalogue identity and a contract holds an arbitrary subset of
            them, so `code + 1` would page into a service not on this contract.

            No right-hand group. The clause drawer's is download, archive and
            delete, and none has a counterpart here: a Part is removed from the
            list behind this sheet, not from inside it.
          */
          paging={
            onOpen && siblings.length > 1
              ? {
                  onPage: (by) => {
                    const to = by < 0 ? previous : next;
                    if (to) page(to);
                  },
                  hasPrevious: Boolean(previous),
                  hasNext: Boolean(next),
                  position: `${at + 1} of ${siblings.length}`,
                  previousLabel: 'Previous service',
                  nextLabel: 'Next service',
                }
              : undefined
          }
        />
      }
      footer={
        <>
          {missing.length > 0 ? (
            <p className="mr-auto text-xs text-muted-foreground" role="status">
              {missing.length} field{missing.length === 1 ? '' : 's'} still empty
            </p>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {/*
            Never disabled. What is missing is reported above and counted on
            the ledger behind this drawer; the phase is what refuses to advance.

            Saving closes, and it says so here rather than relying on a
            `SheetClose` wrapper: `onCommit` writes the Part but does not clear
            the parent's `openService`, so the close has to be asked for. It
            was lost for one run when this moved to `DrawerSheet`, and
            `ContractFlow.test.tsx` caught it.
          */}
          <Button variant="primary"
            type="button"
            onClick={() => {
              onCommit(draft, values);
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      {/*
        `FieldGroup` is the container the rows measure against — `FieldRow`
        asks `@2xs/field-group`, and an element cannot answer its own query.
      */}
      <FieldGroup size="form">
        {scopes.map((scope, i) => (
          <Fragment key={scope.scope}>
            {i > 0 ? <FieldSeparator /> : null}
            <BlankSection
              scope={scope}
              values={values}
              onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))}
            />
          </Fragment>
        ))}

        {scopes.length > 0 ? <FieldSeparator /> : null}

        {/*
          Pre-ticked as excluded, and you untick to bring something into
          scope (contract-system.md §6). That inversion is the point:
          forgetting to exclude something no longer means owing it.
        */}
        {lineList(
          'What is not included',
          'Untick to bring into scope — then price it in.',
          candidates(exclusions, service.exclusionIds, draft.exclusionIds),
          'exclusionIds',
        )}

        <FieldSeparator />

        {lineList(
          'What the Client provides',
          null,
          candidates(clientInputs, service.clientInputIds, draft.clientInputIds),
          'clientInputIds',
        )}
      </FieldGroup>
    </DrawerSheet>
  );
}
