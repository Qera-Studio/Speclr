'use client';

import { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Download, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ConfirmActionButton } from '@/components/patterns/ConfirmAction';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';
import FieldInfo, { LegendInfo } from '@/components/patterns/FieldInfo';
import { Input } from '@/components/ui/input';
import { IconAction } from '@/components/patterns/IconAction';
import { EditButton } from '@/components/patterns/RowActions';
import RecordTable from '@/components/patterns/RecordTable';
import { libraryMarkdown } from '@/lib/domain/contract/clauseMarkdown';
import { parseBody, serialiseBody } from '@/lib/domain/contract/clauseBody';
import {
  MSA_CLAUSES,
  MSA_CLAUSE_SUMMARIES,
  type ClauseInput,
} from '@/lib/domain/contract/msa';
import { cn, NIL } from '@/lib/utils';
import { Specimen } from '../Specimen';
import type { LibraryEntry } from '../catalogue';
import { ExperimentDrawer, ExperimentDrawerToolbar } from './ExperimentDrawer';
import ClauseBodyEditor, {
  ClauseBodyActions,
  useClauseBody,
} from './ExperimentClauseBodyEditor';
import ClauseCitations from './ExperimentClauseCitations';

/**
 * The clause library's drawer, duplicated for the drawer experiment.
 *
 * `ClauseDrawer` from `admin/clauses/ClauseLibrary.tsx`, line for line, on the
 * forked frame and the forked body editor in this folder. The scrim weights,
 * the expand to `lg`, the toolbar's five controls, the debounced save and its
 * quiet status footer are all the real ones.
 *
 * The one difference is where a save goes. The real drawer writes to the
 * `clauses` table, which is the source text of every contract drafted after it
 * (`CONTEXT.md` §5c), so this one writes to state: the seeded 31 clauses,
 * changed until the page is reloaded and nowhere else.
 */
export function ClauseDrawerSpecimens({ entry }: { entry: LibraryEntry }) {
  const [only] = entry.variants;
  return (
    <Specimen name={only.name} note={only.note} fill>
      <ClauseLibrarySpecimen />
    </Specimen>
  );
}

const SEEDED: ClauseInput[] = MSA_CLAUSES.map((clause) => ({
  ...clause,
  summary: MSA_CLAUSE_SUMMARIES[clause.number],
  archived: false,
}));

