"use client";

import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PanelLeftIcon } from "lucide-react";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
  /**
   * A `collapsible="float"` rail is hover/focus-expanded: full width, still
   * floating. Descendants need it because `state` stays `"collapsed"`
   * throughout — the peek is a third visual state, not a fourth open state,
   * and anything that stands in for a hidden label (the row tooltips) has to
   * know the label is back.
   */
  peeking: boolean;
  setPeeking: (peeking: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [peeking, setPeeking] = React.useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === "function" ? value(open) : value;
      if (setOpenProp) {
        setOpenProp(openState);
      } else {
        _setOpen(openState);
      }

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed";

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      peeking,
      setPeeking,
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      peeking,
    ],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  state: stateProp,
  className,
  children,
  dir,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none" | "float";
  /**
   * Overrides the open/collapsed state from `SidebarContext`.
   *
   * A `SidebarProvider` carries one shared open state, so two `Sidebar`s under
   * it would expand and collapse together. Pass `state` to make a second rail
   * (e.g. the right-hand editor panel) independent while still living in the
   * same provider — everything downstream reads `data-state` off the DOM, not
   * context, so overriding it here is sufficient. Such a sidebar must also
   * carry its own `--sidebar-width`, and must not contain `SidebarTrigger` or
   * `SidebarRail` (both toggle the *shared* state via context).
   */
  state?: "expanded" | "collapsed";
}) {
  const {
    isMobile,
    state: contextState,
    openMobile,
    setOpenMobile,
    peeking: contextPeeking,
  } = useSidebar();
  const state = stateProp ?? contextState;

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          dir={dir}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  /**
   * `float` is `icon` that has left its panel. Everything below the container
   * — the label hiding, the tooltips, the `size-8` menu buttons — keys off
   * `data-collapsible="icon"`, so a float reports itself as one and carries
   * the detachment on `data-float` instead. That is what keeps this variant a
   * position change rather than a second copy of a dozen rules.
   *
   * **Peeking clears `data-collapsible` and nothing else.** One attribute
   * restores every label, every width and every tooltip in one move, while
   * `data-float` stays set so the box does not travel back to the edge.
   */
  const floating = collapsible === "float" && state === "collapsed";
  // The provider holds one `peeking`, so gating it on `float` here is what
  // keeps the editor rail — which shares this provider — out of it.
  const peeking = floating && contextPeeking;

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      data-collapsible={
        state === "collapsed" && !peeking
          ? collapsible === "float"
            ? "icon"
            : collapsible
          : ""
      }
      data-float={floating ? "" : undefined}
      data-peek={peeking ? "" : undefined}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
      // Hoisted to the wrapper so a per-sidebar `--sidebar-width` override
      // cascades to BOTH the gap div (which reserves the layout space) and the
      // fixed container (the visible panel). Left on the container alone, the
      // gap would keep reading the provider's width and the panel would overlap
      // the content card instead of sitting beside it.
      style={style}
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-standard",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          // A float reserves the strip *plus its gutter*, so the pill floats
          // in space of its own and the content card never sits behind it.
          // Repeated for the peek because `data-collapsible` is cleared there,
          // and peeking is the one state that must not move anything: it grows
          // over the content, not into it.
          // `!` because this must beat the base `w-(--sidebar-width)` above.
          // While peeking, `data-collapsible` is cleared — that is what brings
          // the labels back — so the collapsed rules stop matching and the
          // full width would otherwise win here and shove the content card
          // 188px right on every hover.
          "group-data-float:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]!",
        )}
      />
      <div
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          // `top`/`bottom` rather than `inset-y-0`+`h-svh`: a fixed box with both
          // edges set derives its own height, which is what lets a page-level bar
          // like `TopPanel` claim the strip above this without the panel painting
          // over it. `--top-panel-height` defaults to 0 for any page that has none.
          "fixed top-[var(--top-panel-height,0px)] bottom-0 z-10 hidden w-(--sidebar-width) transition-[left,right,width,top,bottom,height,border-radius] duration-200 ease-standard data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
          // The float: the same fixed box, pulled off all three edges so it
          // reads as detached, and shrunk to its content so it is a pill
          // rather than a column. The travel between the two is one
          // interpolation because this is the same element throughout:
          // nothing is swapped, nothing mounts.
          //
          // **`bottom-0` stays set, and the height is governed by `max-height`
          // instead.** Releasing the bottom edge (`bottom: auto` + `h-fit`)
          // was tried first and measured: the box lost its second anchor in a
          // single frame and dropped 672px → 360px before the transition had
          // run at all, tweening only the last 16px. `interpolate-size` does
          // not help, because that is not an `auto`-to-length change; it is
          // the box ceasing to be stretched. A box held by both edges *and*
          // capped by an animatable `max-height` shrinks from the bottom
          // smoothly, and `h-fit` then settles it on its content.
          //
          // `z-20`, above the inset card, because while peeking it
          // deliberately covers content. `border-r` is dropped in favour of a
          // ring: a border is a stroke inside a box, which on a rounded box
          // that also carries a shadow reads as a doubled edge.
          // Anchored under the top panel, the same edge the docked rail keeps,
          // so collapsing moves the box left and shrinks it without also
          // sliding it down the screen. Centring it on the viewport was tried
          // and reverted: a pill taller than the space had its top *and*
          // bottom run off, and a nav whose first row is above the window is
          // worse than one that simply starts where the docked rail did.
          //
          // `max-height` is what keeps it inside the viewport now. The height
          // is its content's (`h-fit`), so a profile with more rows than fit
          // would otherwise overflow the bottom edge; capped, `SidebarContent`
          // scrolls inside it instead and every row stays reachable.
          "group-data-float:top-[calc(var(--top-panel-height,0px)+--spacing(2))] group-data-float:bottom-auto group-data-float:z-20 group-data-float:h-fit group-data-float:max-h-[calc(100svh-var(--top-panel-height,0px)---spacing(4))] group-data-float:rounded-lg group-data-float:border-0! group-data-float:shadow-lg group-data-float:ring-1 group-data-float:ring-sidebar-border group-data-float:data-[side=left]:left-2",
          // Docked, the height is stated as a length rather than left to the
          // two anchors. `interpolate-size` can tween a length to `fit-content`
          // (that is what it is for) but it cannot tween "stretched between
          // top and bottom" to anything — measured: the box dropped 672px in
          // one frame and only the last 16px animated. With both endpoints
          // written as heights, the shrink is a real interpolation.
          "h-[calc(100svh-var(--top-panel-height,0px))]",
          // Peeking restores the full width without moving the box. It cannot
          // ride the `data-collapsible` rules above, because clearing that
          // attribute is exactly what makes the labels come back.
          // The Reveal tier (`docs/design.md` §1.6), and its only member. A
          // collapse is a command whose result the operator already knows; a
          // peek is a preview that has to be *read* as it opens, and at Panel
          // speed the labels arrive after the eye has moved on. Only the
          // growing direction is slowed: the shrink on mouse-out is the pill
          // getting out of the way, and stays on Panel.
          "group-data-float:group-data-peek:w-(--sidebar-width) group-data-float:group-data-peek:duration-400",
          className,
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          // `overflow-hidden overscroll-x-none touch-pan-y` keeps a horizontal
          // swipe over the rail from reaching the document, where the browser
          // turns it into history back/forward — over the nav that gesture
          // means "switch profile", and it kept navigating away instead.
          // `overscroll-behavior` only applies to scroll containers, which is
          // why `overflow-hidden` comes with it; the header and footer are
          // fixed and the body scrolls inside `SidebarContent`, so nothing here
          // overflowed anyway, and menus and tooltips portal out.
          // `h-full` rather than `size-full` while floating: the pill's height
          // is its content's, so a child claiming 100% of a parent that is
          // sized *by* that child is circular. The container's `h-fit` is the
          // one that decides.
          className="flex size-full touch-pan-y flex-col overflow-hidden overscroll-x-none bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border group-data-float:h-auto group-data-float:rounded-lg"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle sidebar"
      className={cn(
        "absolute inset-y-0 z-20 hidden w-4 transition-all ease-standard group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2",
        "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
        "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
        "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
        "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
        "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The floating content card beside the sidebar(s).
 *
 * Upstream shadcn only handles a *left* inset sidebar: every rule below is
 * gated on `peer-data-[variant=inset]`, which matches the **preceding**
 * `Sidebar` sibling. A right-hand sidebar renders *after* this element, so no
 * CSS sibling selector can reach it and a mirrored `peer-*` rule would silently
 * never match.
 *
 * `insetRight` therefore applies the card treatment unconditionally rather than
 * via a peer selector — use it when this inset is followed by an inset sidebar
 * instead of (or as well as) preceded by one, so the card floats symmetrically
 * between two rails.
 */
function SidebarInset({
  className,
  insetRight = false,
  ...props
}: React.ComponentProps<"main"> & { insetRight?: boolean }) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "relative flex w-full min-w-0 flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-md md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
        // Not peer-gated: the sidebar this pairs with is a *following* sibling.
        insetRight && "md:m-2 md:mr-0 md:rounded-md md:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(
        "h-8 w-full border-input bg-muted/20 dark:bg-muted/30",
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        // `flex-1` is what stretches this to fill a full-height rail, and is
        // exactly what a shrink-to-content pill must not do. `flex-none` hands
        // the height back to the rows.
        //
        // `pb-2` because the footer that used to close the box is hidden while
        // floating, so the last row's own edge became the pill's, and it read
        // as a list cut off rather than a list that ended. It matches the
        // header's `p-2` above it. `min-h-0` lets the container's `max-height`
        // actually shorten this rather than being floored at its content, so
        // an over-tall nav scrolls in place.
        // `flex-initial`, not `flex-none`: both stop the grow that stretches a
        // full-height rail, but `flex-none` also forbids the *shrink*, which
        // is what the container's `max-height` needs in order to bite. With
        // shrinking allowed this sizes to its rows when they fit and scrolls
        // in place when they do not.
        "group-data-float:flex-initial group-data-float:pb-2",
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col px-2", className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  render,
  ...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex h-8 shrink-0 items-center rounded-md px-2 text-xs text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-standard group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-group-label",
      sidebar: "group-label",
    },
  });
}

