import Link from 'next/link';
import type { NavLink } from './nav';

/**
 * An index page for a nav section: the rows that used to sit inline under a
 * heading in the rail, as a grid of cards.
 *
 * It exists because the flattened rail gives a section one row rather than one
 * row per destination, so the destinations need somewhere to live. Which is
 * also why it holds no state and fetches nothing — everything here is already
 * known from `nav.ts`, and a section index that queried the database would be a
 * different kind of page wearing this one's name.
 */
export default function NavIndex({
  title,
  description,
  links,
}: {
  title: string;
  description?: string;
  links: NavLink[];
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <li key={link.href}>
              {/*
                The card *is* the link, rather than holding one: a target the
                size of a word inside a box the size of a card is the kind of
                thing that gets clicked at and missed. Card's own tokens
                (`bg-card`, the hairline ring) rather than the component, since
                it renders a div and cannot become an anchor.
              */}
              <Link
                href={link.href}
                className="flex flex-row items-center gap-3 rounded-sm bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-accent"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 truncate text-sm font-medium">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
