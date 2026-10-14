'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  insertPart,
  markerAt,
  moveBlock,
  type ClausePart,
  type ClausePartKind,
} from '@/lib/domain/contract/clauseBody';
import { cn } from '@/lib/utils';

// A copy of `admin/clauses/ClauseBodyEditor.tsx` for the drawer experiment, taken 5 October 2026.
// Nothing in the app imports it; delete it with `ExperimentDrawer.tsx`.

/**
 * A clause body as its paragraphs, each in its own field, numbered by the
 * position it sits at.
 *
 * It replaces one `<textarea>` holding the whole clause, whose only affordance
 * was "a blank line starts a new paragraph". Three things were wrong with
 * that, and they are the three this is built around:
 *
 * - **The numbers were prose.** '8.4' was characters somebody typed, so
 *   inserting a paragraph meant retyping every number below it and nothing
 *   noticed when that was not done. They are derived here
 *   (`clauseBody.serialiseBody`), so the sequence cannot be wrong.
 * - **The structure was invisible.** A clause mixes numbered points, lettered
 *   sub-items and unnumbered definitions, and in a wall of text they look the
 *   same. Each row now says which it is and shows the marker it will be saved
 *   with.
 * - **There was no way to move a paragraph** except to cut and paste it, which
 *   on legal text is how a half-sentence gets left behind.
 *
 * **A drag handle that is also a button.** This was a pair of chevrons until
 * 17 September 2026, on the argument that a drag handle alone is unusable by
 * keyboard and by a screen reader, and this is a form for editing the words of
 * an agreement. That argument was never against *dragging*, only against drag
 * being the only way, so the grip is a real `<button>`: drag it with a pointer,
 * or focus it and press the arrow keys. Both paths call `moveBlock`.
 *
 * **No drag library.** Discrete row swaps need a pointer position compared
 * against the rows' own boxes, which is the twenty lines in `useRowDrag` below.
 * `ui/tabs.tsx` hand-rolls a continuous drag for the same reason and its edge
 * cases do not apply here: nothing is animated between positions, so there is
 * no state to get stuck.
 *
 * What it deliberately does **not** do is touch prose. A clause number typed
 * inside a sentence ('the meaning given at clause 11.2') is left exactly
 * alone: rewriting legal text automatically is the thing this codebase refuses
 * to do. `ClauseCitations` surfaces those instead, for a person to judge.
 *
 * **A paragraph is added below the row being worked on**, which is `insertPart`
 * and the `useClauseBody` hook directly below. See both.
 */

/**
 * The rows, the buttons that add one, and the focus they share.
 *
 * A hook rather than four props threaded through the drawer, because the two
 * components are siblings with a band of citations between them and every
 * question here is about the row *both* are pointing at. `ClauseLibrary` holds
 * one of these and spreads the two prop bags.
 *
 * What it owns beyond the rows is one number: the row being worked on, which
 * decides where the next paragraph lands. Everything below is a rule about
 * when that number stops being true.
 */
export function useClauseBody(initial: () => ClausePart[]) {
  const [parts, setParts] = useState(initial);
  const [focused, setFocused] = useState<number>();
  /*
    The row to put the caret in, cleared as soon as it is used.

    A number rather than a flag beside `focused`, because the two answer
    different questions: `focused` is where the *next* row goes and outlives
    any one render, while this is a one-shot instruction to move the caret. A
    single piece of state would re-steal focus on every unrelated keystroke.
  */
  const [caret, setCaret] = useState<number>();
  // Stable, because it is a dependency of the effect that reads `caret`: a new
  // closure per render would re-run it on every keystroke. It does nothing
  // once `caret` is cleared, so the only cost would be the noise, but an
  // effect that runs constantly is an effect nobody reasons about later.
  const clearCaret = useCallback(() => setCaret(undefined), []);

  return {
    parts,
    setParts,
    editor: {
      parts,
      onChange: setParts,
      caret,
      onCaretPlaced: clearCaret,
      // A removal or a move renumbers every row below it, so the remembered
      // index names a paragraph the reader never pointed at. Forgotten rather
      // than adjusted: both are rare, and "nothing is focused" is both honest
      // and one line instead of an arithmetic one.
      onFocusedChange: setFocused,
    },
    actions: {
      parts,
      focused,
      onChange: setParts,
      // The caret follows the row that was just added, which is also what
      // scrolls it into view. Without it an add from the top of a long clause
      // is invisible: measured at y=1043 against a list ending at 636.
      onAdded: (index: number) => {
        setCaret(index);
        setFocused(index);
      },
    },
  };
}