function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-group-action",
      sidebar: "group-action",
    },
  });
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-xs", className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-[8px]", className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-[calc(var(--radius-sm)+2px)] p-2 text-left text-xs ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-hover hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-active active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-open:hover:bg-sidebar-hover data-open:hover:text-sidebar-accent-foreground data-active:bg-sidebar-active [&_svg]:size-4 [&_svg]:shrink-0 [&>span]:truncate",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-hover hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-hover hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-hover)]",
      },
      size: {
        default: "h-8 text-xs",
        sm: "h-7 text-xs",
        lg: "h-12 text-xs group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  className,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const { isMobile, state, peeking } = useSidebar();
  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(sidebarMenuButtonVariants({ variant, size }), className),
      },
      props,
    ),
    render: !tooltip ? render : <TooltipTrigger render={render} />,
    state: {
      slot: "sidebar-menu-button",
      sidebar: "menu-button",
      size,
      active: isActive,
    },
  });

  if (!tooltip) {
    return comp;
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    };
  }

  return (
    <Tooltip>
      {comp}
      {/* A tooltip stands in for the label the icon rail cannot show, so it
          must go the moment the label is back. `state` alone cannot say that:
          a peeking float is still `collapsed` while being full width on
          screen, and the rail showed both at once. */}
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== "collapsed" || peeking || isMobile}
        {...tooltip}
      />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    showOnHover?: boolean;
  }) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0",
          showOnHover &&
            "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100 md:opacity-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-menu-action",
      sidebar: "menu-action",
    },
  });
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-active/menu-button:text-sidebar-accent-foreground",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean;
}) {
  // Random width between 50 to 90%.
  const [width] = React.useState(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  });

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-4 rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

