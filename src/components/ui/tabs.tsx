"use client";

import { useRef, useState } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  // The grab cursor only where there is a pill to grab: a `line` strip is an
  // underline with nothing to pick up, and a vertical one goes nowhere
  // sideways. Neither should claim otherwise.
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none group-data-horizontal/tabs:data-[variant=default]:cursor-grab data-dragging:cursor-grabbing data-dragging:select-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** Travel under this many pixels is a click that wobbled, not a drag. */
const DRAG_SLOP = 3;

/**
 * The two parts a draggable strip is made of.
 *
 * A Base UI strip labels them for us. A hand-rolled pill (the view toggle in
 * `DocumentsBrowser`) says so with `data-drag-pill` / `data-drag-segment`, which
 * is all `useTabDrag` needs from it — a segment is committed to by being
 * clicked, so a button and a link both work.
 */
const PILL_SELECTOR = '[data-slot="tabs-indicator"],[data-drag-pill]';
const SEGMENT_SELECTOR = '[data-slot="tabs-trigger"],[data-drag-segment]';

/**
 * The pill can be picked up and dragged, and it activates whichever tab it is
 * nearest when let go.
 *
 * Wired into `TabsList` itself, so every tab strip in the app has it without
 * opting in — see `docs/design.md` §2.7. It is strictly an accelerator: the
 * triggers are still buttons, still clickable, still reachable by keyboard, and
 * nothing here is the only way to select anything.
 *
 * **Mouse and pen only.** A touch drag across a tab strip is how the page under
 * it scrolls, and claiming that gesture would cost more than it gives.
 *
 * **Measured, not assumed.** Tabs are rarely equal widths, so the commit is the
 * trigger whose centre is nearest the dragged pill's centre rather than a
 * fraction of the way across. That also makes a three- or five-tab strip work
 * with no arithmetic of its own.
 */
export function useTabDrag() {
  const [drag, setDrag] = useState<{
    startX: number;
    /** How far the pill may travel and stay inside the trough. */
    min: number;
    max: number;
    dx: number;
  } | null>(null);
  /** Whether the pointer travelled far enough that the release was a drag. */
  const moved = useRef(false);
  /** A drag has committed; swallow the click its release is about to land. */
  const swallow = useRef(false);
  /** The commit's own click, which must be let through to the trigger. */
  const committing = useRef(false);

  /**
   * What is being dragged, in falling order of preference: the strip's own
   * indicator, a hand-rolled pill that has marked itself, or, failing both, the
   * active trigger — which is what `SpecDetailsTabs` leaves behind when it
   * suppresses the indicator in favour of a Motion pill. The last case cannot
   * be watched moving, but it still commits correctly, which is the half that
   * matters.
   */
  const pill = (list: Element) =>
    list.querySelector(PILL_SELECTOR) ??
    list.querySelector(`${SEGMENT_SELECTOR}[data-active]`);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.pointerType === "touch") return;
    const list = event.currentTarget;
    // Vertical strips are dragged nowhere: sideways means nothing there.
    if (
      list
        .closest('[data-slot="tabs"]')
        ?.getAttribute("data-orientation") === "vertical"
    )
      return;
    const indicator = pill(list);
    if (!indicator) return;

    const box = indicator.getBoundingClientRect();
    const trough = list.getBoundingClientRect();
    moved.current = false;
    // A release that never produced a click (let go outside the strip) would
    // otherwise leave this armed and eat the next real one.
    swallow.current = false;
    setDrag({
      startX: event.clientX,
      min: trough.left - box.left,
      max: trough.right - box.right,
      dx: 0,
    });
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const dx = Math.max(drag.min, Math.min(drag.max, event.clientX - drag.startX));
    if (Math.abs(event.clientX - drag.startX) > DRAG_SLOP && !moved.current) {
      moved.current = true;
      // Captured here rather than on the way down: capturing at pointerdown
      // retargets the click to the capture element, which stops a plain tap on
      // a tab from ever reaching it.
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    setDrag({ ...drag, dx });
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const list = event.currentTarget;
    const indicator = pill(list);
    const dragged = moved.current;
    setDrag(null);
    if (!dragged || !indicator) return;

    // The box read here is the *dragged* one: the offset is already in the
    // pill's transform, so adding `drag.dx` again would count it twice and land
    // the release a whole gesture further along than the hand.
    const box = indicator.getBoundingClientRect();
    const centre = box.left + box.width / 2;
    const triggers = [...list.querySelectorAll<HTMLElement>(SEGMENT_SELECTOR)];
    const nearest = triggers.reduce((best, trigger) => {
      const distance = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return Math.abs(rect.left + rect.width / 2 - centre);
      };
      return distance(trigger) < distance(best) ? trigger : best;
    }, triggers[0]);

    if (!nearest) return;
    // Dispatched, then the *native* click that follows the release is swallowed.
    // The order matters and getting it wrong is silent: swallowing first eats
    // this click too, and the drag then tracks the hand perfectly and selects
    // nothing at all.
    committing.current = true;
    nearest.click();
    committing.current = false;
    swallow.current = true;
  };

  return {
    "data-dragging": drag ? "" : undefined,
    style: { "--tab-drag": `${drag?.dx ?? 0}px` } as React.CSSProperties,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: () => setDrag(null),
    // The mouse comes up over one of the tabs, and that tab must not activate
    // on its own — it is frequently the one being dragged away from. Stopped in
    // the capture phase, which is what keeps it from reaching the trigger's own
    // handler; `preventDefault` alone would not.
    onClickCapture: (event: React.MouseEvent) => {
      if (committing.current || !swallow.current) return;
      swallow.current = false;
      event.stopPropagation();
      event.preventDefault();
    },
  };
}

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const { style, ...drag } = useTabDrag();
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
      // After `props`, so a caller cannot drop the gesture by passing a pointer
      // handler of its own. Its `style` is merged rather than replaced: the
      // drag rides on a custom property and would otherwise be clobbered.
      {...drag}
      style={{ ...(props.style as React.CSSProperties), ...style }}
    />
  );
}

