'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Download, Trash2 } from 'lucide-react';
import { AddButton } from '@/components/patterns/AddAction';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmActionButton } from '@/components/patterns/ConfirmAction';
import { Field, FieldLabel, FieldSet } from '@/components/ui/field';
import FieldInfo, { LegendInfo } from '@/components/patterns/FieldInfo';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { IconAction } from '@/components/patterns/IconAction';
import { DrawerSheet } from '@/components/ui/drawer-sheet';
import { DrawerToolbar } from '@/components/patterns/DrawerToolbar';
import ClauseBodyEditor, { ClauseBodyActions, useClauseBody } from './ClauseBodyEditor';
import ClauseCitations from './ClauseCitations';
import { useClauseAutosave } from './useClauseAutosave';
import { libraryMarkdown } from '@/lib/domain/contract/clauseMarkdown';
import { parseBody, serialiseBody } from '@/lib/domain/contract/clauseBody';
import type { ClauseInput } from '@/lib/domain/contract/msa';
import { cn, NIL } from '@/lib/utils';
import type { ActionResult } from '@/lib/domain/types';
import { addClause, destroyClause, removeClause, updateClause } from '@/server/actions/clauses';
import { EditButton } from '@/components/patterns/RowActions';
import { PageHeader } from '@/components/patterns/Page';
import RecordTable from '@/components/patterns/RecordTable';

/**
 * The Master Agreement's clause library: a table of every clause, and a drawer
 * holding the one you are reading.
 *
 * **A list of 28 collapsibles was the wrong shape.** The question this page
 * answers most often is "which clause says that", which is an index question,
 * and an index wants a table: the number, the heading, and the opening words,
 * all scannable at once. The text itself is long enough to want the width and
 * the quiet of a drawer rather than an accordion pushing every clause below it
 * down the page.
 *
 * **The drawer floats, and barely dims.** `Notifications` takes the app's full
 * `bg-black/80`, and the difference is what each one is about: a notification
 * is chrome over the app, so the app recedes, while a clause is one row of the
 * list you are still reading. Dimming the table hard would hide the
 * neighbouring clauses, which are exactly what a clause is read against (they
 * cite each other by number). So the scrim is a tenth as a drawer, and because
 * so little behind it recedes, the panel carries its own edge: it floats clear
 * of the card with a ring and a shadow rather than filling one of its edges.
 * Expanded, it covers most of the card and the list is not in use, so the
 * scrim goes to 40%. All of that is one decision, not three.
 *
 * **The save is a debounce, not a button.** See `ClauseDrawer`.
 */
