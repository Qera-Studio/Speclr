import { cva, type VariantProps } from "class-variance-authority";
import { SearchX, CircleAlert, Inbox, MapPinOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The "nothing here yet" panel.
 *
 * Filled in both modes. It was light-only on the theory that in dark the card
 * behind it (`--card` 0.205) already sits above the page (`--background`
 * 0.145) and so reads as a panel on its own — it doesn't: against the card the
 * dashed outline enclosed nothing, and the state looked unfinished next to its
 * light-mode twin. The dark fill is pulled back to /40 so it separates from
 * `EmptyMedia`'s `bg-muted` chip rather than merging with it.
 */
function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-lg border-dashed bg-muted/70 p-6 text-center text-balance dark:bg-muted/30",
        className,
      )}
      {...props}
    />
  );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex max-w-sm flex-col items-center gap-1", className)}
      {...props}
    />
  );
}

const emptyMediaVariants = cva(
  "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "text-body font-medium ",
        className,
      )}
      {...props}
    />
  );
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "text-body text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-2 text-body text-balance",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The four states every list and form has (`docs/design.md` §2.5), as copy
 * that is written once. `none-yet` takes the create action; `no-matches`
 * takes the clear action; `error` takes retry; `not-found` takes nothing. The
 * "No X match these filters" block had been copy-pasted into two browsers
 * before this existed, which is the whole reason it exists.
 */
const PRESETS = {
  "none-yet": { Icon: Inbox, title: (noun: string) => `No ${noun}s yet` },
  "no-matches": { Icon: SearchX, title: (noun: string) => `No ${noun}s match these filters` },
  error: { Icon: CircleAlert, title: () => "Something went wrong" },
  "not-found": { Icon: MapPinOff, title: () => "There is nothing here" },
} as const;

function EmptyState({
  preset,
  noun = "record",
  description,
  action,
  className,
}: {
  preset: keyof typeof PRESETS;
  /** Singular; the title pluralises it. */
  noun?: string;
  description?: React.ReactNode;
  /** The one thing to do about it: create, clear, retry. */
  action?: React.ReactNode;
  className?: string;
}) {
  const { Icon, title } = PRESETS[preset];
  return (
    // A faint lift, a larger icon, and the action set well apart from the
    // copy: 16px of gap plus `pt-8` is 48px, so the button reads as the next
    // step rather than a fourth line of text (17 October 2026).
    <Empty className={cn("shadow-raised", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-10 [&_svg:not([class*='size-'])]:size-5">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title(noun)}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {action ? <EmptyContent className="pt-8">{action}</EmptyContent> : null}
    </Empty>
  );
}

export {
  Empty,
  EmptyState,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
};
