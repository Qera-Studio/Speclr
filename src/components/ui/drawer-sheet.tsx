'use client';

import type { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

/**
 * The drawer, as one component rather than a shape each caller rebuilds.
 *
 * `ui/sheet.tsx` is the primitive: a panel, a backdrop, a portal into the inset
 * card. What it is not is the *layout* every drawer in this app puts inside it,
 * which is always the same three parts — a header that does not scroll, a body
 * that does, and a footer pinned to the bottom — and which all three callers
 * had written out by hand.
 *
 * It is the same argument `ui/pagination.tsx` makes at the top of its own file,
 * and it had already produced the same result: the copies had drifted.
 * `Notifications` drew a rule under its header and the other two did not; two
 * of the three remembered `pr-16` to clear the close button and one did not;
 * the primitives default to `p-6` and every caller overrode it to `p-4`, which
 * means the default was wrong rather than the callers. `ServiceSheet`'s own
 * comment said it outright: "The clause drawer's chrome, exactly". A comment
 * pointing at another file for the reasoning is a component asking to exist.
 *
 * **It owns the frame, not the content.** The header takes a title and an
 * optional description or trailing badges; the body is whatever the caller
 * puts there and is the part that scrolls; the footer is a slot. Anything
 * about *what* is in the drawer stays with the caller, which is why the clause
 * library still owns its clause editor and `ServiceSheet` its service fields.
 *
 * `DrawerToolbar` is the control row above the header, and `RecordDrawer`
 * wraps the whole edit-a-record pattern on top of this. Both are separate so
 * that a drawer that needs neither, like `Notifications`, pays for neither.
 *
 * Two entry points. `DrawerFrame` is the layout alone, rendered inside a
 * `<Sheet>` somebody else owns, so a caller opening from a `SheetTrigger`
 * keeps its uncontrolled open state instead of lifting it into React just to
 * use this layout. `DrawerSheet` is that plus the `<Sheet>` wrapper, for the
 * controlled case.
 */
export function DrawerFrame({
  title,
  description,
  titleAside,
  toolbar,
  footer,
  quietFooter,
  children,
  size = 'md',
  side = 'right',
  float,
  showCloseButton,
  headerBorder,
  overlayClassName,
  className,
  bodyClassName,
  'aria-label': ariaLabel,
}: DrawerFrameProps) {
  return (
    <SheetContent
      side={side}
      size={size}
      float={float}
      showCloseButton={showCloseButton ?? !toolbar}
      overlayClassName={overlayClassName}
      // `gap-0 p-0` because this component lays out its own three parts and
      // pads each of them. Every caller passed exactly this.
      className={cn('gap-0 p-0', className)}
      aria-label={ariaLabel}
    >
      {toolbar}

      {/*
        `p-4`, not the primitive's `p-6`. All three callers overrode it, which
        is the definition of the default being wrong; `docs/design.md` §2.11
        records the drawer's padding.

        `pr-16` only when the sheet draws its own close button, which it floats
        at `top-4 right-4`. Applied unconditionally it would leave a 56px hole
        at the end of a title row that has nothing in that corner, which is why
        this is computed rather than constant.
      */}
      <SheetHeader
        className={cn(
          'gap-1 p-4',
          (showCloseButton ?? !toolbar) && 'pr-16',
          headerBorder && 'border-b',
        )}
      >
        {titleAside ? (
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-section">{title}</SheetTitle>
            <span className="flex shrink-0 items-center gap-2">{titleAside}</span>
          </div>
        ) : (
          // `text-section` is §1.4's card/section heading rung, and that is what a
          // drawer title is: the name of the thing the panel is about. The
          // primitive's `text-body` is sized for a label over a feed.
          <SheetTitle className="text-section">{title}</SheetTitle>
        )}
        {description ? <SheetDescription>{description}</SheetDescription> : null}
      </SheetHeader>

      {/*
        The body is the only part that scrolls, and `min-h-0` is what makes
        that true rather than a hope. A flex item's `min-height` is `auto`, so
        without it this box is floored at its content's height and a long
        drawer pushes the footer off the bottom instead of scrolling. That
        exact bug has been fixed twice in this codebase (`CONTEXT.md` §5e).
      */}
      <div className={cn('min-h-0 flex-1 overflow-y-auto p-4', bodyClassName)}>{children}</div>

      {/*
        Two footers, because they are two different things rather than one
        thing with a flag.

        A **row of controls** is a region of the panel: it takes the
        primitive's `SheetFooter`, an edge, and its own padding. `mt-0`
        overrides the primitive's `mt-auto`, since this column already gives
        the body `flex-1` and an auto margin fights it; `flex-row` because a
        drawer footer is a row, not a stack.

        A **quiet footer** is a status line that appears only while something
        is happening, and it is a plain row on purpose. It takes no rule,
        which would otherwise sit there with nothing under it whenever the
        line is empty, and crucially no padding: the padding belongs to the
        caller's paragraph, which carries `empty:hidden`, and a padded row
        would keep the height that paragraph gives up. `SheetFooter`'s own
        `p-6` is why this cannot be the same element with a class off.
      */}
      {footer ? (
        quietFooter ? (
          <div className="flex flex-row items-center justify-end gap-2">{footer}</div>
        ) : (
          <SheetFooter className="mt-0 flex-row items-center gap-2 border-t p-4">
            {footer}
          </SheetFooter>
        )
      ) : null}
    </SheetContent>
  );
}

interface DrawerFrameProps {
  /** The name of the thing the drawer is about. */
  title: ReactNode;
  /** A standing line under the title. Omit it where the title is enough. */
  description?: ReactNode;
  /** Badges or controls on the title's own row, at its far end. */
  titleAside?: ReactNode;
  /** The control row above the header. See `DrawerToolbar`. */
  toolbar?: ReactNode;
  /** The footer's contents. Omitted, no footer and no rule are drawn. */
  footer?: ReactNode;
  /**
   * A footer that is a status line rather than a row of controls: no rule, no
   * padding of its own. See the note where it is applied.
   */
  quietFooter?: boolean;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Floats the panel off the card's edge rather than sitting flush to it. */
  float?: boolean;
  /**
   * Defaults to **false where a toolbar is given**, because the toolbar's own
   * back control does that job and two controls doing one thing in one corner
   * is what the row was added to end.
   */
  showCloseButton?: boolean;
  /**
   * A rule under the header. Off by default.
   *
   * A drawer whose header names the field directly below it should not be
   * fenced off from it, which is the clause drawer's reasoning and the reason
   * this is not simply always on. A feed, where the header is a label over a
   * list of unrelated items, is the case that wants one.
   */
  headerBorder?: boolean;
  overlayClassName?: string;
  className?: string;
  /** Extra classes on the scrolling body, for a caller that lays out a column. */
  bodyClassName?: string;
  'aria-label'?: string;
}

/** `DrawerFrame` plus the `<Sheet>` around it, for a controlled drawer. */
export function DrawerSheet({
  open,
  onOpenChange,
  ...frame
}: DrawerFrameProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <DrawerFrame {...frame} />
    </Sheet>
  );
}