export default function ClauseLibrary({
  clauses,
  stored,
}: {
  clauses: ClauseInput[];
  /**
   * Whether `clauses` came from the table or from the code fallback.
   *
   * It decides how much the first save writes. Saving only the edited clause
   * into an empty table would leave the table holding one row — and
   * `listClauses()` would then answer "the Master Agreement has one clause",
   * both here and on every contract drafted afterwards. So the first save
   * writes the lot; every save after it writes only what changed.
   */
  stored: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /** The number of the clause the drawer is showing, or null. */
  const [open, setOpen] = useState<number | null>(null);
  /**
   * Whether the panel is expanded, held here rather than in the drawer.
   *
   * It describes the **panel**, not the clause inside it, and that distinction
   * is a bug fix rather than tidiness. The drawer is keyed by clause number so
   * that paging brings a new clause its own draft and its own parsed body; held
   * one level down, this state was thrown away by that remount, and paging
   * while expanded dropped the reader back into a side drawer mid-read.
   *
   * Cleared when the drawer closes, below. State lifted up outlives the thing
   * it described unless something clears it, and a library reopened later
   * expanding because of one click in an earlier session is the failure this
   * would otherwise trade for.
   */
  const [expanded, setExpanded] = useState(false);

  const editing = clauses.find((c) => c.number === open) ?? null;

  /**
   * Runs one action per clause, in sequence, stopping at the first failure.
   *
   * One call per clause rather than a batch action, for the same reason the
   * clients list does it: the refusal is per clause and the single action is
   * where it is decided. Sequential rather than `Promise.all` because these
   * write to one table, and a half-applied batch is harder to read back than
   * one that stopped.
   */
  const runAll = (jobs: (() => Promise<ActionResult>)[]) =>
    startTransition(async () => {
      setError(null);
      for (const job of jobs) {
        const result = await job();
        if (!result.success) {
          setError(result.error ?? 'Failed.');
          return;
        }
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Clauses">
        <AddButton
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              // The number is claimed server-side — see `addClause`. Nothing
              // here proposes one, so two tabs adding at once cannot collide.
              const result = await addClause({
                heading: 'New clause',
                body: ['Text of the new clause.'],
                archived: false,
              });
              if (!result.success) {
                setError(result.error ?? 'Failed to add a clause.');
                return;
              }
              router.refresh();
            })
          }
        >
          Add clause
        </AddButton>
      </PageHeader>

      {/*
        Not decoration. The MSA was drafted to be reviewed as one package with
        the four Schedules by an Indian commercial lawyer; text typed here has
        had no such review, and the person typing it is the person who would be
        relying on it. Saying so is the honest version of shipping this screen.
      */}
      {/* `note`, not the component's default `alert`: this is standing text,
          and an assertive live region would interrupt a screen reader with it
          on every visit. The save failure below is the thing that just
          happened, so that one keeps `alert`. */}
      <Alert role="note">
        <AlertTitle>These are the words of a signed agreement</AlertTitle>
        <AlertDescription>
          Edits reach the <strong>next</strong> contract only — open drafts carry
          their own copy, and issued contracts froze theirs. Nothing here has
          been reviewed by a lawyer, and clause numbers are cited by the text
          itself, so a new clause is added at the end and never inserted.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <RecordTable
        rows={clauses}
        id={(clause) => String(clause.number)}
        noun="clause"
        caption="Every clause of the Master Agreement, in number order"
        // The drawer is the way in, so the row opens it rather than a URL.
        open={(clause) => ({ onClick: () => setOpen(clause.number) })}
        rowLabel={(clause) => clause.heading}
        isActive={(clause) => open === clause.number}
        /*
          Both removals, offered on a selection as they are on a row, and drawn
          the same way as there: archiving is an ordinary button because it is
          reversible and keeps the number, and deleting keeps the bar's
          destructive slot because it retires a clause number for good.
        */
        bulkActions={[
          {
            label: 'Archive',
            confirm:
              'These clauses leave the library and stop reaching new contracts. Their numbers stay taken, drafts already open keep their own copy, and you can restore them from this list.',
            onAction: (chosen) =>
              runAll(chosen.map((clause) => () => removeClause(clause.number))),
          },
        ]}
        onBulkDelete={(chosen) =>
          runAll(chosen.map((clause) => () => destroyClause(clause.number)))
        }
        bulkConsequence="This removes these clauses for good. Their numbers are never reused, so nothing else can inherit one and quietly change what a signed agreement says. Archive instead to keep them readable."
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
            sortValue: (clause) => clause.heading,
            /*
              The archived mark sits here, beside the heading it qualifies,
              rather than in a Status column of its own. A column would be
              blank on every live clause, which is a heading promising
              something it does not say, and §2.3 counts columns as a budget.
            */
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
            /*
              What the clause does, in a few words.

              This was the clause's own first body line, under the heading
              "Opens". That told two clauses apart only where their opening
              sentences happened to differ, and on clause 1 it read "1.1 In
              this Agreement, unless the context otherwise requires:", which
              describes nothing. A column of truncated legal prose is also the
              hardest possible thing to scan.

              Written, not derived: a summary this app generated would be an
              unreviewed gloss on text that `msa.ts` says needs a commercial
              lawyer. `MSA_CLAUSE_SUMMARIES` seeds them and the drawer edits
              them.
            */
            key: 'summary',
            label: 'Description',
            trunc: true,
            sortValue: (clause) => clause.summary ?? '',
            cell: (clause) =>
              clause.summary ?? <span className="text-muted-foreground">{NIL}</span>,
          },
        ]}
        actions={(clause) => (
          <>
            <EditButton
              label={`Edit ${clause.heading}`}
              onClick={() => setOpen(clause.number)}
            />
            {clause.archived ? (
              // Restoring asks nothing: it takes nothing away, and confirming a
              // reversible action teaches people to click through the dialog
              // guarding the irreversible one.
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm" icon
                      disabled={pending}
                      aria-label={`Restore ${clause.heading}`}
                      onClick={() =>
                        startTransition(async () => {
                          setError(null);
                          const result = await updateClause({ ...clause, archived: false });
                          if (!result.success) {
                            setError(result.error ?? 'Failed to restore the clause.');
                            return;
                          }
                          router.refresh();
                        })
                      }
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    />
                  }
                >
                  <ArchiveRestore className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Restore</TooltipContent>
              </Tooltip>
            ) : (
              /*
                Archiving is confirmed even though it is reversible, on
                instruction: the clauses are the words of an agreement, and one
                quietly leaving the library is not something to discover later
                from a contract that came out short.
              */
              <ConfirmActionButton
                variant="ghost"
                size="sm"
                disabled={pending}
                icon={<Archive className="size-4" />}
                label={`Archive ${clause.heading}`}
                title={`Archive clause ${clause.number}`}
                description={`“${clause.heading}” leaves the library and stops reaching new contracts. Its number stays taken, drafts already open keep their own copy, and you can restore it from this list.`}
                confirmLabel="Archive"
                onConfirm={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await removeClause(clause.number);
                    if (!result.success) {
                      setError(result.error ?? 'Failed to archive the clause.');
                      return;
                    }
                    router.refresh();
                  })
                }
                className="text-muted-foreground transition-colors hover:text-foreground"
              />
            )}
          </>
        )}
      />

      {editing ? (
        <ClauseDrawer
          key={editing.number}
          clause={editing}
          // See the note on `stored`: the first save into an empty table has to
          // write every clause, or the library ends up holding one row.
          alsoWrite={stored ? [] : clauses.filter((c) => c.number !== editing.number)}
          // Every number in the library, so the drawer can say whether a
          // 'clause 11.2' in this one's text points at anything.
          known={new Set(clauses.map((c) => c.number))}
          // The whole library, for the drawer's Markdown download and for the
          // pager, which walks it in the order the table shows.
          library={clauses}
          expanded={expanded}
          onExpandedChange={setExpanded}
          onOpen={setOpen}
          onClose={() => {
            setOpen(null);
            // See the note on `expanded`: closing is the end of the read, so
            // the next one starts as a drawer.
            setExpanded(false);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * One clause, open for reading and editing.
 *
 * **It saves itself**, on a debounce, and there is no Save button. That
 * reverses the rule this file carried until 17 September 2026, which was
 * explicit-save on the argument that a clause is the source text for every
 * contract drafted afterwards. The argument still holds and is what the
 * debounce answers: a write lands once the typing stops, so a half-typed legal
 * sentence is never the library's live text (`useClauseAutosave`). Closing the
 * drawer is therefore no longer a cancel, and nothing here should imply it is.
 *
 * The way back from a change is **Archive**, which is reversible and keeps the
 * number, exactly as it is on a row.
 */
function ClauseDrawer({
  clause,
  alsoWrite,
  known,
  library,
  expanded,
  onExpandedChange,
  onOpen,
  onClose,
}: {
  clause: ClauseInput;
  /** Clauses to write alongside this one, for the unseeded-table case. */
  alsoWrite: ClauseInput[];
  /** Every clause number in the library, for resolving cross-references. */
  known: Set<number>;
  /** Every clause, for the Markdown download and the pager. */
  library: ClauseInput[];
  /**
   * Expanded into a dialog-sized panel, or the ordinary side drawer.
   *
   * Owned by the parent, because this component is keyed by clause number and
   * would lose it on every page. See the note where it is declared.
   */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Shows another clause in this drawer. The pager's whole job. */
  onOpen: (number: number) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(clause);
  const [pending, startTransition] = useTransition();
  /*
    The body is edited as rows and stored as strings, so the drawer holds the
    rows and derives the strings rather than the other way round.

    That direction matters. Parsing on every render would re-split text the
    moment somebody typed a paragraph that happens to begin with '4.2 ', which
    would silently promote a sentence into a numbered point under the caret.
    Parsed once on open, serialised on the way out.
  */
  /*
    The rows, and the row being worked on, which is where the Add buttons
    insert. One hook rather than two pieces of state here, because the rows and
    the buttons are siblings with the citations between them and every question
    about focus concerns both. Reset with the clause, which the drawer's
    remount key already does.
  */
  const bodyRows = useClauseBody(() => parseBody(clause.body));
  const parts = bodyRows.parts;
  const body = serialiseBody(parts, clause.number);

  /**
   * The save, on a debounce, with no button. See `useClauseAutosave` for why
   * the debounce is the safety mechanism on this table rather than a tweak.
   *
   * `body` is derived from the rows above and passed in rather than held in
   * state, so the hook compares the same value the server would receive.
   */
  const autosave = useClauseAutosave({
    clause,
    draft: { ...draft, body },
    alsoWrite,
  });
  const { error, setError } = autosave;

  /**
   * Everything irreversible flushes first.
   *
   * A debounce still in flight would otherwise fire at a row that has just been
   * archived or deleted, and the reader would be shown a failure they did not
   * cause. `flush` also freezes the hook, so nothing is scheduled afterwards.
   */
  const runFinal = (job: () => Promise<ActionResult>, failure: string) =>
    startTransition(async () => {
      await autosave.flush();
      setError(null);
      const result = await job();
      if (!result.success) {
        setError(result.error ?? failure);
        return;
      }
      onClose();
      router.refresh();
    });

  /**
   * The clause either side of this one, in the order the table shows.
   *
   * By position in `library` rather than by `number ± 1`: numbers are never
   * reissued, so a deleted clause leaves a gap and arithmetic would page into
   * nothing (`CONTEXT.md` §5c).
   */
  const at = library.findIndex((c) => c.number === clause.number);
  const previous = at > 0 ? library[at - 1] : undefined;
  const next = at >= 0 && at < library.length - 1 ? library[at + 1] : undefined;

  /**
   * Paging is leaving a clause, so it flushes like archive and delete do.
   *
   * Without this a fast reader loses the edit they just made: the debounce is
   * 800ms, a page is one click, and the timer would fire against a drawer that
   * has already moved on. The drawer is keyed by clause number in the parent,
   * so it remounts with the new clause's own draft and parts.
   */
  const page = (to: ClauseInput | undefined) => {
    if (!to) return;
    startTransition(async () => {
      await autosave.flush();
      onOpen(to.number);
    });
  };

  /**
   * The library as a Markdown file.
   *
   * Everything, not just this clause: the row it sits in is about the library,
   * and a single clause out of context is the less useful of the two. The text
   * itself is `libraryMarkdown`, in the domain layer and tested there; this is
   * only the browser plumbing.
   */
  const download = () => {
    // The clause being edited, as it currently stands, so a file taken mid-edit
    // matches what is on screen rather than what was last written.
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
    <DrawerSheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      /*
        The scrim's weight follows the panel's size, because they answer the
        same question: how much of the list behind is still being read.

        Collapsed, the drawer is under half the card and the rest of the table
        is beside it, so the dim is slight: enough to seat the panel, not
        enough to stop a reader checking the clause number in the next row.
        That is what this drawer has always been protecting (clause bodies
        cite each other by number nineteen times).

        Expanded, the panel covers nine tenths of the card and the list is no
        longer usable anyway, so the dim goes up to the point where the panel
        reads as being over the page rather than in it. Still well under the
        app's default `bg-black/80`, which would put the table out of reach.

        No blur at either weight: blur destroys text, dimming only mutes it.
      */
      overlayClassName={cn(
        'supports-backdrop-filter:backdrop-blur-none',
        expanded ? 'bg-black/40' : 'bg-black/10',
      )}
      /*
        Worked through beside the list it opened from, so it takes the middle
        size rather than the feed's (`docs/design.md` §2.11). Expanded, it
        takes `lg`, which is 90% of the inset: that size already existed for
        exactly this shape, so expanding is one prop rather than a second
        component to keep in step.

        Floating in both states, which is what makes expanding a *resize*
        rather than a change of kind. A drawer flush to the card's edge reads
        as a region of the page, and with almost nothing dimmed behind it that
        region has no edge at all.
      */
      size={expanded ? 'lg' : 'md'}
      float
      /*
        Titled by the heading, not the number. The number is identity and
        never changes, which is exactly what makes it a poor title: it says
        nothing about which clause is open. It has a job in the pager above,
        where it locates you in the library. The heading is what a reader is
        looking for, and it tracks the field below as that field is edited.
      */
      title={draft.heading || `Clause ${clause.number}`}
      toolbar={
        <DrawerToolbar
          data-testid="clause-controls"
          onBack={onClose}
          backLabel="Back to the clause list"
          expanded={expanded}
          onExpandedChange={onExpandedChange}
          expandLabel="this clause"
          /*
            Clause bodies cite each other by number nineteen times, so reading
            one usually means reading its neighbour, and doing that by closing
            the drawer, finding the row and opening it again is three actions
            for one thought.

            **By position, not by number.** A number is never reissued, so a
            deleted clause leaves a gap and `number + 1` would page into
            nothing (`CONTEXT.md` §5c).
          */
          paging={{
            onPage: (by) => page(by < 0 ? previous : next),
            hasPrevious: Boolean(previous),
            hasNext: Boolean(next),
            position: `Clause ${clause.number}`,
            disabled: pending,
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
              disabled={pending}
              onClick={() =>
                runFinal(
                  () =>
                    clause.archived
                      ? updateClause({ ...draft, body, archived: false })
                      : removeClause(clause.number),
                  'Failed to update the clause.',
                )
              }
            />
            {/*
              Still confirmed, and deliberately: deleting retires a clause
              number for good (`CONTEXT.md` §5c) and nothing can undo it. An
              icon in a row is *easier* to hit by accident than the labelled
              button this replaces, so the confirmation matters more here rather
              than less.
            */}
            <ConfirmActionButton
              variant="ghost"
              size="sm"
              disabled={pending}
              label="Delete this clause"
              // The one control in the row that said nothing on hover, because
              // it is the only one that is not an `IconAction`. One word, like
              // its four neighbours; the `label` above is what a screen reader
              // reaches out of that context.
              tooltip="Delete"
              icon={<Trash2 className="size-3.5" />}
              title={`Delete clause ${clause.number}`}
              description={`This removes “${clause.heading}” for good. Number ${clause.number} is never reused, so nothing else can inherit it and quietly change what a signed agreement says. Archive instead if you only want it out of the way.`}
              confirmLabel="Delete"
              confirmVariant="destructive"
              onConfirm={() =>
                runFinal(() => destroyClause(clause.number), 'Failed to delete the clause.')
              }
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            />
            </>
          }
        />
      }

      /*
        What the Save button used to say, as a status region rather than a
        control, and a *quiet* footer: no rule and no padding of its own, so
        it takes back the height it gives up when empty rather than leaving a
        stray edge at the foot of the drawer.

        Always mounted with only its text changing, for the reason
        `docs/editors/draftStatus.tsx` gives: a live region that mounts
        *carrying* its message has nothing to announce, so the first save of a
        session would be the one nobody hears. The padding is on the paragraph
        rather than the row, because `empty:hidden` hides the paragraph.
      */
      quietFooter
      footer={
        <p
          role="status"
          aria-live="polite"
          className="px-4 py-2 text-meta text-muted-foreground tabular-nums empty:hidden"
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
      // The body lays out a column of fields, which the frame's plain scroll
      // box does not assume.
      bodyClassName="flex flex-col gap-4"
    >
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Field>
            <FieldLabel htmlFor="clause-heading">Heading</FieldLabel>
            <Input
              id="clause-heading"
              size="form"
              value={draft.heading}
              onChange={(e) => setDraft({ ...draft, heading: e.target.value })}
            />
          </Field>

          {/*
            The library's own note about the clause, not part of the agreement.
            `FieldInfo` rather than a `FieldDescription`, per §5e, and the info
            says the one thing worth knowing: nothing here reaches a contract.
          */}
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

          {/*
            `min-h-0`, and it is the §5e rule rather than a tweak: a flex
            item's `min-height` is `auto`, so without it the field is floored
            at its content's height and a long clause (clause 1's definitions
            run to a page) pushes the footer off the bottom of the drawer
            instead of scrolling. Measured in the browser, where it ran 460px
            past the edge; jsdom reports every box as zero.
          */}
          {/*
            A `FieldSet` with a legend, not a `Field` with a label. The body is
            no longer one control but a column of them, so a `FieldInfo`
            pointing at a single id would name a field that does not exist,
            which is what `LegendInfo` is for. Each row carries its own
            `aria-label` saying which kind of paragraph it is and what number
            it will take.

            `gap-2` overrides the set's own `gap-4`: the legend sits directly
            above its rows here rather than over a stack of separate fields.
          */}
          <FieldSet className="min-h-0 flex-1 gap-2">
            <LegendInfo
              info="Numbers come from the order of the rows, so moving a point renumbers the rest."
              label="Where do the numbers come from?"
            >
              Body
            </LegendInfo>
            <ClauseBodyEditor clauseNumber={clause.number} {...bodyRows.editor} />
          </FieldSet>

          {/*
            One band under the body: what the clause points at on the left, the
            three ways to add a paragraph at the right end.

            The citations are the left slot rather than the wrapper, because
            `ClauseCitations` renders nothing for a clause that cites nothing
            (most of them) and the buttons must not go with it.

            `mr-auto` on the left slot rather than `justify-between` on the row,
            and the difference is the case that matters: `justify-between` with
            one child pushes that child *left*, so on the clauses that cite
            nothing (most of them) the buttons landed at the left edge. Measured
            at x=806 where the right edge is 1262. An auto margin on a wrapper
            that is always rendered holds the right edge either way.
          */}
          <div
            data-testid="clause-body-actions"
            className="flex flex-wrap items-center gap-2"
          >
            <div className="mr-auto">
              <ClauseCitations body={body} known={known} self={clause.number} />
            </div>
            <ClauseBodyActions {...bodyRows.actions} />
          </div>
    </DrawerSheet>
  );
}