/**
 * The sub-list draws a file tree, not a rule.
 *
 * Each item's vertical run and its curved leg are one pseudo-element (top → the
 * item's midpoint, then an elbow right), so the tree ends at the last child
 * instead of overshooting past it, and adding or removing a child needs no
 * last-of-type special case. With `gap-1` the runs read as separate ticks
 * rather than one continuous trunk — deliberate; set `gap-0` to butt them into
 * a single line.
 *
 * The tree is drawn in the strip to the left of the rows, and the rows start
 * clear of it. Fills used to span the parent's full width — which lined them up
 * with the section button above, but painted over the elbow they were meant to
 * sit beside. A row's fill now begins where the row does, just past the leg.
 */
function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      className={cn(
        "flex w-full min-w-0 flex-col gap-1 py-0.5 group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="sidebar-menu-sub-item"
      data-sidebar="menu-sub-item"
      className={cn(
        "group/menu-sub-item relative before:pointer-events-none before:absolute before:top-0 before:left-3.5 before:h-[calc(50%+1px)] before:w-2 before:rounded-bl-[6px] before:border-b before:border-l before:border-sidebar-border before:content-['']",
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  render,
  size = "md",
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<"a"> &
  React.ComponentProps<"a"> & {
    size?: "sm" | "md";
    isActive?: boolean;
  }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          // The row starts past the tree elbow rather than under it: the leg
          // ends at 22px, the row at 24px (`ml-6`), the label still at 32px
          // (`pl-2`). Widening back to `w-full` puts the hover fill over the
          // tree again — that is the bug this shape fixes.
          "group/menu-button flex h-7 w-[calc(100%-1.5rem)] min-w-0 items-center gap-2 overflow-hidden rounded-[calc(var(--radius-sm)+2px)] py-2 pr-2 pl-2 ml-6 text-sidebar-foreground ring-sidebar-ring outline-hidden group-data-[collapsible=icon]:hidden hover:bg-sidebar-hover hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-active active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-xs data-[size=sm]:text-xs data-active:bg-sidebar-active data-active:font-medium data-active:text-sidebar-accent-foreground [&>span]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
          className,
        ),
      },
      props,
    ),
    render,
    state: {
      slot: "sidebar-menu-sub-button",
      sidebar: "menu-sub-button",
      size,
      active: isActive,
    },
  });
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