/**
 * The raised surface behind the active tab.
 *
 * Exported because three things draw it — this file's `TabsIndicator` and
 * `TabsTrigger`, plus the two hand-rolled pills (`SpecDetailsTabs`'s Motion one
 * and the list/card toggle in `DocumentsBrowser`) — and they had already
 * drifted apart.
 *
 * **Fill and shadow, in both themes. No stroke in either.** Light mode raises
 * the pill by making it lighter than the trough (white on `--muted`) and adds a
 * shadow; dark mode does the same thing in the same direction, because lighter
 * is what "nearer" means under a light source and that does not invert with the
 * theme. What dark mode cannot do is inherit light's *values*: `--background`
 * there is darker than `--muted`, so painting the pill `bg-background` would
 * push it into the trough. Hence a white overlay instead.
 *
 * The stroke is gone. It was added when the fill was `bg-input/30` (L .28
 * against a trough at L .269), which is to say the border was compensating for
 * a fill that did not read; with a fill that does, an outline only makes the
 * one component in the app that is drawn two visibly different ways. The shadow
 * stays slight, since it does little over a dark ground and the fill is now
 * carrying the elevation.
 */
const tabPillSurface =
  "bg-raised shadow-sm dark:shadow-[0_1px_2px_oklch(0_0_0/0.4)]";

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:py-[calc(--spacing(1.25))] hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        // Same surface as `tabPillSurface`, spelled with `data-active:` since
        // it paints on the trigger itself. Keep the two in step.
        "data-active:bg-raised data-active:shadow-sm data-active:text-foreground dark:data-active:text-foreground dark:data-active:shadow-[0_1px_2px_oklch(0_0_0/0.4)]",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The pill behind the active tab. Base UI measures the active trigger onto
 * `--active-tab-left` / `--active-tab-width`, so this slides between them
 * rather than blinking from one to the next.
 *
 * A list using it should suppress its triggers' own `data-active` background —
 * otherwise that paints instantly and there is nothing left to watch.
 */
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        // `--tab-drag` is set on the list by `useTabDrag` and inherits down. It
        // is 0 at rest, so the resting position is exactly what it always was.
        "absolute top-1/2 left-0 z-0 h-[calc(100%-6px)] w-(--active-tab-width) -translate-y-1/2 translate-x-[calc(var(--active-tab-left)+var(--tab-drag,0px))] rounded-md transition-[translate,width] duration-200 ease-standard",
        // Untransitioned under the hand: the offset is already per-frame, and a
        // transition on top of it lags the pointer.
        "group-data-dragging/tabs-list:transition-none",
        tabPillSurface,
        className,
      )}
      {...props}
    />
  );
}

/**
 * Stacks the panels on one grid cell so the outgoing one is still on screen
 * while the incoming one arrives — which is what makes the movement read as
 * one panel pushing the other rather than a swap.
 *
 * Clipped horizontally, because for that half-second there are two panels'
 * widths in a one-panel space.
 */
function TabsPanels({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-panels"
      className={cn(
        "grid overflow-x-clip **:data-[slot=tabs-content]:[grid-area:1/1]",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Panels are kept mounted so the one leaving can animate out; Base UI marks it
 * `data-ending-style` and waits for the transition before hiding it. The
 * direction of travel decides which way each goes — moving right, the arriving
 * panel comes from the right and the leaving one goes out to the left.
 *
 * 1.5s. Base UI holds the leaving panel in the DOM for the whole of it, so the
 * tabs stay clickable throughout — a second click mid-slide just redirects it.
 *
 * Belongs inside `TabsPanels`. On its own the two panels would stack
 * vertically for the length of the transition.
 */
function TabsContent({
  className,
  keepMounted = true,
  ...props
}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      keepMounted={keepMounted}
      className={cn(
        "flex-1 text-xs/relaxed outline-none",
        "transition-[translate] duration-200 ease-standard motion-reduce:transition-none",
        "data-[activation-direction=right]:data-[starting-style]:translate-x-full data-[activation-direction=right]:data-[ending-style]:-translate-x-full",
        "data-[activation-direction=left]:data-[starting-style]:-translate-x-full data-[activation-direction=left]:data-[ending-style]:translate-x-full",
        className,
      )}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsIndicator,
  TabsPanels,
  TabsContent,
  tabsListVariants,
  tabPillSurface,
};
