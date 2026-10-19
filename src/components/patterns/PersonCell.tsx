'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { accentFor, ACCENT_TINTS } from '@/lib/accent';
import { NIL, cn } from '@/lib/utils';

/**
 * A person from the studio, in a table cell, and a stack of them.
 *
 * **These name Qera's own people, not the client's**, which is the whole reason
 * they exist as their own component. The lead is whoever brought a client in;
 * the team is whoever works with them. Both are the *admin* profile's
 * `employees` looked at from the client side, and that crossing is the one thing
 * to get right when these stop being sample data: `lib/profile.ts` is the
 * documented seam between the halves, so a client-side table reading employees
 * goes through it rather than importing the admin store directly.
 *
 * **Initials, not photographs.** There is no avatar image anywhere on an
 * employee record and inventing an upload for one would be a file, a blob, a
 * private read route and a deletion rule (`CONTEXT.md` §5d on attachments) for
 * a decoration. Initials over a tinted disc distinguish four people in a column
 * perfectly well, which is all this has to do.
 *
 * The tint comes from the same accent hues as the industry badge and carries
 * the same non-meaning: it separates one person from the next and says nothing
 * else. It is keyed on the name so a person is the same colour in every row
 * they appear in, which is what makes a stack scannable at all.
 */

/** First letters of the first two words: 'Ria Pareek' → 'RP', 'Ria' → 'R'. */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** Disc sizes: 20px by default, 16px and 14px for a stack under a line of text. */
type DiscSize = 'default' | 'sm' | 'xs';

const DISC: Record<DiscSize, string> = { default: 'size-5', sm: 'size-4', xs: 'size-3.5' };

// The avatar's own `sm` text size is a group variant and outranks a plain
// class, so a smaller size has to be stated at that rank. At 14px the initials
// are a texture rather than something read: the names are in the tooltip and
// the accessible label, which is where a reader gets them.
const DISC_TEXT: Record<DiscSize, string | undefined> = {
  default: undefined,
  sm: 'group-data-[size=sm]/avatar:text-caption',
  xs: 'group-data-[size=sm]/avatar:text-caption',
};

function PersonAvatar({
  name,
  size = 'default',
  className,
}: {
  name: string;
  size?: DiscSize;
  className?: string;
}) {
  return (
    <Avatar size="sm" className={cn(DISC[size], className)}>
      <AvatarFallback
        className={cn(
          'text-caption font-medium',
          DISC_TEXT[size],
          ACCENT_TINTS[accentFor(name)],
        )}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** One person: their disc and their name. */
export function PersonCell({ name }: { name?: string }) {
  if (!name) return <span className="text-muted-foreground">{NIL}</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <PersonAvatar name={name} />
      <span className="truncate">{name}</span>
    </span>
  );
}

/**
 * Several people, overlapped.
 *
 * Overlapping rather than listing, because a column of four names is wider than
 * any column has to be and the question this one answers at a glance is "how
 * many, and is it the usual crowd" rather than "who exactly". The names are all
 * still there, in the tooltip and in the accessible label.
 *
 * **Three, then a count.** Four discs is where a stack stops reading as a group
 * and starts reading as a row of things to count, and the `+2` is both narrower
 * and more honest than a fourth disc that hides two people behind it.
 *
 * The ring is the row's own background, so each disc cuts a clean edge out of
 * the one behind it. `bg-background` rather than a fixed colour for the reason
 * the frozen cells use `bg-inherit`: this has to survive the hover and selected
 * tints, and a ring in the wrong grey is more visible than no ring at all.
 */
export function PeopleCell({
  names,
  size = 'default',
}: {
  names: string[];
  /** Smaller discs and a tighter overlap, for a stack under another line. */
  size?: DiscSize;
}) {
  if (names.length === 0) return <span className="text-muted-foreground">{NIL}</span>;

  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  const all = names.join(', ');

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className="inline-flex items-center"
            // The stack is one thing to a screen reader, and what it needs is
            // the list: three discs announced as three images of initials is
            // noise. `role="img"` plus a label is the same pattern the
            // onboarding ring already uses.
            role="img"
            aria-label={`Team: ${all}`}
          >
            {shown.map((name) => (
              <PersonAvatar
                key={name}
                name={name}
                size={size}
                // `-ml-1.5` on all but the first, via the sibling selector, so
                // the overlap is a property of the stack rather than something
                // each disc has to know its position to apply.
                className={cn(
                  'ring-2 ring-background',
                  size === 'default'
                    ? '[&:not(:first-child)]:-ml-1.5'
                    : '[&:not(:first-child)]:-ml-1',
                )}
              />
            ))}
            {rest > 0 ? (
              <span className="ml-1 text-caption text-muted-foreground tabular-nums">
                +{rest}
              </span>
            ) : null}
          </span>
        }
      />
      <TooltipContent>{all}</TooltipContent>
    </Tooltip>
  );
}
