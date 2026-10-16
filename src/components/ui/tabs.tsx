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
  "group/tabs-list relative inline-flex w-fit items-center justify-center text-tab-label group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none group-data-horizontal/tabs:data-[variant=default]:cursor-grab data-dragging:cursor-grabbing data-dragging:select-none",
  {
    variants: {
      variant: {
        // The segmented trough (`segmentTrough`): a soft fill and no stroke.
        // The pill's own shadow is what lifts the choice off it.
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
      size: {
        default: "rounded-lg p-1 group-data-horizontal/tabs:h-10",
        // For a toolbar row, where every button is 28px tall.
        sm: "rounded-lg p-0.5 group-data-horizontal/tabs:h-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
  /** Tears down whichever `window` listeners the current drag attached. */
  const cleanup = useRef<(() => void) | null>(null);

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
      list.closest('[data-slot="tabs"]')?.getAttribute("data-orientation") ===
      "vertical"
    )
      return;
    const indicator = pill(list);
    if (!indicator) return;

    // A stray second pointerdown before the first drag's `pointerup` (two
    // buttons, a stuck browser state) would otherwise stack listeners.
    cleanup.current?.();

    const box = indicator.getBoundingClientRect();
    const trough = list.getBoundingClientRect();
    const startX = event.clientX;
    const min = trough.left - box.left;
    const max = trough.right - box.right;
    moved.current = false;
    // A release that never produced a click (let go outside the strip) would
    // otherwise leave this armed and eat the next real one.
    swallow.current = false;
    setDrag({ startX, min, max, dx: 0 });

    /**
     * Tracked on `window`, not through this element's own bubbling handlers.
     *
     * The pointer capture this used to take on the first move past the slop
     * threshold had a hole: on a narrow strip (the list/card toggle is
     * 152px), an ordinary-speed drag's *first* `pointermove` can already land
     * outside the strip's bounds before that move ever reaches this handler
     * — a synthetic React event only fires when the native event's target is
     * inside this element's subtree, and without capture already active,
     * hit-testing sends it to whatever is now under the cursor instead. So
     * capture was never taken, every later move suffered the same fate, and
     * the pill sat dead at rest for the rest of the gesture — `data-dragging`
     * stuck true, cursor stuck `grabbing`, until the next pointerdown reset
     * it. Confirmed with a two- and three-step synthetic drag before this
     * fix, both of which never moved the pill at all.
     *
     * `window` sees every pointer event in the document regardless of what
     * is currently under the cursor, so tracking here needs no capture at
     * all — which also means the click-retargeting capture caused (the
     * reason it was deferred to the first move rather than taken on the way
     * down) never arises. A plain, no-movement tap on a trigger still
     * reaches the trigger's own `onClick` untouched.
     */
    const handleMove = (moveEvent: PointerEvent) => {
      const dx = Math.max(min, Math.min(max, moveEvent.clientX - startX));
      if (Math.abs(moveEvent.clientX - startX) > DRAG_SLOP)
        moved.current = true;
      setDrag((current) => (current ? { ...current, dx } : current));
    };

    const finish = (commit: boolean) => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
      cleanup.current = null;
      const dragged = moved.current;
      setDrag(null);
      if (!commit || !dragged) return;

      // The box read here is the *dragged* one: the offset is already in the
      // pill's transform, so adding the last `dx` again would count it twice
      // and land the release a whole gesture further along than the hand.
      const indicatorNow = pill(list);
      if (!indicatorNow) return;
      const dragBox = indicatorNow.getBoundingClientRect();
      const centre = dragBox.left + dragBox.width / 2;
      const triggers = [
        ...list.querySelectorAll<HTMLElement>(SEGMENT_SELECTOR),
      ];
      const nearest = triggers.reduce((best, trigger) => {
        const distance = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return Math.abs(rect.left + rect.width / 2 - centre);
        };
        return distance(trigger) < distance(best) ? trigger : best;
      }, triggers[0]);
      if (!nearest) return;

      // Dispatched, then the *native* click that follows the release is
      // swallowed. The order matters and getting it wrong is silent:
      // swallowing first eats this click too, and the drag then tracks the
      // hand perfectly and selects nothing at all.
      committing.current = true;
      nearest.click();
      committing.current = false;
      swallow.current = true;
    };

    const handleUp = () => finish(true);
    const handleCancel = () => finish(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    cleanup.current = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  };

  return {
    "data-dragging": drag ? "" : undefined,
    style: { "--tab-drag": `${drag?.dx ?? 0}px` } as React.CSSProperties,
    onPointerDown,
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
  size = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const { style, ...drag } = useTabDrag();
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      data-size={size}
      className={cn(tabsListVariants({ variant, size }), className)}
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
 * The segmented look, in three parts, so every strip in the app draws the same
 * one (`docs/design.md` §2.7). It came from a reference design adopted on
 * 10 October 2026: a soft grey trough, a white pill under the choice with a
 * shadow and no stroke, and muted labels that go to full ink when chosen.
 *
 * **The pill is white in light mode and one step up the ramp in dark**, which
 * is "nearer" in both themes: lighter is what raised means under a light
 * source, and that does not invert with the theme. `--background` cannot be
 * the dark value because it is darker than the trough there.
 *
 * Used by `TabsIndicator`, `TabsTrigger`, and the strips Base UI does not build
 * (`ProfileSwitcher`, the documents view toggle, `ThemeToggle`,
 * `SpecDetailsTabs`'s Motion pill). Change it here and they all follow.
 */
const segmentTrough = "rounded-lg bg-muted";
const tabPillSurface =
  "rounded-sm bg-background shadow-raised dark:bg-foreground/10";
/** A segment's label: muted at rest, full ink once chosen or under the pointer. */
const segmentLabel = "font-medium text-tab-label transition-colors hover:text-foreground";

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-full flex-1 items-center justify-center gap-2 rounded-sm px-4 text-sm whitespace-nowrap group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:py-1.5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        segmentLabel,
        // The compact strip, for a toolbar row.
        "group-data-[size=sm]/tabs-list:gap-1.5 group-data-[size=sm]/tabs-list:px-3 group-data-[size=sm]/tabs-list:text-xs group-data-[size=sm]/tabs-list:[&_svg:not([class*='size-'])]:size-3.5",
        // `line` is an underline, not a pill — its active trigger keeps no
        // fill and no border in either theme. Unprefixed rather than `dark:`
        // only, so it also overrides the new `data-active:border-border`
        // below in light mode.
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:shadow-none",
        // Same surface as `tabPillSurface`, spelled with `data-active:` since
        // it paints on the trigger itself. Keep the two in step.
        "data-active:bg-background data-active:text-foreground data-active:shadow-raised dark:data-active:bg-foreground/10",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The pill behind the active tab. Base UI measures the active trigger onto
 * `--active-tab-left` / `--active-tab-width`, so one element is positioned
 * under whichever tab is on. It moves in a frame: a pill that slid between
 * tabs was decoration, and the drag in `useTabDrag` still works because the
 * offset there is per-frame anyway (`docs/design.md` §1.6).
 *
 * A list using it should suppress its triggers' own `data-active` background.
 */
function TabsIndicator({ className, ...props }: TabsPrimitive.Indicator.Props) {
  return (
    <TabsPrimitive.Indicator
      data-slot="tabs-indicator"
      className={cn(
        // `--tab-drag` is set on the list by `useTabDrag` and inherits down. It
        // is 0 at rest, so the resting position is exactly what it always was.
        "absolute top-1/2 left-0 z-0 h-8 w-(--active-tab-width) -translate-y-1/2 translate-x-[calc(var(--active-tab-left)+var(--tab-drag,0px))] group-data-[size=sm]/tabs-list:h-6",
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
 * Panels are kept mounted by default so a form inside one keeps its state
 * across a switch. Nothing slides: the arriving panel is simply the one shown.
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
  segmentTrough,
  segmentLabel,
};
