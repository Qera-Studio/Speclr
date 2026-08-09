'use client';

import { Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface PartCardProps {
  title: string;
  /** One line of what it holds. A Part has none — it is named and no more. */
  subtitle?: string;
  /** Blanks this Part still has nothing in. Shown only when there are some. */
  unfilled?: number;
  /** Opens something elsewhere — a dialog, another stage. */
  onOpen?: () => void;
  onRemove?: () => void;
  /** Given instead of `onOpen`: the card unfolds in the rail rather than leaving it. */
  children?: React.ReactNode;
  /**
   * Unfolded on arrival. The services list is the whole feedback while services
   * are being chosen; by the preview stage it is a summary and stays shut.
   */
  defaultOpen?: boolean;
}

/**
 * One row per thing the contract holds, in the rail.
 *
 * A Part shows its name. Not "Part A-1", not "Schedule A · Setup" — the document
 * works those out from what is in it, they change as Parts are added and
 * removed, and nobody assembling a contract is choosing by letter. The document
 * is where they belong, and the document prints them.
 *
 * On the preview stage the same card summarises everything else: the client and
 * date, the standing terms, the clauses, the cover. Two of those hold little
 * enough to unfold in place (`children`); the rest open where they live. Both
 * show a pencil on hover, because a row that does something should look like it.
 *
 * The Agreement's card does nothing at all and keeps its subtitle — it is the
 * answer to "what is in this contract before I add anything", and the only
 * explanation of why it has no ✕.
 */
export default function PartCard({
  title,
  subtitle,
  unfilled = 0,
  onOpen,
  onRemove,
  children,
  defaultOpen = false,
}: PartCardProps) {
  const interactive = Boolean(onOpen || children);

  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="min-w-0 truncate text-sm font-medium">{title}</span>
        {subtitle ? (
          <span className="min-w-0 truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {unfilled > 0 ? (
        <Badge variant="outline" className="shrink-0">
          {unfilled} to fill
        </Badge>
      ) : null}
      {interactive ? (
        <Pencil
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/part:opacity-100 group-focus-visible/part:opacity-100"
        />
      ) : null}
    </>
  );

  /**
   * The hover group sits on the *row*, not on the card, because the cards nest:
   * the services fold out inside one. `group-hover/part:` compiles to a
   * descendant selector, so a group on the shell meant hovering the outer card
   * revealed the pencil on every card inside it. A row is never inside another
   * row, so each pencil now answers only its own hover.
   */
  const row =
    'group/part flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2.5 text-left';
  const focus = 'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';
  const shell = cn(
    'rounded-lg border',
    interactive ? 'bg-card' : 'border-dashed bg-muted/40',
  );

  // A card that unfolds never carries a ✕ — only Parts are removable, and a Part
  // opens its own dialog rather than expanding. So the two never have to nest.
  if (children) {
    return (
      <Collapsible className={shell} defaultOpen={defaultOpen}>
        <CollapsibleTrigger
          render={<button type="button" className={cn(row, 'w-full', focus)} />}
        >
          {body}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 border-t px-3 py-3">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className={cn(shell, 'flex items-center')}>
      {onOpen ? (
        <button type="button" onClick={onOpen} className={cn(row, focus)}>
          {body}
        </button>
      ) : (
        <span className={row}>{body}</span>
      )}

      {onRemove ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mr-2 shrink-0"
          onClick={onRemove}
        >
          <X />
          <span className="sr-only">Remove {title}</span>
        </Button>
      ) : null}
    </div>
  );
}
