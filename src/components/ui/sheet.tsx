"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/**
 * The inset card every sheet in the app opens inside (`docs/design.md` §2.11).
 *
 * A context rather than a prop, and that is the whole point of it. A sheet is
 * `fixed`, so left alone it resolves against the viewport and covers the
 * window: the nav, the header band and the margin the card floats in all go
 * dim to report something happening inside the card. `Notifications` was given
 * `container`/`contained` to stop that, and was handed them by `AdminShell`,
 * which it is a direct child of. The clause library's drawer is four levels
 * down a page and could not be handed anything, so it spilled.
 *
 * `AdminShell` publishes its card once and every sheet beneath it is contained
 * without being told, which is the rule the user asked for: not something a
 * caller has to remember, and not something that has to be asked about.
 *
 * Undefined outside the shell, which is the `PageHeaderSlot` degradation. Every
 * production route renders inside `AdminShell`, and a sheet on its own in a
 * test must still open.
 */
const InsetContext = React.createContext<
  React.RefObject<HTMLElement | null> | undefined
>(undefined)

function InsetProvider({
  inset,
  children,
}: {
  inset: React.RefObject<HTMLElement | null>
  children: React.ReactNode
}) {
  return <InsetContext value={inset}>{children}</InsetContext>
}

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-(--z-modal) bg-black/80 transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

/**
 * How wide a drawer is, as a proportion of the card it opens in.
 *
 * Three sizes, because there were three drawers in the app and three
 * unrelated answers: the notifications feed took the base `sm:max-w-sm`, the
 * clause drawer overrode it to `sm:max-w-xl`, and the mobile nav set a CSS
 * variable. None of those was a decision about drawers; each was a number
 * typed at one call site.
 *
 * - `sm` is a feed read down one column: notifications, activity.
 * - `md` is something worked through beside the list it came from: a clause,
 *   a service's scope.
 * - `lg` is a record consulted rather than edited, wide enough to lay out in
 *   columns, and still a drawer because it is a glance rather than a page.
 *
 * **Percentages, not fixed maxima**, because a contained sheet is positioned
 * against the inset card (see `SheetContent`), and that card's width moves
 * with the sidebar. A fixed `max-w` would read as one proportion with the nav
 * open and another with it collapsed.
 *
 * Each carries a floor. 30% of a narrow card on a laptop is narrower than the
 * `24rem` the feed used to get, and a percentage that makes something *worse*
 * on a small screen is a percentage with no floor. The floor wins when the
 * card is small, the percentage when it is not.
 *
 * **The floors are measured, not named after their size.** A floor above the
 * percentage at ordinary widths is not a floor, it is the width, and the
 * percentage beside it becomes decoration. The card runs 1028px at a 1280
 * viewport and 1668px at 1920, so `md` resolves to 617px at the narrow end:
 * `min-w-2xl` (672px) was tried first and silently governed the whole laptop
 * range. Each floor is therefore set below what its percentage yields on the
 * smallest screen this app is used on, which makes it the exception it is
 * supposed to be. Re-measure them if the shell's margins change.
 *
 * `sm` is the exception and keeps a floor that *does* bind on a laptop: 30% of
 * the 1028px card is 308px against the 384px the feed had as a fixed maximum
 * before this. A notification list narrower than the one it replaces would be
 * this change making something worse, so `min-w-sm` holds it at 384 until the
 * card is wide enough for the share to exceed it (around 1280px of card, which
 * is a 1536 viewport).
 */
const SIZES = {
  sm: "w-[30%] min-w-sm",
  // Narrowed from 60% on 17 September 2026: at 60 the clause drawer covered
  // most of the card and the list it opens from stopped being readable beside
  // it, which is the whole reason this drawer does not dim.
  //
  // **The floor came down with it, and had to.** 48% of the 1028px card is
  // 493px, so `min-w-lg` (512px) would have governed the entire laptop range
  // and made the percentage decoration: the same mistake `min-w-2xl` made at
  // 60%, one rung down. `md` (448px) sits under it, which is what keeps it a
  // floor.
  md: "w-[48%] min-w-md",
  lg: "w-[90%] min-w-2xl",
} as const

/**
 * The gap a floating drawer keeps from the card's edges, and the corner it
 * takes because of it.
 *
 * `rounded-sm`, not the card's own `rounded-md`: §1.3 says a nested corner is
 * one step smaller than its parent and never equal, because two boxes at one
 * radius read as a single shape rather than one resting on the other.
 *
 * `shadow-modal` comes from the base string and is what separates the panel from
 * the page in the light theme; the ring is what does it in dark, where a drop
 * shadow on a near-black surface separates nothing (§2.6). Both, so the edge
 * is there in either.
 */