export default function ClauseBodyEditor({
  parts,
  clauseNumber,
  onChange,
  onFocusedChange,
  caret,
  onCaretPlaced,
}: {
  parts: ClausePart[];
  clauseNumber: number;
  onChange: (parts: ClausePart[]) => void;
  /**
   * Reports the row being worked on, which is what `ClauseBodyActions` adds
   * below. `undefined` means none is.
   */
  onFocusedChange: (index: number | undefined) => void;
  /** A row to put the caret in, once. See `useClauseBody`. */
  caret: number | undefined;
  onCaretPlaced: () => void;
}) {
  const replace = (index: number, part: ClausePart) =>
    onChange(parts.map((p, i) => (i === index ? part : p)));

  // A point carries its sub-items with it. See `moveBlock`, which is where the
  // edge cases live and where they are tested.
  //
  // Reordering forgets the focused row for the reason removing one does: the
  // indices no longer name the same paragraphs, so the remembered one would
  // insert somewhere nobody pointed at.
  const move = (index: number, by: -1 | 1) => {
    onFocusedChange(undefined);
    onChange(moveBlock(parts, index, by));
  };

  const list = useRef<HTMLDivElement>(null);
  const { dragging, startDrag } = useRowDrag({ list, parts, onChange });

  /*
    Puts the caret in a row that was just added.

    The field is found in the DOM rather than held in a ref per row, because
    the rows are keyed by index and a ref array would have to be kept in step
    with every insert, move and removal: one more list to disagree with the
    one that matters. `focus()` also scrolls the row into view, which is the
    half of this the reader actually notices.
  */
  useEffect(() => {
    if (caret === undefined) return;
    const row = list.current?.querySelectorAll<HTMLElement>('[data-row]')[caret];
    row?.querySelector('textarea')?.focus();
    onCaretPlaced();
  }, [caret, onCaretPlaced]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div ref={list} className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {parts.map((part, index) => (
          <Row
            // Index as the key, deliberately. These rows have no id of their
            // own, and the list is reordered by swapping positions, so the
            // index *is* the identity here. A key derived from the text would
            // remount the field on every keystroke and lose the caret.
            key={index}
            part={part}
            marker={markerAt(parts, index, clauseNumber)}
            first={index === 0}
            last={index === parts.length - 1}
            dragging={dragging === index}
            onChange={(next) => replace(index, next)}
            onFocus={() => onFocusedChange(index)}
            onMove={(by) => move(index, by)}
            onDragStart={(event) => {
              // Same rule as `move` above, one interaction over: a drag ends
              // with the rows at different indices.
              onFocusedChange(undefined);
              startDrag(event, index);
            }}
            onRemove={() => {
              // Every index below the removed row shifts up, so the remembered
              // one now names a row nobody pointed at. Forgotten rather than
              // adjusted: a removal is rare, and "nothing is focused" is both
              // the honest answer and one line instead of an arithmetic one.
              onFocusedChange(undefined);
              onChange(parts.filter((_, i) => i !== index));
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Dragging a row to a new position.
 *
 * **It reorders as the pointer passes a row rather than on release**, which is
 * what makes it legible without any drop indicator to draw: the list *is* the
 * preview. That also keeps the whole thing stateless past the index being
 * dragged, since every move is the same `moveBlock` call the arrow keys make.
 *
 * The rows are read from the DOM (`data-row`) rather than measured up front.
 * A row's height changes as its text is edited and, more to the point, it
 * changes *during* the drag as rows swap around the pointer, so a set of boxes
 * captured on pointerdown would be wrong by the first move.
 *
 * One deliberate simplification: a point carries its sub-items, so dragging one
 * past a point with three sub-items crosses four rows in one step. The pointer
 * therefore leads the block slightly on long jumps. Fixing it means measuring
 * the block rather than the row, which is more machinery than this screen has
 * ever needed. ponytail: per-row step, measure the block if long clauses make
 * it feel loose.
 */
function useRowDrag({
  list,
  parts,
  onChange,
}: {
  list: React.RefObject<HTMLDivElement | null>;
  parts: ClausePart[];
  onChange: (parts: ClausePart[]) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  /*
    The live index, as a ref rather than as state.

    The pointer handler is one closure for the whole drag, so it would
    otherwise compare against the index the drag started at and move the same
    row twice past a single neighbour. The state above exists only to draw the
    row as lifted.
  */
  const at = useRef(0);
  const live = useRef(parts);
  live.current = parts;

  const startDrag = (event: React.PointerEvent, index: number) => {
    // Left button only, and never a second drag on top of a running one.
    if (event.button !== 0 || dragging !== null) return;
    event.preventDefault();
    at.current = index;
    setDragging(index);

    const move = (e: PointerEvent) => {
      const rows = list.current?.querySelectorAll<HTMLElement>('[data-row]');
      if (!rows) return;
      const over = [...rows].findIndex((row) => {
        const box = row.getBoundingClientRect();
        return e.clientY >= box.top && e.clientY <= box.bottom;
      });
      if (over === -1 || over === at.current) return;

      // One step at a time, in the direction travelled. `moveBlock` moves a
      // point with its sub-items, so the index the block lands on is not
      // always the one the pointer is over, and stepping is what keeps the two
      // from disagreeing.
      const by = over > at.current ? 1 : -1;
      const next = moveBlock(live.current, at.current, by);
      if (next === live.current) return;
      at.current += by;
      setDragging(at.current);
      onChange(next);
    };

    const stop = () => {
      setDragging(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    // `pointercancel` as well as `pointerup`: a touch drag interrupted by the
    // browser's own gesture handling fires only the former, and without it the
    // listeners outlive the drag and the next pointermove moves a stale row.
    window.addEventListener('pointercancel', stop);
  };

  return { dragging, startDrag };
}

/**
 * The three ways to add a paragraph.
 *
 * Its own export rather than part of the editor above, because it shares a band
 * with the clause's citations and the two are rendered by different components.
 * The `add` logic stays here, where the parts are, and only the layout moved.
 *
 * **Not nested inside `ClauseCitations`**, which would have been the smaller
 * diff and the wrong one: that component renders `null` for a clause that cites
 * nothing, which is most of them, and the buttons would have disappeared along
 * with it.
 *
 * Three buttons rather than one, because the kind cannot be inferred from
 * anything: a new paragraph is a point, a sub-item of the point above, or an
 * unnumbered definition, and only the person typing knows which. Naming them is
 * also the clearest statement this editor makes about what a clause is built
 * from.
 *
 * `default` (28px), the dense height this tool is built at. `form` (38px) is
 * for a button sitting *inline with* an Input, and there is no field beside
 * these, so that height only made them the largest thing in the drawer.
 *
 * **It adds below the row being worked on**, not at the foot of the clause.
 * Appending was the first behaviour and it is wrong the way writing at the
 * bottom of a page is wrong: a clause is worked down, and a point added from
 * 7.1 belongs at 7.2, not eleven paragraphs below where the reader is. Where
 * exactly it lands is `insertPart`, which is where the nesting cases live and
 * where they are tested.
 */
export function ClauseBodyActions({
  parts,
  onChange,
  focused,
  onAdded,
}: {
  parts: ClausePart[];
  onChange: (parts: ClausePart[]) => void;
  /**
   * The row last focused in the editor, or `undefined` when none has been.
   *
   * It is a prop rather than state here because the rows are in a sibling
   * component: these buttons share a band with the clause's citations, so the
   * one place that can see both is the drawer above them.
   */
  focused: number | undefined;
  /**
   * Where the row landed, so the drawer can put the caret in it.
   *
   * Without this an add from the top of a long clause is invisible: the row
   * arrives in the right place and 400px below the fold, with the caret still
   * in the paragraph being read. Measured at y=1043 against a list ending at
   * 636, on clause 1.
   */
  onAdded: (index: number) => void;
}) {
  const add = (kind: ClausePartKind) => {
    const { parts: next, index } = insertPart(parts, kind, focused);
    onChange(next);
    onAdded(index);
  };

  return (
    /*
      A step smaller and a step lighter than the app's default button: 24px
      tall, 11px text, 12px icons, and text one grey step off the foreground
      (gray-800 in light, gray-300 in dark). They are secondary to the
      paragraphs they add, and at full weight three of them in a row out-shouted
      the content above.
    */
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="default" className={ADD_BUTTON} onClick={() => add('point')}>
        <Plus className="size-3" />
        Point
      </Button>
      <Button type="button" variant="outline" size="default" className={ADD_BUTTON} onClick={() => add('item')}>
        <Plus className="size-3" />
        Sub-item
      </Button>
      <Button type="button" variant="outline" size="default" className={ADD_BUTTON} onClick={() => add('text')}>
        <Plus className="size-3" />
        Unnumbered
      </Button>
    </div>
  );
}

const ADD_BUTTON =
  'h-6 px-1.5 text-[0.6875rem] text-[var(--gray-800)] dark:text-[var(--gray-300)]';

/** What each kind is called where a reader needs the word. */
const KIND_LABEL: Record<ClausePartKind, string> = {
  point: 'Numbered point',
  item: 'Sub-item',
  text: 'Unnumbered paragraph',
};

function Row({
  part,
  marker,
  first,
  last,
  dragging,
  onChange,
  onFocus,
  onMove,
  onDragStart,
  onRemove,
}: {
  part: ClausePart;
  marker: string;
  first: boolean;
  last: boolean;
  /** Being dragged right now, so it lifts off the list. */
  dragging: boolean;
  onChange: (part: ClausePart) => void;
  onFocus: () => void;
  onMove: (by: -1 | 1) => void;
  onDragStart: (event: React.PointerEvent) => void;
  onRemove: () => void;
}) {
  const label = `${KIND_LABEL[part.kind]}${marker ? ` ${marker}` : ''}`;

  return (
    <div
      data-row
      // Sub-items and definitions step in from their point, the same way the
      // printed clause indents them. The editor showing the shape the document
      // will have is most of what makes it readable.
      className={cn(
        'group/row relative flex items-start gap-2',
        part.kind !== 'point' && 'pl-6',
        // Lifted while it is being dragged. Opacity rather than a shadow or a
        // transform: the row is still in the list and still being reordered
        // around, so anything that moved it would fight the reordering that is
        // already showing where it will land.
        dragging && 'opacity-60',
      )}
    >
      {/*
        The derived marker, in a column of its own, muted and tabular. Muted
        because it is not editable and should not read as something to type
        into; in its own column because that is how the contract sets it, and
        an editor that matches the document is one less thing to translate.
      */}
      <span
        aria-hidden="true"
        className="w-10 shrink-0 pt-2 text-right text-xs text-muted-foreground tabular-nums"
      >
        {marker}
      </span>

      {/*
        One line tall when empty, growing with what is typed.

        Neither half was true before. `rows={2}` is a *height*, so it floored
        every row at two lines whatever the content was, and `resize-y` put a
        drag corner in the bottom right of all of them: visual noise at this
        density, and a second answer to how tall a row is, one the content
        decides and one somebody dragged to. The primitive's own
        `field-sizing-content` is the first answer and needed only to be left
        alone. `min-h-9` is §2.1's 36px rung, so an empty row matches the
        heading and description fields above it.
      */}
      <Textarea
        aria-label={label}
        value={part.text}
        onChange={(e) => onChange({ ...part, text: e.target.value })}
        /*
          Focus, not click: a row reached by Tab is as much "the row being
          worked on" as one that was pointed at, and this is the form for
          editing the words of an agreement.

          There is deliberately no `onBlur` clearing it. Clicking Add blurs the
          field, so a row that forgot itself on blur would have forgotten it by
          the time the click landed. The answer is replaced by the next focus
          instead, which is also what a reader would expect after adding two
          paragraphs in a row without looking away.
        */
        onFocus={onFocus}
        /*
          No border at rest: a faint fill says "this is editable" without
          drawing fourteen boxes. The edge comes back on focus, where it is
          the one thing telling the reader which paragraph has the caret.
        */
        className="min-h-9 flex-1 border-transparent bg-muted/60 py-2 pr-16 pl-3 font-normal text-[0.8125rem]/relaxed hover:bg-muted focus-visible:border-ring focus-visible:bg-background md:text-[0.8125rem]/relaxed"
      />

      {/*
        The row's two controls show on the row under the pointer, on the row
        holding focus (so Tab still reaches and reveals them), on the row being
        dragged, and always on a device with no hover to reveal them by.
        Fourteen rows of grip and cross at rest was most of the clutter.

        Laid over the field's top-right corner rather than beside it, with the
        field's own right padding keeping text out from under them. Beside it,
        the hidden pair still held a 64px gutter and every paragraph stopped
        short of the inputs above.
      */}
      <div
        className={cn(
          'absolute top-1 right-1 flex items-start opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100',
          dragging && 'opacity-100',
        )}
      >
      <DragHandle
        label={`Reorder ${label}`}
        first={first}
        last={last}
        onMove={onMove}
        onPointerDown={onDragStart}
      />

      {/*
        No confirmation on removing a paragraph, unlike deleting a clause. It
        is undone by the drawer's own Cancel, since nothing is written until
        Save, so a dialog here would be guarding something that is already
        reversible and would teach people to click through the one that
        guards the clause itself.
      */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${label}`}
              onClick={onRemove}
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
            />
          }
        >
          <X className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>Remove</TooltipContent>
      </Tooltip>
      </div>
    </div>
  );
}

/**
 * The grip, which is a button that also drags.
 *
 * It replaces a pair of chevrons, and the thing that had to survive the
 * replacement is the keyboard path: six dots under a pointer are unreachable
 * by keyboard and unannounced by a screen reader, and this is the form for
 * editing the words of an agreement. So it is a real `<button>` with a name,
 * reachable by Tab, and the arrow keys move its row.
 *
 * **Not disabled at the ends**, which is where it departs from the chevrons.
 * One control cannot go grey in one direction only, and a handle disabled on
 * the first row would also stop being draggable *downward*. The guard is in
 * the handler instead: an arrow key at the end of the list does nothing.
 */
function DragHandle({
  label,
  first,
  last,
  onMove,
  onPointerDown,
}: {
  label: string;
  first: boolean;
  last: boolean;
  onMove: (by: -1 | 1) => void;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onPointerDown={onPointerDown}
            onKeyDown={(e) => {
              // The end guard. Returning before `preventDefault` leaves the
              // key to the browser, so ArrowUp on the first row still scrolls
              // the list rather than being swallowed by a control that did
              // nothing with it.
              if (e.key === 'ArrowUp' && !first) onMove(-1);
              else if (e.key === 'ArrowDown' && !last) onMove(1);
              else return;
              e.preventDefault();
            }}
            className="size-7 shrink-0 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          />
        }
      >
        <GripVertical className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>Drag, or use the arrow keys</TooltipContent>
    </Tooltip>
  );
}