function ClauseLibrarySpecimen() {
  const [clauses, setClauses] = useState(SEEDED);
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const editing = clauses.find((c) => c.number === open) ?? null;

  const save = (clause: ClauseInput) =>
    setClauses((all) => all.map((c) => (c.number === clause.number ? clause : c)));
  const remove = (number: number) =>
    setClauses((all) => all.filter((c) => c.number !== number));

  return (
    <div className="flex w-full flex-col gap-3">
      <RecordTable
        rows={clauses}
        id={(clause) => String(clause.number)}
        noun="clause"
        caption="Every clause of the Master Agreement, in number order"
        open={(clause) => ({ onClick: () => setOpen(clause.number) })}
        rowLabel={(clause) => clause.heading}
        isActive={(clause) => open === clause.number}
        columns={[
          {
            key: 'number',
            label: 'No.',
            width: 'w-16',
            className: 'tabular-nums',
            cell: (clause) => clause.number,
          },
          {
            key: 'heading',
            label: 'Heading',
            width: 'w-64',
            className: 'font-medium',
            cell: (clause) =>
              clause.archived ? (
                <span className="flex items-center gap-2">
                  {clause.heading}
                  <Badge variant="secondary" className="font-normal">
                    Archived
                  </Badge>
                </span>
              ) : (
                clause.heading
              ),
          },
          {
            key: 'summary',
            label: 'Description',
            trunc: true,
            cell: (clause) =>
              clause.summary ?? <span className="text-muted-foreground">{NIL}</span>,
          },
        ]}
        actions={(clause) => (
          <EditButton label={`Edit ${clause.heading}`} onClick={() => setOpen(clause.number)} />
        )}
      />

      {editing ? (
        <ClauseDrawer
          key={editing.number}
          clause={editing}
          known={new Set(clauses.map((c) => c.number))}
          library={clauses}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onOpen={setOpen}
          onSave={save}
          onDelete={remove}
          onClose={() => {
            setOpen(null);
            setExpanded(false);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * `useClauseAutosave` with the server taken out: the same 800ms debounce, the
 * same four states, the same baseline seeded on first render so opening a
 * clause is not an edit, and the same flush before anything final.
 */
function useLocalAutosave(draft: ClauseInput, save: (clause: ClauseInput) => void) {
  const [state, setState] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const key = JSON.stringify(draft);
  const lastSaved = useRef(key);
  const latest = useRef(draft);
  latest.current = draft;
  const frozen = useRef(false);

  const write = () => {
    save(latest.current);
    lastSaved.current = JSON.stringify(latest.current);
    setState('saved');
  };

  useEffect(() => {
    if (frozen.current || key === lastSaved.current) return;
    setState('unsaved');
    const timer = setTimeout(write, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const flush = () => {
    frozen.current = true;
    if (key !== lastSaved.current) write();
  };

  return { state, flush };
}

function ClauseDrawer({
  clause,
  known,
  library,
  expanded,
  onExpandedChange,
  onOpen,
  onSave,
  onDelete,
  onClose,
}: {
  clause: ClauseInput;
  known: Set<number>;
  library: ClauseInput[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onOpen: (number: number) => void;
  onSave: (clause: ClauseInput) => void;
  onDelete: (number: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(clause);
  const bodyRows = useClauseBody(() => parseBody(clause.body));
  const parts = bodyRows.parts;
  const body = serialiseBody(parts, clause.number);

  const autosave = useLocalAutosave({ ...draft, body }, onSave);

  const runFinal = (job: () => void) => {
    autosave.flush();
    job();
    onClose();
  };

  const at = library.findIndex((c) => c.number === clause.number);
  const previous = at > 0 ? library[at - 1] : undefined;
  const next = at >= 0 && at < library.length - 1 ? library[at + 1] : undefined;

  const page = (to: ClauseInput | undefined) => {
    if (!to) return;
    autosave.flush();
    onOpen(to.number);
  };

  const download = () => {
    const all = [{ ...draft, body }, ...library.filter((c) => c.number !== clause.number)];
    const url = URL.createObjectURL(
      new Blob([libraryMarkdown(all)], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'master-service-agreement.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ExperimentDrawer
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      overlayClassName={cn(
        'supports-backdrop-filter:backdrop-blur-none',
        expanded ? 'bg-black/40' : 'bg-black/10',
      )}
      size={expanded ? 'lg' : 'md'}
      float
      /*
        One step down the grey ramp from the frame's `--popover` (gray-50 to
        gray-100 in light, gray-900 to gray-950 in dark), so the white layer
        below reads as raised off it. The steps are named directly because no
        role holds that pair; if this design wins, it becomes a token.
      */
      className="bg-[var(--gray-100)] dark:bg-[var(--gray-950)]"
      /*
        One left edge for everything: the title, the labels inside the layer,
        and the citations below it all start 20px in. The toolbar sits at 16px
        because its buttons carry their own inset, which puts the glyphs on the
        same line.
      */
      headerClassName="gap-0.5 px-5 pt-3 pb-4 [&_[data-slot=sheet-title]]:text-lg [&_[data-slot=sheet-title]]:font-semibold"
      /*
        The save state sits beside the title it is about, as a badge: amber
        while there are changes not yet written, quiet grey while saving and
        once saved. `aria-hidden`, so the heading's accessible name stays the
        clause's heading; the announcement is the status line in the footer.
      */
      title={
        <span className="flex items-center gap-2">
          {draft.heading || `Clause ${clause.number}`}
          <SaveBadge state={autosave.state} />
        </span>
      }
      toolbar={
        <ExperimentDrawerToolbar
          data-testid="clause-controls"
          className="px-4 pt-3 pb-0"
          onBack={onClose}
          backLabel="Back to the clause list"
          expanded={expanded}
          onExpandedChange={onExpandedChange}
          expandLabel="this clause"
          paging={{
            onPage: (by) => page(by < 0 ? previous : next),
            hasPrevious: Boolean(previous),
            hasNext: Boolean(next),
            position: `Clause ${clause.number}`,
            previousLabel: 'Previous clause',
            nextLabel: 'Next clause',
          }}
          actions={
            <>
              <IconAction
                icon={Download}
                label="Download the library as Markdown"
                tooltip="Download as MD"
                onClick={download}
              />
              <IconAction
                icon={clause.archived ? ArchiveRestore : Archive}
                label={clause.archived ? 'Restore this clause' : 'Archive this clause'}
                tooltip={clause.archived ? 'Restore' : 'Archive'}
                onClick={() =>
                  runFinal(() => onSave({ ...draft, body, archived: !clause.archived }))
                }
              />
              <ConfirmActionButton
                variant="ghost"
                size="sm"
                label="Delete this clause"
                tooltip="Delete"
                icon={<Trash2 className="size-3.5" />}
                title={`Delete clause ${clause.number}`}
                description={`This removes “${clause.heading}” from this page until it is reloaded. On the real library, number ${clause.number} would be retired for good.`}
                confirmLabel="Delete"
                confirmVariant="destructive"
                onConfirm={() => runFinal(() => onDelete(clause.number))}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              />
            </>
          }
        />
      }
      quietFooter
      footer={
        <p
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {autosave.state === 'saving'
            ? 'Saving…'
            : autosave.state === 'unsaved'
              ? 'Unsaved changes'
              : autosave.state === 'saved'
                ? 'Saved'
                : ''}
        </p>
      }
      /*
        The frame's body stops scrolling: the white layer inside it scrolls
        instead, and the citations and add buttons sit below that layer on the
        sheet itself, so they stay put while the clause moves.
      */
      bodyClassName="flex flex-col gap-0 overflow-hidden px-1 pt-0 pb-1"
    >
      {/*
        The white layer: Heading through the last body row. `--background` is
        white in light and gray-900 in dark, one step up from the sheet in both.
        No edge: the step in fill is the whole separation. Inputs keep their
        own white fill, so on this layer they read by their border alone.

        It does not scroll. The body rows do, inside `ClauseBodyEditor`'s own
        list, so Heading, Description and the Body label stay in view while a
        long clause moves under them. That needs the chain from here down to
        that list height-bounded (`min-h-0 flex-1` at each step).

        The app's own radii throughout: the sheet's 3.6, this layer's and the
        inputs' 4.8. Fields are 20px apart and each label 8px above its input:
        one rhythm, no exceptions. Labels are 12px at weight 400, set by slot
        so FieldInfo and LegendInfo are not forked.
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden rounded-md bg-background px-4 pt-5 pb-4 [&_[data-slot=field-label]]:font-normal [&_[data-slot=field-legend]]:font-normal">
      <Field>
        <FieldLabel htmlFor="clause-heading">Heading</FieldLabel>
        <Input
          id="clause-heading"
          size="form"
          value={draft.heading}
          onChange={(e) => setDraft({ ...draft, heading: e.target.value })}
        />
      </Field>

      <Field>
        <FieldInfo
          htmlFor="clause-summary"
          label="Description"
          info="A few words for this list. It never appears in a contract."
          infoLabel="Where does the description show?"
        />
        <Input
          id="clause-summary"
          size="form"
          value={draft.summary ?? ''}
          placeholder="What this clause does"
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
        />
      </Field>

      <FieldSet className="min-h-0 flex-1 gap-2">
        <LegendInfo
          info="Numbers come from the order of the rows, so moving a point renumbers the rest."
          label="Where do the numbers come from?"
        >
          Body
        </LegendInfo>
        <ClauseBodyEditor clauseNumber={clause.number} {...bodyRows.editor} />
      </FieldSet>
      </div>

      <div data-testid="clause-body-actions" className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-3">
        <div className="mr-auto">
          <ClauseCitations body={body} known={known} self={clause.number} />
        </div>
        <ClauseBodyActions {...bodyRows.actions} />
      </div>
    </ExperimentDrawer>
  );
}

/**
 * The save state as a badge beside the title.
 *
 * Rectangular, at the app's 3.6px radius, and amber: the app's own
 * `--warning`, softened everywhere except where softening would make it
 * unreadable. See the note on the class.
 *
 * It shows only while there is something not yet written: "Unsaved changes",
 * then "Saving…" during the write. Once saved it goes, rather than leaving a
 * grey "Saved" behind; a drawer at rest says nothing about saving. The
 * screen-reader status line in the footer still announces "Saved".
 */
function SaveBadge({ state }: { state: 'idle' | 'unsaved' | 'saving' | 'saved' }) {
  if (state === 'idle' || state === 'saved') return null;
  return (
    <Badge
      aria-hidden="true"
      variant="secondary"
      className={cn(
        // Amber throughout, at reduced strength: the `--warning` token as a
        // faint fill, with no border and no dot. The text is the
        // one part that cannot drop in strength and still be read, so in
        // light it is the same hue (70) a notch darker than `--warning`,
        // which measured 4.07:1 on this fill against the 4.5:1 a 10px label
        // needs. Dark mode's `--warning` clears it at 8.18:1 as it is.
        'rounded-sm bg-warning/8 font-normal text-[oklch(0.5_0.13_70)] dark:bg-warning/10 dark:text-warning',
      )}
    >
      {state === 'unsaved' ? 'Unsaved changes' : 'Saving…'}
    </Badge>
  );
}
