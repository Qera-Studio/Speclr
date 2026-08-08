"use client";

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
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-8 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
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

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:py-[calc(--spacing(1.25))] hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-1 has-data-[icon=inline-start]:pl-1 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
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
        "absolute top-1/2 left-0 z-0 h-[calc(100%-6px)] w-(--active-tab-width) -translate-y-1/2 translate-x-(--active-tab-left) rounded-md bg-background shadow-sm transition-[translate,width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border dark:border-input dark:bg-input/30",
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
        "transition-[translate] duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
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
};
