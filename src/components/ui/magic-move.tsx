"use client";

import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * The highlight behind the active row of a menu, drawn once and moved, so
 * travelling from one option to the next reads as one surface sliding rather
 * than two rows blinking.
 *
 * The same idea as `TabsIndicator`, and it exists separately for one reason:
 * Base UI measures the active tab onto `--active-tab-left`/`--active-tab-width`
 * for a tab strip and nothing equivalent for a menu, a select or a combobox.
 * So the row is measured here instead. Everything downstream is identical —
 * one absolutely positioned box, transform and size transitioned on the Panel
 * tier, `docs/design.md` §1.6.
 *
 * **What a caller has to do**, and it is three things:
 *
 * 1. Spread `track` onto the scrolling box that holds the rows. It needs to be
 *    a positioning context, which `relative` in the returned props supplies.
 * 2. Render `<MagicMove {...highlight} />` as that box's first child.
 * 3. Suppress the rows' own highlight fill, or it paints instantly underneath
 *    and there is nothing left to watch. The colour stays on the *text*: a row
 *    reached by keyboard must still announce itself the frame it is reached,
 *    and one that waited on a 200ms slide would read as lag.
 *
 * **Which row is active is read from the DOM, never tracked here.** Base UI
 * moves the mark for the pointer, the arrow keys and typeahead alike.
 * Mirroring that in React state would be a second answer to a question the
 * primitive has already answered, and the two would disagree the first time a
 * menu was opened by keyboard.
 *
 * **One mark, `data-highlighted`, on all three.** A menu also moves DOM focus
 * and flips `tabindex` to 0, which is why the menu's own styling was written
 * with `focus:` rather than a data attribute; that is a second expression of
 * the same state, not a different one. This selector deliberately does *not*
 * also match `[tabindex="0"]`: a version that did was tried, and removing the
 * extra half changed no behaviour and failed no test, which is the evidence
 * that it was never carrying anything.
 */
const HIGHLIGHTED = "[data-highlighted]";

/**
 * How the active row announces itself.
 *
 * `"marked"` is the popups: Base UI sets `data-highlighted` for the pointer,
 * the arrow keys and typeahead alike, so watching the attribute covers all
 * three input methods at once.
 *
 * `"hover"` is the nav rail, where there is no such mark. A row's hover is a
 * CSS pseudo-class and nothing in the DOM changes, so the pointer has to be
 * followed directly. Keyboard focus is deliberately **not** tracked in this
 * mode: the rail's rows are links whose focus ring already says where you
 * are, and a fill that chased focus would compete with the *active* fill that
 * says which page you are on.
 */
export type MagicMoveMode = "marked" | "hover";

interface Rect {
  top: number;
  height: number;
  /**
   * Measured too, rather than assumed from the track's padding: the three
   * primitives put that padding in three different places (the menu on its
   * popup, the select on its group, the combobox on its popup) and a
   * hardcoded inset would be right for one and wrong for the others.
   */
  left: number;
  width: number;
  /**
   * A destructive row paints its own red fill and keeps it, because the
   * highlight is one colour and that row is a different one. So the magic move
   * hides under it rather than sliding a grey box beneath a red one.
   */
  muted: boolean;
  /** Nothing is highlighted: drawn where it was, but invisible. */
  hidden?: boolean;
}