const FLOAT = "rounded-sm ring-1 ring-border"

/**
 * Where a floating drawer sits, which is the whole difference between the two
 * sizes it is used at.
 *
 * Tucked to the right at the ordinary size, so it still reads as something
 * pushed in from the edge; **centred** when expanded, because a panel that
 * detaches from the edge on one side only is a wide drawer, and what expanding
 * is for is a window over the page. The height comes off the edges with it, or
 * a panel inset on two sides and flush on the other two would look like a
 * mistake rather than a shape.
 */
const FLOAT_PLACE = {
  side: "top-2 right-2 bottom-2 h-auto",
  centre: "top-[5%] left-1/2 h-[90%] -translate-x-1/2",
} as const

/**
 * Every sheet opens inside the inset card, and no caller has to say so.
 *
 * Two halves of one answer, taken from `InsetContext` rather than from props.
 * `container` is Base UI's own prop and it moves only the DOM. What a sheet is
 * positioned *against* is its own `fixed`, which resolves to the viewport from
 * wherever it is rendered, so a portalled sheet still covers the whole window.
 * Containing it swaps the panel and its backdrop to `absolute`, which resolves
 * against the nearest positioned ancestor: the card, which is `relative`, and
 * which is then what the scrim darkens.
 *
 * `container` stays a prop for a sheet that has to open somewhere else. Nothing
 * passes it today, and the default is the rule.
 */
function SheetContent({
  className,
  children,
  side = "right",
  size = "sm",
  float = false,
  showCloseButton = true,
  container,
  overlayClassName,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  /** How wide, as a share of the inset card. See `SIZES`. */
  size?: keyof typeof SIZES
  /**
   * Floats clear of the card's edges instead of filling one.
   *
   * The default drawer is a *region* of the card: full height, hard against
   * its edge, and it reports what it is by taking the page's space. A
   * floating one is an *object* on the page, which is what a drawer that does
   * not dim what is behind it has to be, or it has no edge at all.
   *
   * At `lg` it also centres itself. See `FLOAT_PLACE`.
   */
  float?: boolean
  showCloseButton?: boolean
  /** Overrides the inset from context. Defaults to the card the shell publishes. */
  container?: SheetPrimitive.Portal.Props["container"]
  /**
   * The backdrop's classes.
   *
   * There to let a caller change how much it darkens. The backdrop is never
   * removed, because it is also what closes the sheet on an outside click and
   * what keeps the page behind it inert; what a caller can decide is the
   * weight. `ClauseLibrary` is the one that does: its drawer opens on a row of
   * a list whose neighbouring rows are the context, so it takes a quarter of
   * the default and no blur, enough to seat the drawer without putting the
   * clause numbers behind it out of reach.
   */
  overlayClassName?: string
}) {
  const inset = React.useContext(InsetContext)
  const target = container ?? inset
  const contained = target !== undefined
  const sided = side === "left" || side === "right"
  /*
    Floating only means anything on a side drawer. A top or bottom sheet has
    no edge to come off, so `float` is ignored there rather than producing a
    panel pinned to three edges and centred against the fourth.
  */
  const floating = float && sided

  return (
    <SheetPortal container={target}>
      <SheetOverlay className={cn(contained && "absolute", overlayClassName)} />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        data-float={floating ? "" : undefined}
        className={cn(
          "fixed z-(--z-modal) flex flex-col bg-popover bg-clip-padding text-body text-popover-foreground shadow-modal transition duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem]",
          /*
            The flush placement, which used to live in the base string as
            `data-[side=right]:inset-y-0 … h-full … border-l`. It had to come
            out: those are a *width* and a *height* that a floating panel has
            to override, and `inset-y-0` in particular beats a `top`/`bottom`
            pair, so left in place it would have pinned the floating drawer to
            the card's full height while everything else about it said
            otherwise. Conditional here, rather than fought with `!`.
          */
          !floating &&
            side === "right" &&
            "inset-y-0 right-0 h-full border-l",
          !floating &&
            side === "left" &&
            "inset-y-0 left-0 h-full border-r",
          /*
            Only a side drawer takes a width from `size`. A top or bottom sheet
            spans the card and is sized by its content, so handing it `w-[60%]`
            would make a panel that is neither full width nor centred.

            The base string lost `w-3/4` and `sm:max-w-sm` with this: a max
            beats a width, so leaving the old ceiling in place would have
            pinned every size to 24rem and made the whole prop inert.
          */
          sided && SIZES[size],
          floating && FLOAT,
          floating && (size === "lg" ? FLOAT_PLACE.centre : FLOAT_PLACE.side),
          contained && "absolute",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-4 right-4"
                size="sm" icon
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-6", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-6", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "text-body font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-body text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  InsetProvider,
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