export function useMagicMove({
  mode = "marked",
  rows = "[data-slot='sidebar-menu-button']",
}: { mode?: MagicMoveMode; rows?: string } = {}) {
  /*
    A callback ref, not `useRef`, and that is the whole of why an earlier cut
    of this silently did nothing.

    A menu's popup is portalled and is unmounted entirely while closed, so it
    mounts *after* the hook's effects have run. An effect keyed on `[]` (or on
    a ref object, whose identity never changes) therefore attached its
    observers to `null` on the first pass and was never re-run when the real
    node arrived. A callback ref fires on every mount and unmount, which is
    exactly the signal wanted.
  */
  const [box, setBox] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  /**
   * Whether the highlight has been somewhere already.
   *
   * It is what stops the first row lighting up by flying in from the top edge
   * of the menu: with nowhere to travel from, appearing in place is the honest
   * answer. Only the second row onward is a journey.
   *
   * **State, not a ref**, and the difference was visible. It is read during
   * render to decide whether the transition class is on, and a ref mutated in
   * an effect schedules no re-render — so the class was always one move stale
   * and the first *two* positions were both painted untransitioned. Measured
   * as an instant jump where a move was expected.
   */
  const [settled, setSettled] = useState(false);

  /**
   * In `hover` mode the row is handed in by the pointer handlers rather than
   * found by a selector, so `measure` takes it as an argument and falls back
   * to the marked one.
   */
  const measure = useCallback(
    (target?: HTMLElement | null) => {
    if (!box) return;
    const row =
      target === undefined ? box.querySelector<HTMLElement>(HIGHLIGHTED) : target;
    if (!row) {
      /*
        The mark is gone, and `settled` is deliberately *not* reset here.

        Moving between rows is not atomic: a select clears the old row's mark
        and sets the new one in two separate mutations, so for one frame the
        list has no highlighted row at all. Resetting here took the transition
        class off for exactly that frame, the position changed while it was
        off, and the highlight arrived instantly. Caught by recording
        `transitionDuration` every frame: it read `0s all` on the single frame
        the transform changed, and 0.2s on every frame either side.

        So only the *track* going away resets it (see the effect below), which
        is the case that genuinely means "start again from nowhere".
      */
      // The position is kept, only the visibility goes: a highlight that
      // jumped back to the origin for that one frame would flash across the
      // whole list. `hidden` fades it where the absence is real (the pointer
      // left the menu) and is simply not on screen long enough to see where
      // it is not.
      setRect((last) => (last ? { ...last, hidden: true } : null));
      return;
    }
    /*
      Measured against the track's own box rather than read off `offsetTop`.

      `offsetTop` is relative to the nearest *positioned* ancestor, which is
      the track today and would quietly stop being it the day a row is nested
      inside something with a `relative` of its own — a combobox group, say.
      Two rectangles subtracted cannot drift that way. `scrollTop` is added
      back because the highlight is a child of the scrolling box and scrolls
      with it, so it wants the row's position in the *content*, not in the
      viewport of the box.
    */
    const bounds = box.getBoundingClientRect();
    const here = row.getBoundingClientRect();
    setRect({
      top: here.top - bounds.top + box.scrollTop,
      height: here.height,
      left: here.left - bounds.left + box.scrollLeft,
      width: here.width,
      muted: row.dataset.variant === "destructive",
    });
    },
    [box],
  );

  useEffect(() => {
    if (!box) {
      // Closed, so the next open starts from nowhere rather than sliding in
      // from wherever the pointer left it last time.
      setRect(null);
      setSettled(false);
      return;
    }
    // Hover mode has no mark to watch: the pointer handlers below drive it,
    // and measuring on mount would light a row nobody is pointing at.
    if (mode === "hover") return;

    measure();
    // The mark moves between rows without anything unmounting, so a mutation
    // observer is what sees it. Subtree, because it lands on the row rather
    // than on the box being watched; `childList` as well, because a
    // combobox's filter replaces the rows outright.
    const observer = new MutationObserver(() => measure());
    observer.observe(box, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-highlighted"],
    });
    // A row can also change size without the mark moving: a filtered combobox
    // list, a submenu opening, a label wrapping at a narrow width.
    const resize = new ResizeObserver(() => measure());
    resize.observe(box);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, [box, measure, mode]);

  // Marked settled *after* the paint that positioned it, so the transition is
  // off for the frame the highlight first appears and on for every move after.
  useEffect(() => {
    if (rect) setSettled(true);
  }, [rect]);

  /*
    Hover mode's tracking, and it is delegated rather than per row.

    One pair of handlers on the list beats a pair on every row: the rail's
    rows are rendered in four different places (a link, the create button, the
    collapsed strip, the account card) and each would have had to remember to
    opt in. `closest` finds the row under the pointer whatever it entered
    through, including the icon and the label.

    `pointerover`/`pointerout` rather than `enter`/`leave` precisely *because*
    they bubble: crossing from a row's label to its icon fires out-and-over
    between two children of the same row, and `closest` maps both to the same
    row, so the highlight stays put instead of flickering.
  */
  const onPointerOver = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (mode !== "hover") return;
      const row = (event.target as HTMLElement).closest<HTMLElement>(rows);
      // A gap between rows, or the list's own padding: nothing to light.
      if (!row || !box?.contains(row)) return;
      measure(row);
    },
    [box, measure, mode, rows],
  );

  const onPointerLeave = useCallback(() => {
    if (mode !== "hover") return;
    // Fades where it stands rather than sliding home, so leaving the rail
    // does not drag a block across every row on the way out.
    setRect((last) => (last ? { ...last, hidden: true } : null));
  }, [mode]);

  return {
    track: {
      ref: setBox,
      className: "relative",
      ...(mode === "hover" ? { onPointerOver, onPointerLeave } : {}),
    },
    highlight: { rect, moving: settled && rect !== null },
  };
}

/**
 * The moving fill itself. Purely decorative: the row underneath still carries
 * the text colour, the check mark and `aria-*`, so a reader who cannot see this
 * loses nothing.
 */
export function MagicMove({
  rect,
  moving,
  className,
}: {
  rect: Rect | null;
  moving: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-slot="magic-move"
      className={cn(
        "pointer-events-none absolute top-0 left-0 z-0 rounded-md bg-accent",
        // Panel tier, the same as every other sliding pill in the app.
        moving &&
          "transition-[transform,height,width] duration-200 ease-standard",
        // Nothing highlighted is nothing drawn: the pointer left the menu, or
        // it has not entered yet. A destructive row is the same, and it still
        // *travels* while invisible, so leaving one glides out from under it
        // rather than reappearing somewhere else.
        (rect === null || rect.muted || rect.hidden) && "opacity-0",
        className,
      )}
      /*
        `transform: translate3d`, not the `translate` property, and the
        difference was measured frame by frame rather than guessed.

        `translate` *computes* to a normalised value: write `0px 0px` and the
        browser reports back `0px`, a one-value form. A one-value and a
        two-value form do not interpolate, so the first move off a row sitting
        at the origin snapped to its destination in a single frame with the
        transition correctly reported as 0.2s throughout. A select, whose rows
        are all flush left and whose first row is at the top, hit this on every
        open; the combobox never did, because its first row already had a
        non-zero left. `translate3d` keeps all three components in the computed
        value, so every pair of positions is the same shape.
      */
      style={{
        transform: rect
          ? `translate3d(${rect.left}px, ${rect.top}px, 0)`
          : "translate3d(0px, 0px, 0)",
        height: rect?.height,
        width: rect?.width,
      }}
    />
  );
}
